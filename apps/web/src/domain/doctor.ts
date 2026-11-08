import { z } from 'zod';

export const DoctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
});

export type Doctor = z.infer<typeof DoctorSchema>;
