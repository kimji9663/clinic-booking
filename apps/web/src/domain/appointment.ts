import type { StatusConfig } from '@clinic/ui';
import { z } from 'zod';

export const appointmentStatuses = [
  'requested',
  'confirmed',
  'checked-in',
  'completed',
  'cancelled',
] as const;

export const visitTypes = ['first', 'return'] as const;

/** API 응답 스키마. 타입은 스키마에서 추론해 런타임 검증과 컴파일 타입을 하나로 유지한다. */
export const AppointmentSchema = z.object({
  id: z.string(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm 형식이어야 합니다'),
  patientName: z.string().min(1),
  doctor: z.string().min(1),
  visitType: z.enum(visitTypes),
  status: z.enum(appointmentStatuses),
  memo: z.string().optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;
export type AppointmentStatus = Appointment['status'];
export type VisitType = Appointment['visitType'];

export const appointmentStatusConfig: StatusConfig<AppointmentStatus> = {
  requested: { label: '승인 대기', tone: 'warning' },
  confirmed: { label: '예약 확정', tone: 'info' },
  'checked-in': { label: '내원 접수', tone: 'success' },
  completed: { label: '진료 완료', tone: 'neutral' },
  cancelled: { label: '취소', tone: 'danger' },
};

export const visitTypeLabel: Readonly<Record<VisitType, string>> = {
  first: '초진',
  return: '재진',
};
