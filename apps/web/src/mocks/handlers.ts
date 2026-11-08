import { HttpResponse, delay, http } from 'msw';
import { z } from 'zod';
import {
  CreateAppointmentSchema,
  appointmentStatuses,
  isAllowedTransition,
  type Appointment,
} from '../domain/appointment';
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

  http.get('/api/patients', async () => {
    await delay();
    return HttpResponse.json(db.patients());
  }),
];
