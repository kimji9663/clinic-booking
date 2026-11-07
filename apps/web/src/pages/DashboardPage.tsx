import { DataTable, PageHeader, StatCard, StatusBadge, type Column } from '@clinic/ui';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import {
  appointmentStatusConfig,
  visitTypeLabel,
  type Appointment,
  type AppointmentStatus,
} from '../domain/appointment';
import { maskName } from '../utils/maskName';

const columns: Column<Appointment>[] = [
  { key: 'time', header: '시간', width: 88 },
  { key: 'patientName', header: '환자', render: (name) => maskName(name) },
  { key: 'visitType', header: '구분', render: (type) => visitTypeLabel[type] },
  { key: 'doctor', header: '담당의', hideOnMobile: true },
  { key: 'memo', header: '메모', hideOnMobile: true, render: (memo) => memo ?? '-' },
  {
    key: 'status',
    header: '상태',
    render: (status) => <StatusBadge status={status} config={appointmentStatusConfig} />,
  },
];

function countBy(appointments: readonly Appointment[], ...statuses: AppointmentStatus[]): number {
  return appointments.filter((a) => statuses.includes(a.status)).length;
}

export interface DashboardPageProps {
  appointments: readonly Appointment[];
}

export function DashboardPage({ appointments }: DashboardPageProps) {
  const active = appointments.filter((a) => a.status !== 'cancelled');

  return (
    <Stack spacing={3}>
      <PageHeader
        title="오늘의 예약"
        description="접수 현황을 확인하고 대기 중인 예약을 승인하세요."
        actions={
          <Button variant="contained" startIcon={<AddIcon />}>
            예약 등록
          </Button>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="전체 예약" value={active.length} unit="건" tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="내원 접수"
            value={countBy(appointments, 'checked-in')}
            unit="명"
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="승인 대기"
            value={countBy(appointments, 'requested')}
            unit="건"
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="취소"
            value={countBy(appointments, 'cancelled')}
            unit="건"
            tone="danger"
          />
        </Grid>
      </Grid>

      <DataTable
        caption="오늘의 예약 목록"
        showCaption
        columns={columns}
        rows={appointments}
        getRowId={(a) => a.id}
      />
    </Stack>
  );
}
