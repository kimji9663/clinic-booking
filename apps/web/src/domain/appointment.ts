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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^01[016789]-\d{3,4}-\d{4}$/;

/** API 응답 스키마. 타입은 스키마에서 추론해 런타임 검증과 컴파일 타입을 하나로 유지한다. */
export const AppointmentSchema = z.object({
  id: z.string(),
  date: z.string().regex(ISO_DATE),
  time: z.string().regex(TIME),
  patientName: z.string().min(1),
  phone: z.string().regex(PHONE),
  doctorId: z.string(),
  doctorName: z.string(),
  visitType: z.enum(visitTypes),
  status: z.enum(appointmentStatuses),
  memo: z.string().optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;
export type AppointmentStatus = Appointment['status'];
export type VisitType = Appointment['visitType'];

/** 예약 등록 폼 / POST 요청 스키마. 폼 검증과 목업 서버 검증에 같은 스키마를 쓴다. */
export const CreateAppointmentSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, '이름을 2자 이상 입력하세요.')
    .max(20, '이름은 20자 이하로 입력하세요.'),
  phone: z.string().trim().regex(PHONE, '010-1234-5678 형식으로 입력하세요.'),
  date: z.string().regex(ISO_DATE, '진료일을 선택하세요.'),
  time: z.string().regex(TIME, '시간을 선택하세요.'),
  doctorId: z.string().min(1, '담당의를 선택하세요.'),
  visitType: z.enum(visitTypes),
  memo: z.string().max(100, '메모는 100자 이하로 입력하세요.').optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

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

/** 상태별로 다음에 진행할 수 있는 작업. 취소는 별도 확인 절차를 거친다. */
export const nextStep: Readonly<
  Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string }>>
> = {
  requested: { to: 'confirmed', label: '승인' },
  confirmed: { to: 'checked-in', label: '내원 접수' },
  'checked-in': { to: 'completed', label: '진료 완료' },
};

export function canCancel(status: AppointmentStatus): boolean {
  return status === 'requested' || status === 'confirmed';
}

export function isAllowedTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return nextStep[from]?.to === to || (to === 'cancelled' && canCancel(from));
}

/** 예약 가능 시간 (점심 12:30~14:00 제외, 30분 단위) */
export const timeSlots: readonly string[] = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];
