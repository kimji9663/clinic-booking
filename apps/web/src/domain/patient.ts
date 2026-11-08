import { z } from 'zod';
import { AppointmentSchema } from './appointment';

export const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  visitCount: z.number().int().nonnegative(),
  lastVisit: z.string().nullable(),
  nextAppointment: z.string().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

/** 커서 기반 페이지 응답. nextCursor 가 null 이면 마지막 페이지 */
export const PatientPageSchema = z.object({
  items: z.array(PatientSchema),
  nextCursor: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative(),
});

export type PatientPage = z.infer<typeof PatientPageSchema>;

export const PATIENT_PAGE_SIZE = 30;

export const PATIENT_MEMO_MAX = 500;

/** 환자 프로필: 집계 정보 + 메모 + 전체 예약 이력(최근순) */
export const PatientDetailSchema = PatientSchema.extend({
  memo: z.string(),
  appointments: z.array(AppointmentSchema),
});

export type PatientDetail = z.infer<typeof PatientDetailSchema>;

export const UpdatePatientMemoSchema = z.object({
  memo: z.string().trim().max(PATIENT_MEMO_MAX, `메모는 ${PATIENT_MEMO_MAX}자 이내로 입력하세요.`),
});

export type UpdatePatientMemoInput = z.infer<typeof UpdatePatientMemoSchema>;

/** 환자 id 는 연락처에서 만든다 (목업 데이터에는 별도 환자 테이블이 없음) */
export function patientIdOf(phone: string): string {
  return `p-${phone.replaceAll('-', '')}`;
}
