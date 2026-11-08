import { ConfirmDialog, useToast } from '@clinic/ui';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useUpdateAppointmentStatus } from '../../api/clinic';
import {
  appointmentStatusConfig,
  canCancel,
  nextStep,
  type Appointment,
  type AppointmentStatus,
} from '../../domain/appointment';
import { maskName } from '../../utils/maskName';

/**
 * 행마다 반복되는 버튼은 보이는 글자가 같아도 스크린리더에서 구분되도록
 * "시간 + 환자 + 작업" 을 접근 가능한 이름으로 준다 (보이는 글자를 포함해 WCAG 2.5.3 충족).
 */
export function AppointmentActions({ appointment }: { appointment: Appointment }) {
  const toast = useToast();
  const updateStatus = useUpdateAppointmentStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const who = `${appointment.time} ${maskName(appointment.patientName)}`;
  const step = nextStep[appointment.status];

  const change = async (status: AppointmentStatus) => {
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status });
      toast(`${who} 예약이 '${appointmentStatusConfig[status].label}' 상태가 되었습니다.`);
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : '상태를 변경하지 못했습니다.',
        severity: 'error',
      });
    }
  };

  if (!step && !canCancel(appointment.status)) return <span aria-hidden="true">-</span>;

  return (
    <Stack direction="row" spacing={1}>
      {step && (
        <Button
          size="small"
          variant="soft"
          aria-label={`${who} ${step.label}`}
          loading={updateStatus.isPending && updateStatus.variables?.status === step.to}
          disabled={updateStatus.isPending}
          onClick={() => change(step.to)}
        >
          {step.label}
        </Button>
      )}
      {canCancel(appointment.status) && (
        <>
          <Button
            size="small"
            color="error"
            aria-label={`${who} 예약 취소`}
            disabled={updateStatus.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            취소
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            tone="danger"
            title="예약을 취소할까요?"
            description={`${appointment.date} ${who} 님의 예약을 취소합니다. 취소한 예약은 되돌릴 수 없습니다.`}
            confirmLabel="예약 취소"
            loading={updateStatus.isPending}
            onClose={() => setConfirmOpen(false)}
            onConfirm={async () => {
              await change('cancelled');
              setConfirmOpen(false);
            }}
          />
        </>
      )}
    </Stack>
  );
}
