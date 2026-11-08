import { EmptyState, PageHeader, StatusBadge } from '@clinic/ui';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { useAppointments, useDoctors } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { DateNavigator } from '../components/DateNavigator';
import { QueryErrorState } from '../components/QueryErrorState';
import { appointmentStatusConfig, timeSlots, visitTypeLabel } from '../domain/appointment';
import { formatDateLabel, today } from '../utils/date';
import { maskName } from '../utils/maskName';

export function SchedulePage() {
  usePageTitle('진료 일정');
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') ?? today();

  const doctors = useDoctors();
  const appointments = useAppointments({ date });
  const error = doctors.error ?? appointments.error;
  const loading = doctors.isPending || appointments.isPending;

  return (
    <Stack spacing={3}>
      <PageHeader title="진료 일정" description="담당의별 예약 현황과 빈 시간을 확인합니다." />
      <DateNavigator
        value={date}
        onChange={(d) => setSearchParams({ date: d }, { replace: true })}
      />

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void doctors.refetch();
            void appointments.refetch();
          }}
        />
      ) : (
        <Grid container spacing={2} aria-busy={loading || undefined}>
          {loading
            ? [0, 1].map((i) => (
                <Grid key={i} size={{ xs: 12, md: 6 }}>
                  <Skeleton variant="rounded" height={280} />
                </Grid>
              ))
            : doctors.data?.map((doctor) => {
                const booked = (appointments.data ?? []).filter(
                  (a) => a.doctorId === doctor.id && a.status !== 'cancelled',
                );
                const free = timeSlots.length - booked.length;
                const headingId = `doctor-${doctor.id}`;
                return (
                  <Grid key={doctor.id} size={{ xs: 12, md: 6 }}>
                    <Card component="section" aria-labelledby={headingId} sx={{ height: '100%' }}>
                      <CardHeader
                        title={`${doctor.name} ${doctor.title}`}
                        subheader={`${formatDateLabel(date)} · 예약 ${booked.length}건 · 빈 시간 ${free}개`}
                        slotProps={{ title: { component: 'h2', variant: 'h6', id: headingId } }}
                      />
                      <CardContent sx={{ pt: 0 }}>
                        {booked.length === 0 ? (
                          <EmptyState title="예약이 없습니다" />
                        ) : (
                          <List dense disablePadding>
                            {booked.map((a) => (
                              <ListItem
                                key={a.id}
                                divider
                                secondaryAction={
                                  <StatusBadge status={a.status} config={appointmentStatusConfig} />
                                }
                              >
                                <ListItemText
                                  primary={
                                    <>
                                      <Typography
                                        component="span"
                                        sx={{ fontWeight: 700, mr: 1.5 }}
                                      >
                                        {a.time}
                                      </Typography>
                                      {maskName(a.patientName)}
                                    </>
                                  }
                                  secondary={`${visitTypeLabel[a.visitType]}${a.memo ? ` · ${a.memo}` : ''}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
        </Grid>
      )}
    </Stack>
  );
}
