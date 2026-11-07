import EventBusyIcon from '@mui/icons-material/EventBusy';
import Button from '@mui/material/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: {
    title: '오늘 예약이 없습니다',
    description: '새 예약을 등록하면 이곳에 표시됩니다.',
  },
} satisfies Meta<typeof EmptyState>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    icon: <EventBusyIcon fontSize="inherit" />,
    action: <Button variant="contained">예약 등록</Button>,
  },
};
