/**
 * 실시간 알림(SSE) 목업 서버.
 * - GET /api/events (Accept: text/event-stream): 연결된 클라이언트에 이벤트를 밀어 준다.
 *   Last-Event-ID 헤더가 오면 그 이후 놓친 이벤트를 먼저 다시 보낸다.
 * - 클라이언트가 연결돼 있는 동안 일정 간격으로 "신규 예약 요청 / 내원 접수 / 예약 취소"를 만들어 낸다.
 * - POST /api/dev/events: 데모·E2E 용으로 이벤트를 즉시 발생시킨다.
 */
import { HttpResponse, http, sse } from 'msw';
import { z } from 'zod';
import { timeSlots, type Appointment } from '../domain/appointment';
import {
  CLINIC_EVENT_NAME,
  clinicEventTypes,
  type ClinicEvent,
  type ClinicEventType,
} from '../domain/clinicEvent';
import { patientIdOf } from '../domain/patient';
import { addDays, today } from '../utils/date';
import { db, doctors, nextId } from './db';

/** 연결마다 MSW 가 만들어 주는 client 중 우리가 쓰는 부분 */
interface StreamClient {
  send(
    payload: { id?: string; event: typeof CLINIC_EVENT_NAME; data: string } | { retry: number },
  ): void;
}

const clients = new Set<StreamClient>();
/** 클라이언트 재연결 대기 시간(ms). SSE 표준 retry 필드로 알려 준다. */
const RETRY_MS = 3000;

let simulation = { enabled: true, minMs: 20_000, maxMs: 40_000 };
let timer: ReturnType<typeof setTimeout> | undefined;

/** 시뮬레이션 간격 조정 (테스트에서는 꺼 두고 emitClinicEvent 로 직접 발생시킨다) */
export function configureEventSimulation(options: Partial<typeof simulation>) {
  simulation = { ...simulation, ...options };
  scheduleNext();
}

/** 현재 연결된 스트림 수 (테스트에서 연결 완료를 기다릴 때 사용) */
export function connectedClientCount(): number {
  return clients.size;
}

/** 연결·타이머를 모두 정리 (테스트 격리용) */
export function resetEventServer() {
  clients.clear();
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function scheduleNext() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!simulation.enabled || clients.size === 0) return;
  const wait = simulation.minMs + Math.random() * (simulation.maxMs - simulation.minMs);
  timer = setTimeout(() => {
    emitClinicEvent();
    scheduleNext();
  }, wait);
}

function sendTo(client: StreamClient, event: ClinicEvent) {
  try {
    client.send({ id: String(event.id), event: CLINIC_EVENT_NAME, data: JSON.stringify(event) });
  } catch {
    // 이미 닫힌 연결
    clients.delete(client);
  }
}

const pick = <T>(list: readonly T[]): T | undefined =>
  list[Math.floor(Math.random() * list.length)];

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** 온라인으로 새 예약 요청이 들어온 상황: 오늘(없으면 다음 날) 빈 시간에 승인 대기 예약을 만든다 */
function createRequest(): Appointment | undefined {
  const person = pick(db.people());
  if (!person) return undefined;
  const [name, phone] = person;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today(), offset);
    const after = offset === 0 ? nowTime() : '';
    for (const doctor of [...doctors].sort(() => Math.random() - 0.5)) {
      const taken = new Set(
        db
          .list()
          .filter((a) => a.date === date && a.doctorId === doctor.id && a.status !== 'cancelled')
          .map((a) => a.time),
      );
      const time = pick(timeSlots.filter((slot) => slot > after && !taken.has(slot)));
      if (!time) continue;
      const appointment: Appointment = {
        id: nextId(),
        date,
        time,
        patientName: name,
        phone,
        doctorId: doctor.id,
        doctorName: db.doctorName(doctor.id),
        visitType: 'return',
        status: 'requested',
        memo: '온라인 예약',
      };
      db.insert(appointment);
      return appointment;
    }
  }
  return undefined;
}

function changeStatus(
  candidates: (a: Appointment) => boolean,
  status: Appointment['status'],
): Appointment | undefined {
  const target = pick(db.list().filter(candidates));
  return target ? db.update(target.id, { status }) : undefined;
}

const generators: Record<ClinicEventType, () => Appointment | undefined> = {
  'appointment.requested': createRequest,
  // 키오스크·접수처에서 오늘 확정 예약 환자가 내원 접수
  'appointment.checked-in': () =>
    changeStatus((a) => a.date === today() && a.status === 'confirmed', 'checked-in'),
  // 환자가 앱에서 예정된 예약을 취소
  'appointment.cancelled': () =>
    changeStatus(
      (a) => a.date >= today() && (a.status === 'requested' || a.status === 'confirmed'),
      'cancelled',
    ),
};

function randomType(): ClinicEventType {
  const roll = Math.random();
  if (roll < 0.5) return 'appointment.requested';
  if (roll < 0.8) return 'appointment.checked-in';
  return 'appointment.cancelled';
}

/**
 * 이벤트를 발생시켜 DB 에 반영하고, 연결된 모든 클라이언트에 보낸다.
 * 해당 유형의 대상이 없으면(예: 오늘 확정 예약이 없음) 신규 예약 요청으로 대신한다.
 */
export function emitClinicEvent(type: ClinicEventType = randomType()): ClinicEvent | undefined {
  let resolvedType = type;
  let appointment = generators[type]();
  if (!appointment && type !== 'appointment.requested') {
    resolvedType = 'appointment.requested';
    appointment = generators[resolvedType]();
  }
  if (!appointment) return undefined;

  const event = db.recordEvent({
    type: resolvedType,
    at: new Date().toISOString(),
    patientId: patientIdOf(appointment.phone),
    appointment,
  });
  for (const client of clients) sendTo(client, event);
  return event;
}

const DevEventSchema = z.object({ type: z.enum(clinicEventTypes).optional() });

export const eventHandlers = [
  sse<{ clinic: string }>('/api/events', ({ client, request }) => {
    const streamClient = client as StreamClient;
    streamClient.send({ retry: RETRY_MS });

    // 재연결: 마지막으로 받은 이벤트 이후의 것을 먼저 보낸다
    const lastEventId = Number(request.headers.get('last-event-id'));
    if (Number.isInteger(lastEventId) && lastEventId > 0) {
      for (const event of db.eventsAfter(lastEventId)) sendTo(streamClient, event);
    }

    clients.add(streamClient);
    request.signal.addEventListener('abort', () => {
      clients.delete(streamClient);
      scheduleNext();
    });
    if (!timer) scheduleNext();
  }),

  http.post('/api/dev/events', async ({ request }) => {
    const parsed = DevEventSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return HttpResponse.json({ message: '잘못된 이벤트 유형입니다.' }, { status: 400 });
    const event = emitClinicEvent(parsed.data.type);
    if (!event)
      return HttpResponse.json({ message: '발생시킬 수 있는 이벤트가 없습니다.' }, { status: 409 });
    return HttpResponse.json(event, { status: 201 });
  }),
];
