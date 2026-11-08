import { describe, expect, it, vi } from 'vitest';
import { connectEventStream, type EventStreamMessage } from '../api/eventStream';
import { ClinicEventSchema } from '../domain/clinicEvent';
import { today } from '../utils/date';
import { db } from './db';
import { connectedClientCount, emitClinicEvent } from './events';

describe('실시간 이벤트 목업 서버', () => {
  it('신규 예약 요청: 승인 대기 예약을 만들고 이벤트로 기록한다', () => {
    const before = db.list().length;
    const event = emitClinicEvent('appointment.requested');
    expect(event?.type).toBe('appointment.requested');
    expect(db.list()).toHaveLength(before + 1);
    expect(db.find(event?.appointment.id ?? '')?.status).toBe('requested');
  });

  it('내원 접수: 오늘 확정 예약 하나를 내원 접수로 바꾼다', () => {
    const event = emitClinicEvent('appointment.checked-in');
    expect(event?.type).toBe('appointment.checked-in');
    expect(event?.appointment.date).toBe(today());
    expect(db.find(event?.appointment.id ?? '')?.status).toBe('checked-in');
  });

  it('예약 취소: 예정된 예약 하나를 취소한다', () => {
    const event = emitClinicEvent('appointment.cancelled');
    expect(event?.type).toBe('appointment.cancelled');
    expect(db.find(event?.appointment.id ?? '')?.status).toBe('cancelled');
  });

  it('대상이 없으면 신규 예약 요청으로 대신한다', () => {
    // 오늘 확정 예약(시드 2건)을 모두 소진
    emitClinicEvent('appointment.checked-in');
    emitClinicEvent('appointment.checked-in');
    expect(emitClinicEvent('appointment.checked-in')?.type).toBe('appointment.requested');
  });

  it('재연결 시 Last-Event-ID 이후의 이벤트만 다시 보낸다', async () => {
    const first = emitClinicEvent('appointment.requested');
    const second = emitClinicEvent('appointment.cancelled');
    const received: EventStreamMessage[] = [];
    const controller = new AbortController();

    void connectEventStream('/api/events', {
      signal: controller.signal,
      lastEventId: String(first?.id),
      onMessage: (m) => received.push(m),
    });
    await vi.waitFor(() => expect(connectedClientCount()).toBe(1));
    await vi.waitFor(() => expect(received).toHaveLength(1));
    controller.abort();

    const replayed = ClinicEventSchema.parse(JSON.parse(received[0]?.data ?? ''));
    expect(replayed.id).toBe(second?.id);
  });
});
