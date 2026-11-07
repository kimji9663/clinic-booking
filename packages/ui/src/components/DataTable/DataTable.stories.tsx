import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge, type StatusConfig } from '../StatusBadge/StatusBadge';
import { DataTable, type Column } from './DataTable';

type Status = 'confirmed' | 'waiting' | 'cancelled';

interface Booking {
  id: string;
  time: string;
  patient: string;
  doctor: string;
  status: Status;
}

const statusConfig: StatusConfig<Status> = {
  confirmed: { label: '예약 확정', tone: 'info' },
  waiting: { label: '대기 중', tone: 'warning' },
  cancelled: { label: '취소', tone: 'danger' },
};

const columns: Column<Booking>[] = [
  { key: 'time', header: '시간', width: 88 },
  { key: 'patient', header: '환자' },
  { key: 'doctor', header: '담당의', hideOnMobile: true },
  {
    key: 'status',
    header: '상태',
    render: (status) => <StatusBadge status={status} config={statusConfig} />,
  },
];

const rows: Booking[] = [
  { id: '1', time: '09:00', patient: '김*준', doctor: '이서연', status: 'confirmed' },
  { id: '2', time: '09:30', patient: '박*아', doctor: '정도윤', status: 'waiting' },
  { id: '3', time: '10:00', patient: '최*우', doctor: '이서연', status: 'cancelled' },
];

const meta: Meta = {
  title: 'Data/DataTable',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <DataTable
      caption="오늘의 예약"
      showCaption
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
    />
  ),
};

export const Mobile: Story = {
  ...Default,
  globals: { viewport: { value: 'mobile1' } },
};

export const Empty: Story = {
  render: () => (
    <DataTable caption="오늘의 예약" columns={columns} rows={[]} getRowId={(r) => r.id} />
  ),
};
