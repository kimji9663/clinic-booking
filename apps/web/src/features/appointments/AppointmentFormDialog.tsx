import { FormDialog, useToast } from '@clinic/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useEffect, useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ApiError } from '../../api/client';
import { useAppointments, useCreateAppointment, useDoctors } from '../../api/clinic';
import { FormTextField } from '../../components/FormTextField';
import {
  CreateAppointmentSchema,
  timeSlots,
  visitTypeLabel,
  visitTypes,
  type CreateAppointmentInput,
} from '../../domain/appointment';
import { today } from '../../utils/date';
import { maskName } from '../../utils/maskName';
import { formatPhoneInput } from '../../utils/phone';

export interface AppointmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
}

function emptyForm(date: string): CreateAppointmentInput {
  return {
    patientName: '',
    phone: '',
    date,
    time: '',
    doctorId: '',
    visitType: 'first',
    memo: '',
  };
}

export function AppointmentFormDialog({
  open,
  onClose,
  defaultDate = today(),
}: AppointmentFormDialogProps) {
  const toast = useToast();
  const visitTypeLabelId = useId();
  const createAppointment = useCreateAppointment();
  const { data: doctors = [] } = useDoctors();

  const { control, handleSubmit, reset, setError } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: emptyForm(defaultDate),
  });

  // 열 때마다 빈 폼으로 초기화
  useEffect(() => {
    if (open) reset(emptyForm(defaultDate));
  }, [open, defaultDate, reset]);

  // 선택한 날짜·담당의의 이미 찬 시간은 선택할 수 없게 표시
  const [date, doctorId] = useWatch({ control, name: ['date', 'doctorId'] });
  const { data: sameDay = [] } = useAppointments({ date });
  const takenTimes = new Set(
    sameDay.filter((a) => a.doctorId === doctorId && a.status !== 'cancelled').map((a) => a.time),
  );

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createAppointment.mutateAsync(input);
      toast(`${maskName(input.patientName)} 님의 예약이 등록되었습니다.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('time', { message: error.message }, { shouldFocus: true });
        return;
      }
      toast({
        message: error instanceof Error ? error.message : '예약을 등록하지 못했습니다.',
        severity: 'error',
      });
    }
  });

  return (
    <FormDialog
      open={open}
      title="예약 등록"
      submitLabel="등록"
      submitting={createAppointment.isPending}
      onSubmit={onSubmit}
      onClose={onClose}
    >
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            control={control}
            name="patientName"
            label="환자 이름"
            required
            fullWidth
            autoComplete="off"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            control={control}
            name="phone"
            label="연락처"
            required
            fullWidth
            placeholder="010-1234-5678"
            transform={formatPhoneInput}
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            control={control}
            name="date"
            label="진료일"
            type="date"
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today() } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField control={control} name="doctorId" label="담당의" select required fullWidth>
            {doctors.map((doctor) => (
              <MenuItem key={doctor.id} value={doctor.id}>
                {doctor.name} {doctor.title}
              </MenuItem>
            ))}
          </FormTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            control={control}
            name="time"
            label="시간"
            select
            required
            fullWidth
            helperText={
              doctorId ? undefined : '담당의를 먼저 선택하면 빈 시간을 확인할 수 있습니다.'
            }
          >
            {timeSlots.map((slot) => {
              const taken = takenTimes.has(slot);
              return (
                <MenuItem key={slot} value={slot} disabled={taken}>
                  {slot}
                  {taken ? ' (예약됨)' : ''}
                </MenuItem>
              );
            })}
          </FormTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" id={visitTypeLabelId}>
              진료 구분
            </FormLabel>
            <Controller
              control={control}
              name="visitType"
              render={({ field }) => (
                <RadioGroup row aria-labelledby={visitTypeLabelId} {...field}>
                  {visitTypes.map((type) => (
                    <FormControlLabel
                      key={type}
                      value={type}
                      control={<Radio />}
                      label={visitTypeLabel[type]}
                    />
                  ))}
                </RadioGroup>
              )}
            />
          </FormControl>
        </Grid>
        <Grid size={12}>
          <FormTextField
            control={control}
            name="memo"
            label="메모"
            fullWidth
            multiline
            minRows={2}
            placeholder="보호자 동반, 검사 결과 상담 등"
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
}
