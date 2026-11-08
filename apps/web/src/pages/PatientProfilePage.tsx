import { EmptyState, PageHeader, StatusBadge, Tabs, useToast, visuallyHidden } from '@clinic/ui';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditNoteIcon from '@mui/icons-material/EditNote';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client';
import { usePatient, useUpdatePatientMemo } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { QueryErrorState } from '../components/QueryErrorState';
import { appointmentStatusConfig, visitTypeLabel, type Appointment } from '../domain/appointment';
import { PATIENT_MEMO_MAX, type PatientDetail } from '../domain/patient';
import { AppointmentFormDialog } from '../features/appointments/AppointmentFormDialog';
import { formatDateLabel, today } from '../utils/date';
import { maskName, maskPhone } from '../utils/maskName';

const ACTIVE_STATUSES = new Set<Appointment['status']>(['requested', 'confirmed', 'checked-in']);

/** 예정(오늘 이후의 진행 중 예약, 가까운 순) / 지난 이력(최근 순)으로 나눈다 */
function splitHistory(appointments: readonly Appointment[], base: string) {
  const upcoming = appointments
    .filter((a) => a.date >= base && ACTIVE_STATUSES.has(a.status))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const upcomingIds = new Set(upcoming.map((a) => a.id));
  const past = appointments.filter((a) => !upcomingIds.has(a.id));
  return { upcoming, past };
}

function formatNext(next: string | null): string {
  if (!next) return '-';
  const [date = '', time = ''] = next.split(' ');
  return `${formatDateLabel(date)} ${time}`;
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Card component="section" aria-labelledby={headingId}>
      <CardHeader
        title={title}
        action={action}
        slotProps={{ title: { component: 'h2', variant: 'h6', id: headingId } }}
      />
      <CardContent sx={{ pt: 0 }}>{children}</CardContent>
    </Card>
  );
}

function ProfileInfo({ patient }: { patient: PatientDetail }) {
  const rows: [string, string][] = [
    ['연락처', maskPhone(patient.phone)],
    ['방문 횟수', `${patient.visitCount}회`],
    ['최근 방문', patient.lastVisit ? formatDateLabel(patient.lastVisit) : '-'],
    ['다음 예약', formatNext(patient.nextAppointment)],
  ];
  return (
    <SectionCard title="기본 정보">
      <Box
        component="dl"
        sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 1.5, m: 0 }}
      >
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="label" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}

function MemoEditor({ patient }: { patient: PatientDetail }) {
  const toast = useToast();
  const updateMemo = useUpdatePatientMemo(patient.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const tooLong = draft.length > PATIENT_MEMO_MAX;

  const startEdit = () => {
    setDraft(patient.memo);
    setEditing(true);
  };

  const save = () => {
    if (tooLong) return;
    // 낙관적 업데이트: 저장 결과를 기다리지 않고 바로 보기 모드로 돌아간다
    setEditing(false);
    updateMemo.mutate(draft.trim(), {
      onSuccess: () => toast('메모를 저장했습니다.'),
      onError: (error) => {
        // 화면은 이전 메모로 되돌아가고(onError 롤백), 작성하던 내용은 편집 창에 남겨 둔다
        setEditing(true);
        toast({ message: `메모를 저장하지 못했습니다. ${error.message}`, severity: 'error' });
      },
    });
  };

  return (
    <SectionCard
      title="메모"
      action={
        editing ? undefined : (
          <Button size="small" startIcon={<EditNoteIcon />} onClick={startEdit}>
            메모 수정
          </Button>
        )
      }
    >
      {editing ? (
        <Stack
          component="form"
          spacing={1.5}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <TextField
            label="메모"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            autoFocus
            error={tooLong}
            helperText={`${draft.length}/${PATIENT_MEMO_MAX}자${tooLong ? ' — 글자 수를 줄여 주세요.' : ''}`}
            placeholder="알레르기, 복용 약, 보호자 정보 등"
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditing(false)}>취소</Button>
            <Button type="submit" variant="contained" disabled={tooLong}>
              저장
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Typography
          color={patient.memo ? 'text.primary' : 'text.secondary'}
          sx={{ whiteSpace: 'pre-wrap' }}
        >
          {patient.memo || '등록된 메모가 없습니다.'}
        </Typography>
      )}
    </SectionCard>
  );
}

function HistoryList({ items, empty }: { items: readonly Appointment[]; empty: string }) {
  return (
    <>
      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          {empty}
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((a) => (
            <ListItem
              key={a.id}
              divider
              secondaryAction={<StatusBadge status={a.status} config={appointmentStatusConfig} />}
              sx={{ pr: 14 }}
            >
              <ListItemText
                primary={`${formatDateLabel(a.date)} ${a.time} · ${a.doctorName}`}
                secondary={`${visitTypeLabel[a.visitType]}${a.memo ? ` · ${a.memo}` : ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <Box aria-busy="true">
      <span style={visuallyHidden}>환자 정보 불러오는 중</span>
      <Grid container spacing={2} aria-hidden="true">
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={240} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={360} />
        </Grid>
      </Grid>
    </Box>
  );
}

export function PatientProfilePage() {
  const { patientId = '' } = useParams();
  const { data: patient, isPending, error, refetch } = usePatient(patientId);
  const [formOpen, setFormOpen] = useState(false);
  const maskedName = patient ? maskName(patient.name) : '';
  usePageTitle(patient ? `${maskedName} 님` : '환자 프로필');

  const backButton = (
    <Button href="/patients" startIcon={<ArrowBackIcon />}>
      환자 목록
    </Button>
  );

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Stack spacing={3}>
        <PageHeader title="환자를 찾을 수 없습니다" actions={backButton} />
        <Card>
          <EmptyState
            title="존재하지 않는 환자입니다"
            description="주소가 바뀌었거나 삭제된 환자일 수 있습니다."
          />
        </Card>
      </Stack>
    );
  }

  const history = patient ? splitHistory(patient.appointments, today()) : undefined;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={patient ? `${maskedName} 님` : '환자 프로필'}
        description="예약 이력과 메모를 확인합니다. 개인정보는 마스킹되어 표시됩니다."
        actions={
          <>
            {backButton}
            {/* 불러오는 동안 disabled 로 두면 활성화될 때 색 전환(250ms) 중 대비가 일시적으로 낮아지므로,
                환자 정보가 준비된 뒤에 표시한다 */}
            {patient && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
                예약 등록
              </Button>
            )}
          </>
        }
      />

      {error ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : isPending || !patient || !history ? (
        <ProfileSkeleton />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <ProfileInfo patient={patient} />
              <MemoEditor patient={patient} />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <SectionCard title="진료 이력">
              <Tabs
                label="진료 이력 구분"
                // 예정된 예약이 없으면 지난 이력부터 보여 준다
                defaultValue={history.upcoming.length > 0 ? 'upcoming' : 'past'}
                items={[
                  {
                    value: 'upcoming',
                    label: '예정된 예약',
                    count: history.upcoming.length,
                    content: (
                      <HistoryList items={history.upcoming} empty="예정된 예약이 없습니다." />
                    ),
                  },
                  {
                    value: 'past',
                    label: '지난 이력',
                    count: history.past.length,
                    content: (
                      <HistoryList items={history.past} empty="지난 진료 이력이 없습니다." />
                    ),
                  },
                ]}
              />
            </SectionCard>
          </Grid>
        </Grid>
      )}

      {patient && (
        <AppointmentFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          defaultPatient={{ patientName: patient.name, phone: patient.phone }}
        />
      )}
    </Stack>
  );
}
