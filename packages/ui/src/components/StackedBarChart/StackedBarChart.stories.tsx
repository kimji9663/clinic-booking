import type { Meta, StoryObj } from '@storybook/react-vite';
import { StackedBarChart, type ChartDatum, type ChartSeries } from './StackedBarChart';

type Key = 'first' | 'return';

const series: ChartSeries<Key>[] = [
  { key: 'first', label: '초진', color: 'secondary' },
  { key: 'return', label: '재진', color: 'primary' },
];

/** 2026-08-25 부터 7일 단위 12주 (값은 고정 예시) */
const counts: [number, number][] = [
  [4, 18],
  [6, 21],
  [3, 17],
  [5, 24],
  [7, 22],
  [2, 19],
  [5, 26],
  [4, 23],
  [6, 20],
  [3, 25],
  [5, 22],
  [8, 14],
];
const data: ChartDatum<Key>[] = counts.map(([first, ret], i) => {
  const start = new Date(2026, 7, 25 + i * 7);
  const end = new Date(2026, 7, 31 + i * 7);
  const short = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const long = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return {
    id: `w${i}`,
    label: short(start),
    fullLabel: `${long(start)} – ${long(end)}`,
    values: { first, return: ret },
  };
});

const meta = {
  title: 'Data/StackedBarChart',
  component: StackedBarChart<Key>,
  args: {
    title: '주간 예약 추이',
    description: '최근 12주 · 취소 제외',
    series,
    data,
    unit: '건',
  },
  parameters: {
    docs: {
      description: {
        component:
          'D3(d3-scale·d3-shape)로 계산하고 React 로 그리는 누적 막대 차트. 색은 테마 팔레트 키로만 받아 고객사·다크 모드를 따른다. 포커스 후 ←/→ 로 값 확인, 스크린리더에는 같은 데이터를 표로 제공.',
      },
    },
  },
} satisfies Meta<typeof StackedBarChart<Key>>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
