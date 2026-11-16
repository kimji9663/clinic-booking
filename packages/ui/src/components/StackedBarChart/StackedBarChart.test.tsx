import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { StackedBarChart, type ChartDatum, type ChartSeries } from './StackedBarChart';

type Key = 'first' | 'return';
const series: ChartSeries<Key>[] = [
  { key: 'first', label: '초진', color: 'secondary' },
  { key: 'return', label: '재진', color: 'primary' },
];
const data: ChartDatum<Key>[] = [
  { id: 'w1', label: '11/3', fullLabel: '11월 3일 – 11월 9일', values: { first: 2, return: 8 } },
  { id: 'w2', label: '11/10', fullLabel: '11월 10일 – 11월 16일', values: { first: 0, return: 5 } },
  { id: 'w3', label: '11/17', fullLabel: '11월 17일 – 11월 23일', values: { first: 3, return: 4 } },
];

function renderChart() {
  const user = userEvent.setup();
  const view = renderWithTheme(
    <StackedBarChart title="주간 예약 추이" series={series} data={data} unit="건" />,
  );
  return { user, ...view };
}

describe('StackedBarChart', () => {
  it('같은 데이터를 스크린리더용 표로 제공한다 (SVG 는 숨김)', () => {
    const { container } = renderChart();

    const table = screen.getByRole('table', { name: '주간 예약 추이' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4); // 머리글 + 3주
    expect(within(rows[1] as HTMLElement).getByRole('rowheader')).toHaveTextContent(
      '11월 3일 – 11월 9일',
    );
    expect(rows[1]).toHaveTextContent('2건8건10건');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('값이 0 인 구간은 막대를 그리지 않는다', () => {
    const { container } = renderChart();
    // 범례 외 막대: 초진 2개(0 제외) + 재진 3개
    const bars = container.querySelectorAll('svg > g > g:not([transform]) > rect');
    expect(bars).toHaveLength(5);
  });

  it('키보드로 막대를 옮기며 값을 읽어 준다', async () => {
    const { user } = renderChart();

    await user.tab();
    const chart = screen.getByRole('group', { name: '주간 예약 추이' });
    expect(chart).toHaveFocus();
    // 포커스가 들어오면 가장 최근 구간부터
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('11월 17일 – 11월 23일: 초진 3건, 재진 4건, 합계 7건');

    await user.keyboard('{ArrowLeft}');
    expect(status).toHaveTextContent('11월 10일 – 11월 16일: 초진 0건, 재진 5건, 합계 5건');

    await user.keyboard('{Home}');
    expect(status).toHaveTextContent('11월 3일 – 11월 9일');
    await user.keyboard('{ArrowLeft}'); // 처음에서 더 가지 않음
    expect(status).toHaveTextContent('11월 3일 – 11월 9일');

    await user.keyboard('{End}');
    expect(status).toHaveTextContent('11월 17일 – 11월 23일');
  });

  it('범례에 계열 이름을 보여준다', () => {
    renderChart();
    const legend = screen.getByRole('list');
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['초진', '재진']);
  });

  it('로딩 중에는 스켈레톤, 데이터가 없으면 안내 문구', () => {
    const { unmount } = renderWithTheme(
      <StackedBarChart title="주간 예약 추이" series={series} data={[]} loading />,
    );
    expect(screen.getByText('주간 예약 추이 불러오는 중')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '주간 예약 추이' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    unmount();

    renderWithTheme(<StackedBarChart title="주간 예약 추이" series={series} data={[]} />);
    expect(screen.getByText('표시할 데이터가 없습니다.')).toBeInTheDocument();
  });
});
