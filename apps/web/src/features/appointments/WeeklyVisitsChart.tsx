import { StackedBarChart, type ChartDatum, type ChartSeries } from '@clinic/ui/charts';
import { useMemo } from 'react';
import { useWeeklyVisits } from '../../api/clinic';
import { QueryErrorState } from '../../components/QueryErrorState';
import type { VisitType } from '../../domain/appointment';
import { WEEKLY_STATS_WEEKS, type WeeklyVisit } from '../../domain/stats';

const series: readonly ChartSeries<VisitType>[] = [
  { key: 'first', label: '초진', color: 'secondary' },
  { key: 'return', label: '재진', color: 'primary' },
];

/** 2026-11-10 → 11/10, 11월 10일 */
function parts(isoDate: string): { short: string; long: string } {
  const [, m, d] = isoDate.split('-').map(Number);
  return { short: `${m}/${d}`, long: `${m}월 ${d}일` };
}

function toDatum(week: WeeklyVisit): ChartDatum<VisitType> {
  const start = parts(week.weekStart);
  return {
    id: week.weekStart,
    label: start.short,
    fullLabel: `${start.long} – ${parts(week.weekEnd).long}`,
    values: { first: week.first, return: week.return },
  };
}

/** 대시보드: 최근 12주 예약 건수(초진·재진 누적, 취소 제외) */
export function WeeklyVisitsChart() {
  const { data: weeks, isPending, error, refetch } = useWeeklyVisits();
  const data = useMemo(() => (weeks ?? []).map(toDatum), [weeks]);

  if (error) return <QueryErrorState error={error} onRetry={() => refetch()} />;

  return (
    <StackedBarChart
      title="주간 예약 추이"
      description={`최근 ${WEEKLY_STATS_WEEKS}주 · 오늘까지 7일 단위 · 취소 제외`}
      series={series}
      data={data}
      unit="건"
      loading={isPending}
    />
  );
}
