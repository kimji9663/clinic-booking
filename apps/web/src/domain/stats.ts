import { z } from 'zod';
import { addDays } from '../utils/date';
import type { Appointment } from './appointment';

/** 주간 예약 통계 한 주 (weekStart ~ weekEnd, 양 끝 포함) */
export const WeeklyVisitSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  first: z.number().int().nonnegative(),
  return: z.number().int().nonnegative(),
});

export type WeeklyVisit = z.infer<typeof WeeklyVisitSchema>;

export const WeeklyVisitsSchema = z.array(WeeklyVisitSchema);

export const WEEKLY_STATS_WEEKS = 12;

/**
 * 기준일(오늘)로 끝나는 7일 단위 구간 weeks 개에 예약을 초진·재진으로 나눠 센다.
 * - 취소된 예약과 기준일 이후 예약은 제외한다.
 * - 달력 주(월~일)가 아니라 "오늘까지 7일"로 끊어, 마지막 구간도 항상 7일을 채운다.
 */
export function weeklyVisits(
  appointments: readonly Appointment[],
  baseDate: string,
  weeks: number = WEEKLY_STATS_WEEKS,
): WeeklyVisit[] {
  const buckets: WeeklyVisit[] = Array.from({ length: weeks }, (_, i) => {
    const weekEnd = addDays(baseDate, -7 * (weeks - 1 - i));
    return { weekStart: addDays(weekEnd, -6), weekEnd, first: 0, return: 0 };
  });
  const firstStart = buckets[0]?.weekStart ?? baseDate;

  for (const a of appointments) {
    if (a.status === 'cancelled' || a.date < firstStart || a.date > baseDate) continue;
    // ISO 날짜 문자열은 사전 순서가 곧 날짜 순서
    const bucket = buckets.find((b) => a.date >= b.weekStart && a.date <= b.weekEnd);
    if (bucket) bucket[a.visitType] += 1;
  }
  return buckets;
}
