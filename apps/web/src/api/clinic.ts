import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  AppointmentSchema,
  type AppointmentStatus,
  type CreateAppointmentInput,
} from '../domain/appointment';
import { DoctorSchema } from '../domain/doctor';
import { PATIENT_PAGE_SIZE, PatientPageSchema } from '../domain/patient';
import { request } from './client';

export interface AppointmentFilters {
  date?: string;
  status?: AppointmentStatus;
}

export const queryKeys = {
  appointments: ['appointments'] as const,
  appointmentList: (filters: AppointmentFilters) => ['appointments', filters] as const,
  doctors: ['doctors'] as const,
  patients: ['patients'] as const,
  patientPages: (pageSize: number) => ['patients', 'pages', pageSize] as const,
};

function toSearch(filters: AppointmentFilters): string {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useAppointments(filters: AppointmentFilters) {
  return useQuery({
    queryKey: queryKeys.appointmentList(filters),
    queryFn: () => request(z.array(AppointmentSchema), `/api/appointments${toSearch(filters)}`),
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: queryKeys.doctors,
    queryFn: () => request(z.array(DoctorSchema), '/api/doctors'),
    staleTime: Infinity,
  });
}

/**
 * 환자 목록 무한 스크롤. 페이지를 이어 붙인 rows 와 서버가 알려준 전체 수(total)를 함께 돌려준다.
 */
export function usePatientPages(pageSize: number = PATIENT_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: queryKeys.patientPages(pageSize),
    queryFn: ({ pageParam, signal }) =>
      request(PatientPageSchema, `/api/patients?cursor=${pageParam}&limit=${pageSize}`, {
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      rows: data.pages.flatMap((page) => page.items),
      total: data.pages.at(-1)?.total ?? 0,
    }),
  });
}

/** 예약이 바뀌면 예약 목록과 환자 통계를 모두 갱신 */
function useInvalidateClinicData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.patients }),
    ]);
}

export function useCreateAppointment() {
  const invalidate = useInvalidateClinicData();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      request(AppointmentSchema, '/api/appointments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateAppointmentStatus() {
  const invalidate = useInvalidateClinicData();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      request(AppointmentSchema, `/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  });
}
