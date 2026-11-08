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
  timeSlots,
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

/** 화면·테스트에서 직접 참조하는 대표 환자 10명 (오늘 예약 시드에 사용) */
const featuredPeople: readonly (readonly [name: string, phone: string])[] = [
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
];

export const PATIENT_COUNT = 150;

/** 매번 같은 결과를 내는 의사 난수 (mulberry32). 새로고침·테스트마다 데이터가 달라지지 않게 한다. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(list: readonly T[]): T => list[int(0, list.length - 1)] as T;
  return { next, int, pick };
}

const SURNAMES = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
  '권',
  '황',
  '안',
  '송',
  '류',
  '홍',
];
const GIVEN_NAMES = [
  '서준',
  '하윤',
  '도윤',
  '서연',
  '시우',
  '지유',
  '주원',
  '하은',
  '지호',
  '수아',
  '예준',
  '지아',
  '건우',
  '서윤',
  '현우',
  '다은',
  '우진',
  '채원',
  '선우',
  '예린',
  '민재',
  '소율',
  '연우',
  '지민',
  '유준',
  '윤서',
  '정우',
  '가은',
  '승현',
  '나은',
];

function generatePeople(): (readonly [name: string, phone: string])[] {
  const random = createRandom(20261108);
  const phones = new Set(featuredPeople.map(([, phone]) => phone));
  const result = [...featuredPeople];
  while (result.length < PATIENT_COUNT) {
    const phone = `010-${random.int(2000, 9999)}-${String(random.int(0, 9999)).padStart(4, '0')}`;
    if (phones.has(phone)) continue;
    phones.add(phone);
    result.push([`${random.pick(SURNAMES)}${random.pick(GIVEN_NAMES)}`, phone]);
  }
  return result;
}

const people = generatePeople();

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

/** 저장 형식이나 시드가 바뀌면 version 을 올려 예전 데이터를 버린다 */
const DB_VERSION = 2;
const StoredDbSchema = z.object({
  version: z.literal(DB_VERSION),
  seedDate: z.string(),
  sequence: z.number().int().nonnegative(),
  appointments: z.array(AppointmentSchema),
});

function persist(): void {
  try {
    window.localStorage.setItem(
      DB_STORAGE_KEY,
      JSON.stringify({ version: DB_VERSION, seedDate, sequence, appointments }),
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

function createAppointment(
  date: string,
  time: string,
  person: number,
  doctorId: string,
  visitType: VisitType,
  status: AppointmentStatus,
  memo?: string,
): Appointment {
  const [name, phone] = people[person] ?? ['미상', '010-0000-0000'];
  return {
    id: nextId(),
    date,
    time,
    patientName: name,
    phone,
    doctorId,
    doctorName: doctorName(doctorId),
    visitType,
    status,
    ...(memo ? { memo } : {}),
  };
}

/**
 * 대표 환자 외 140명의 과거 진료 이력(-120 ~ -4일)과 일부 향후 예약(+4 ~ +30일).
 * 오늘 ±3일 시드와 날짜가 겹치지 않아 대시보드·예약 화면 수치는 그대로다.
 */
function generateHistory(baseDate: string): Appointment[] {
  const random = createRandom(42);
  const taken = new Set<string>();
  const list: Appointment[] = [];
  const book = (
    person: number,
    offset: number,
    status: AppointmentStatus,
    visitType: VisitType,
  ) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const date = addDays(baseDate, offset);
      const time = random.pick(timeSlots);
      const doctorId = random.pick(doctors).id;
      const key = `${date} ${time} ${doctorId}`;
      if (taken.has(key)) continue;
      taken.add(key);
      list.push(createAppointment(date, time, person, doctorId, visitType, status));
      return;
    }
  };

  for (let person = featuredPeople.length; person < people.length; person += 1) {
    const visits = random.int(1, 5);
    const offsets = Array.from({ length: visits }, () => -random.int(4, 120)).sort((a, b) => a - b);
    offsets.forEach((offset, i) => book(person, offset, 'completed', i === 0 ? 'first' : 'return'));
    if (random.next() < 0.2) book(person, random.int(4, 30), 'confirmed', 'return');
  }
  return list;
}

export function resetDb(baseDate: string = today()): void {
  sequence = 0;
  seedDate = baseDate;
  appointments = [
    ...seedRows.map(([offset, time, person, doctorId, visitType, status, memo]) =>
      createAppointment(addDays(baseDate, offset), time, person, doctorId, visitType, status, memo),
    ),
    ...generateHistory(baseDate),
  ];
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
      const list = byPhone.get(a.phone);
      if (list) list.push(a);
      else byPhone.set(a.phone, [a]);
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
