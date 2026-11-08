import { z } from 'zod';
import { AppointmentSchema } from './appointment';

/**
 * 서버가 SSE 로 보내는 실시간 이벤트.
 * id 는 단조 증가하는 정수로, 재연결 시 Last-Event-ID 로 놓친 이벤트를 다시 받는 데 쓴다.
 */
export const clinicEventTypes = [
  'appointment.requested',
  'appointment.checked-in',
  'appointment.cancelled',
] as const;
export type ClinicEventType = (typeof clinicEventTypes)[number];

export const ClinicEventSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(clinicEventTypes),
  /** ISO 8601 */
  at: z.string(),
  patientId: z.string(),
  appointment: AppointmentSchema,
});

export type ClinicEvent = z.infer<typeof ClinicEventSchema>;

/** SSE 의 event: 필드 이름 */
export const CLINIC_EVENT_NAME = 'clinic';
