/**
 * 목업 서버용 DB. 실제 백엔드가 없는 포트폴리오 데모를 위해 MSW 핸들러가 사용한다.
 * - 변경 사항은 localStorage 에 저장해 새로고침해도 유지된다.
 * - 예약 데이터는 "오늘" 기준 ±3일로 생성하고, 날짜가 바뀌면 새로 만들어
 *   언제 열어도 화면이 비어 있지 않게 한다.
 */
import { z } from 'zod';
import {
  AppointmentSchema,
  type Appointment,
  type AppointmentStatus,
  type VisitType,
} from '../domain/appointment';
import type { Doctor } from '../domain/doctor';
import type { Patient } from '../domain/patient';
import { addDays, today } from '../utils/date';

export const doctors: readonly Doctor[] = [
  { id: 'd1', name: '이서연', title: '대표원장' },
  { id: 'd2', name: '정도윤', title: '원장' },
];

const people = [
  ['김민준', '010-2381-4410'],
  ['박서아', '010-5520-1932'],
  ['최지우', '010-7712-0384'],
  ['이하준', '010-3348-9021'],
  ['정유나', '010-6604-2275'],
  ['강도현', '010-9135-6648'],
  ['윤서윤', '010-4471-3306'],
  ['장시우', '010-8826-5513'],
  ['한지안', '010-2259-7740'],
  ['오은우', '010-6093-1187'],
] as const;

type SeedRow = [
  dayOffset: number,
  time: string,
  person: number,
  doctorId: string,
  visitType: VisitType,
  status: AppointmentStatus,
  memo?: string,
];

const seedRows: readonly SeedRow[] = [
  [-3, '10:00', 0, 'd1', 'first', 'completed'],
  [-3, '15:00', 8, 'd2', 'first', 'completed'],
  [-2, '09:30', 2, 'd1', 'first', 'completed'],
  [-2, '11:00', 5, 'd2', 'first', 'cancelled'],
  [-1, '14:00', 9, 'd1', 'return', 'completed'],
  [-1, '16:30', 3, 'd2', 'first', 'completed'],
  [0, '09:00', 0, 'd1', 'return', 'completed'],
  [0, '09:30', 1, 'd2', 'first', 'checked-in'],
  [0, '10:00', 2, 'd1', 'return', 'checked-in'],
  [0, '10:30', 3, 'd2', 'return', 'confirmed', '보호자 동반'],
  [0, '11:00', 4, 'd1', 'return', 'cancelled'],
  [0, '11:30', 5, 'd2', 'return', 'confirmed'],
  [0, '14:00', 6, 'd1', 'first', 'requested'],
  [0, '14:30', 7, 'd2', 'return', 'requested'],
  [1, '10:00', 8, 'd1', 'return', 'confirmed'],
  [1, '15:30', 9, 'd2', 'return', 'requested'],
  [2, '09:00', 1, 'd2', 'return', 'confirmed', '검사 결과 상담'],
  [3, '11:30', 4, 'd1', 'return', 'requested'],
];

let appointments: Appointment[] = [];
let sequence = 0;
let seedDate = today();

export const DB_STORAGE_KEY = 'clinic-booking:mock-db';

/** 저장 형식이 바뀌면 version 을 올려 예전 데이터를 버린다 */
const StoredDbSchema = z.object({
  version: z.literal(1),
  seedDate: z.string(),
  sequence: z.number().int().nonnegative(),
  appointments: z.array(AppointmentSchema),
});

function persist(): void {
  try {
    window.localStorage.setItem(
      DB_STORAGE_KEY,
      JSON.stringify({ version: 1, seedDate, sequence, appointments }),
    );
  } catch {
    // 저장소를 쓸 수 없으면(시크릿 모드 용량 제한 등) 메모리에서만 동작
  }
}

function restore(baseDate: string): boolean {
  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return false;
    const parsed = StoredDbSchema.safeParse(JSON.parse(raw));
    // 형식이 다르거나(손상·구버전) 다른 날짜에 만든 데이터면 새로 시드
    if (!parsed.success || parsed.data.seedDate !== baseDate) return false;
    ({ sequence, seedDate, appointments } = parsed.data);
    return true;
  } catch {
    return false;
  }
}

function doctorName(doctorId: string): string {
  return doctors.find((d) => d.id === doctorId)?.name ?? '미지정';
}

export function nextId(): string {
  sequence += 1;
  return `a-${String(sequence).padStart(3, '0')}`;
}

export function resetDb(baseDate: string = today()): void {
  sequence = 0;
  seedDate = baseDate;
  appointments = seedRows.map(([offset, time, person, doctorId, visitType, status, memo]) => {
    const [name, phone] = people[person] ?? people[0];
    return {
      id: nextId(),
      date: addDays(baseDate, offset),
      time,
      patientName: name,
      phone,
      doctorId,
      doctorName: doctorName(doctorId),
      visitType,
      status,
      ...(memo ? { memo } : {}),
    };
  });
  persist();
}

/** 저장된 데이터가 있으면 복원하고, 없거나 쓸 수 없으면 시드 데이터로 시작 */
export function loadDb(baseDate: string = today()): void {
  if (!restore(baseDate)) resetDb(baseDate);
}

export const db = {
  list(): Appointment[] {
    return [...appointments].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
    );
  },
  find(id: string): Appointment | undefined {
    return appointments.find((a) => a.id === id);
  },
  insert(appointment: Appointment): void {
    appointments.push(appointment);
    persist();
  },
  update(id: string, patch: Partial<Appointment>): Appointment | undefined {
    const index = appointments.findIndex((a) => a.id === id);
    const current = appointments[index];
    if (!current) return undefined;
    const updated = { ...current, ...patch };
    appointments[index] = updated;
    persist();
    return updated;
  },
  doctorName,

  /** 연락처 기준으로 환자를 묶어 방문 통계를 만든다 */
  patients(baseDate: string = today()): Patient[] {
    const byPhone = new Map<string, Appointment[]>();
    for (const a of appointments) {
      byPhone.set(a.phone, [...(byPhone.get(a.phone) ?? []), a]);
    }
    return [...byPhone.entries()]
      .map(([phone, list]) => {
        const sorted = [...list].sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        );
        const visits = sorted.filter((a) => a.status === 'completed');
        const upcoming = sorted.find(
          (a) => a.date >= baseDate && (a.status === 'requested' || a.status === 'confirmed'),
        );
        return {
          id: `p-${phone.replaceAll('-', '')}`,
          name: sorted[0]?.patientName ?? '',
          phone,
          visitCount: visits.length,
          lastVisit: visits.at(-1)?.date ?? null,
          nextAppointment: upcoming ? `${upcoming.date} ${upcoming.time}` : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  },
};

loadDb();
