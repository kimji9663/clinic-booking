import Typography from '@mui/material/Typography';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'WAI-ARIA Tabs 패턴. 탭 묶음은 Tab 한 번으로 들어오고(roving tabindex), ←/→·Home/End 로 이동한다.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

const items = [
  {
    value: 'upcoming',
    label: '예정된 예약',
    count: 2,
    content: <Typography>11월 9일 (월) 10:00 · 이서연 — 예약 확정</Typography>,
  },
  {
    value: 'past',
    label: '지난 이력',
    count: 5,
    content: <Typography>10월 30일 (금) 14:00 · 정도윤 — 진료 완료</Typography>,
  },
  { value: 'memo', label: '메모', content: <Typography>페니실린 알레르기</Typography> },
];

/** 화살표로 이동하면 바로 선택 */
export const Automatic: Story = {
  args: { label: '진료 이력 구분', items },
};

/** 화살표는 포커스만 옮기고 Enter/Space 로 선택 — 탭 내용을 불러오는 비용이 클 때 */
export const Manual: Story = {
  args: { label: '진료 이력 구분', items, activation: 'manual' },
};
