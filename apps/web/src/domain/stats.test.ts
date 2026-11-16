import { describe, expect, it } from 'vitest';
import type { Appointment, AppointmentStatus, VisitType } from './appointment';
import { weeklyVisits } from './stats';

let seq = 0;
function appt(date: string, visitType: VisitType, status: AppointmentStatus = 'completed') {
  seq += 1;
  return {
    id: `a-${seq}`,
    date,
    time: '09:00',
    patientName: '김민준',
    phone: '010-2381-4410',
    doctorId: 'd1',
    doctorName: '이서연',
    visitType,
    status,
  } satisfies Appointment;
}

describe('weeklyVisits', () => {
  it('기준일로 끝나는 7일 구간 weeks 개를 오래된 순으로 만든다', () => {
    const weeks = weeklyVisits([], '2026-11-16', 3);
    expect(weeks.map((w) => [w.weekStart, w.weekEnd])).toEqual([
      ['2026-10-27', '2026-11-02'],
      ['2026-11-03', '2026-11-09'],
      ['2026-11-10', '2026-11-16'],
    ]);
  });

  it('구간 경계(시작·끝 날짜 포함)와 초진·재진을 나눠 센다', () => {
    const weeks = weeklyVisits(
      [
        appt('2026-11-03', 'first'), // 둘째 주 첫날
        appt('2026-11-09', 'return'), // 둘째 주 마지막 날
        appt('2026-11-10', 'return'), // 셋째 주 첫날
        appt('2026-11-16', 'return', 'requested'), // 기준일 당일, 승인 대기도 포함
      ],
      '2026-11-16',
      3,
    );
    expect(weeks.map((w) => [w.first, w.return])).toEqual([
      [0, 0],
      [1, 1],
      [0, 2],
    ]);
  });

  it('취소, 기준일 이후, 기간 이전 예약은 세지 않는다', () => {
    const weeks = weeklyVisits(
      [
        appt('2026-11-12', 'first', 'cancelled'),
        appt('2026-11-17', 'return', 'confirmed'),
        appt('2026-10-26', 'return'),
      ],
      '2026-11-16',
      3,
    );
    expect(weeks.every((w) => w.first === 0 && w.return === 0)).toBe(true);
  });

  it('월말을 넘는 구간도 날짜 순서대로 이어진다', () => {
    const weeks = weeklyVisits([], '2026-03-03', 2);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-02-18', '2026-02-25']);
  });
});
