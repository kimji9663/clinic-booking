import { DataTable, EmptyState, PageHeader } from '@clinic/ui';
import AddIcon from '@mui/icons-material/Add';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAppointments } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { DateNavigator } from '../components/DateNavigator';
import { QueryErrorState } from '../components/QueryErrorState';
import {
  appointmentStatusConfig,
  appointmentStatuses,
  type AppointmentStatus,
} from '../domain/appointment';
import { AppointmentFormDialog } from '../features/appointments/AppointmentFormDialog';
import { appointmentColumns as c } from '../features/appointments/columns';
import { formatDateLabel, today } from '../utils/date';

const columns = [c.time, c.patient, c.phone, c.visitType, c.doctor, c.status, c.actions];

function parseStatus(value: string | null): AppointmentStatus | undefined {
  return appointmentStatuses.find((s) => s === value);
}

/** 필터는 URL 쿼리에 저장해 새로고침·뒤로가기·링크 공유 시에도 유지된다 */
export function AppointmentsPage() {
  usePageTitle('예약 관리');
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') ?? today();
  const status = parseStatus(searchParams.get('status'));
  const [formOpen, setFormOpen] = useState(false);

  const updateFilter = (key: 'date' | 'status', value: string | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const { data = [], isPending, error, refetch } = useAppointments({ date, status });

  return (
    <Stack spacing={3}>
      <PageHeader
        title="예약 관리"
        description="날짜와 상태로 예약을 찾고 승인·접수·취소를 처리합니다."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            예약 등록
          </Button>
        }
      />

      <Stack
        role="search"
        aria-label="예약 검색"
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { md: 'center' } }}
      >
        <DateNavigator value={date} onChange={(d) => updateFilter('date', d)} />
        <TextField
          select
          size="small"
          label="상태"
          value={status ?? ''}
          onChange={(event) => updateFilter('status', event.target.value || undefined)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">전체</MenuItem>
          {appointmentStatuses.map((s) => (
            <MenuItem key={s} value={s}>
              {appointmentStatusConfig[s].label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          caption={`${formatDateLabel(date)} 예약 ${isPending ? '' : `${data.length}건`}`}
          showCaption
          loading={isPending}
          columns={columns}
          rows={data}
          getRowId={(a) => a.id}
          emptyState={
            <EmptyState
              icon={<EventBusyIcon fontSize="inherit" />}
              title="조건에 맞는 예약이 없습니다"
              description="다른 날짜나 상태를 선택해 보세요."
            />
          }
        />
      )}

      <AppointmentFormDialog
        open={formOpen}
        defaultDate={date < today() ? today() : date}
        onClose={() => setFormOpen(false)}
      />
    </Stack>
  );
}
