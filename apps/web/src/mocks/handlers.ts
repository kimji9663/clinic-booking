import { HttpResponse, delay, http } from 'msw';
import { z } from 'zod';
import {
  CreateAppointmentSchema,
  appointmentStatuses,
  isAllowedTransition,
  type Appointment,
} from '../domain/appointment';
import {
  PATIENT_PAGE_SIZE,
  UpdatePatientMemoSchema,
  type PatientDetail,
  type PatientPage,
} from '../domain/patient';
import { db, doctors, nextId } from './db';

const UpdateStatusSchema = z.object({ status: z.enum(appointmentStatuses) });

function error(message: string, status: number) {
  return HttpResponse.json({ message }, { status });
}

export const handlers = [
  http.get('/api/appointments', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');

    const list = db
      .list()
      .filter((a) => !date || a.date === date)
      .filter((a) => !status || a.status === status);
    return HttpResponse.json(list);
  }),

  http.post('/api/appointments', async ({ request }) => {
    await delay();
    const parsed = CreateAppointmentSchema.safeParse(await request.json());
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? '잘못된 요청입니다.', 400);

    const input = parsed.data;
    if (!doctors.some((d) => d.id === input.doctorId))
      return error('담당의를 찾을 수 없습니다.', 400);

    const taken = db
      .list()
      .some(
        (a) =>
          a.doctorId === input.doctorId &&
          a.date === input.date &&
          a.time === input.time &&
          a.status !== 'cancelled',
      );
    if (taken) return error('선택한 시간에 이미 예약이 있습니다.', 409);

    const memo = input.memo?.trim();
    const created: Appointment = {
      id: nextId(),
      date: input.date,
      time: input.time,
      patientName: input.patientName,
      phone: input.phone,
      doctorId: input.doctorId,
      doctorName: db.doctorName(input.doctorId),
      visitType: input.visitType,
      status: 'confirmed',
      ...(memo ? { memo } : {}),
    };
    db.insert(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch<{ id: string }>('/api/appointments/:id/status', async ({ params, request }) => {
    await delay();
    const current = db.find(params.id);
    if (!current) return error('예약을 찾을 수 없습니다.', 404);

    const parsed = UpdateStatusSchema.safeParse(await request.json());
    if (!parsed.success) return error('잘못된 상태 값입니다.', 400);
    if (!isAllowedTransition(current.status, parsed.data.status)) {
      return error('현재 상태에서는 변경할 수 없습니다.', 409);
    }

    return HttpResponse.json(db.update(current.id, { status: parsed.data.status }));
  }),

  http.get('/api/doctors', async () => {
    await delay();
    return HttpResponse.json(doctors);
  }),

  // 커서 기반 페이지네이션: ?cursor=0&limit=30 → { items, nextCursor, total }
  // 검색: ?q=김민 (이름 일부) 또는 ?q=4410 (연락처 숫자 3자리 이상)
  http.get('/api/patients', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const cursor = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? PATIENT_PAGE_SIZE);
    if (!Number.isInteger(cursor) || cursor < 0 || !Number.isInteger(limit) || limit < 1) {
      return error('잘못된 페이지 요청입니다.', 400);
    }

    const q = url.searchParams.get('q')?.trim() ?? '';
    const digits = q.replace(/\D/g, '');
    const all = db
      .patients()
      .filter(
        (p) =>
          !q ||
          p.name.includes(q) ||
          (digits.length >= 3 && p.phone.replaceAll('-', '').includes(digits)),
      );
    const items = all.slice(cursor, cursor + Math.min(limit, 100));
    const next = cursor + items.length;
    const page: PatientPage = {
      items,
      nextCursor: next < all.length ? next : null,
      total: all.length,
    };
    return HttpResponse.json(page);
  }),

  http.get<{ id: string }>('/api/patients/:id', async ({ params }) => {
    await delay();
    const patient = db.patient(params.id);
    if (!patient) return error('환자를 찾을 수 없습니다.', 404);
    const detail: PatientDetail = {
      ...patient,
      memo: db.memo(params.id),
      appointments: db.patientAppointments(params.id),
    };
    return HttpResponse.json(detail);
  }),

  http.patch<{ id: string }>('/api/patients/:id/memo', async ({ params, request }) => {
    await delay();
    if (!db.patient(params.id)) return error('환자를 찾을 수 없습니다.', 404);
    const parsed = UpdatePatientMemoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? '잘못된 메모입니다.', 400);
    }
    db.setMemo(params.id, parsed.data.memo);
    return HttpResponse.json({ memo: parsed.data.memo });
  }),
];
