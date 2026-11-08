import { DataTable, PageHeader, StatCard } from '@clinic/ui';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useAppointments } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { QueryErrorState } from '../components/QueryErrorState';
import type { Appointment, AppointmentStatus } from '../domain/appointment';
import { AppointmentFormDialog } from '../features/appointments/AppointmentFormDialog';
import { appointmentColumns as c } from '../features/appointments/columns';
import { formatDateLabel, today } from '../utils/date';

const columns = [c.time, c.patient, c.visitType, c.doctor, c.memo, c.status];

function countBy(appointments: readonly Appointment[], ...statuses: AppointmentStatus[]): number {
  return appointments.filter((a) => statuses.includes(a.status)).length;
}

export function DashboardPage() {
  usePageTitle('대시보드');
  const date = today();
  const [formOpen, setFormOpen] = useState(false);
  const { data: appointments = [], isPending, error, refetch } = useAppointments({ date });

  const stats = [
    {
      label: '전체 예약',
      value: countBy(appointments, 'requested', 'confirmed', 'checked-in', 'completed'),
      unit: '건',
      tone: 'info',
    },
    { label: '내원 접수', value: countBy(appointments, 'checked-in'), unit: '명', tone: 'success' },
    { label: '승인 대기', value: countBy(appointments, 'requested'), unit: '건', tone: 'warning' },
    { label: '취소', value: countBy(appointments, 'cancelled'), unit: '건', tone: 'danger' },
  ] as const;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="오늘의 예약"
        description={`${formatDateLabel(date)} 접수 현황입니다. 승인 대기 예약은 예약 관리에서 처리하세요.`}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            예약 등록
          </Button>
        }
      />

      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <StatCard {...stat} value={isPending ? '-' : stat.value} />
          </Grid>
        ))}
      </Grid>

      {error ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          caption="오늘의 예약 목록"
          showCaption
          loading={isPending}
          columns={columns}
          rows={appointments}
          getRowId={(a) => a.id}
        />
      )}

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button href={`/appointments?date=${date}`} endIcon={<ArrowForwardIcon />}>
          예약 관리로 이동
        </Button>
      </Stack>

      <AppointmentFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  );
}
