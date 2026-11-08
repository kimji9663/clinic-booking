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
