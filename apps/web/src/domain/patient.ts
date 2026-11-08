import { z } from 'zod';

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
