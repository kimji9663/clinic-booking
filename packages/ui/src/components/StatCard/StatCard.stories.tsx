import Grid from '@mui/material/Grid';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from './StatCard';

const meta = {
  title: 'Data/StatCard',
  component: StatCard,
  args: {
    label: '오늘 예약',
    value: 24,
    unit: '건',
    tone: 'info',
    helperText: '어제보다 3건 증가',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warning', 'danger'] },
  },
} satisfies Meta<typeof StatCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dashboard: Story = {
  render: () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="오늘 예약" value={24} unit="건" tone="info" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="내원 접수" value={9} unit="명" tone="success" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="승인 대기" value={4} unit="건" tone="warning" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="취소" value={2} unit="건" tone="danger" />
      </Grid>
    </Grid>
  ),
};
