import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  AppointmentSchema,
  type AppointmentStatus,
  type CreateAppointmentInput,
} from '../domain/appointment';
import { DoctorSchema } from '../domain/doctor';
import {
  PATIENT_PAGE_SIZE,
  PatientDetailSchema,
  PatientPageSchema,
  UpdatePatientMemoSchema,
  type PatientDetail,
} from '../domain/patient';
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
  patientDetail: (id: string) => ['patients', 'detail', id] as const,
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

export function usePatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patientDetail(id),
    queryFn: ({ signal }) => request(PatientDetailSchema, `/api/patients/${id}`, { signal }),
  });
}

/**
 * 메모 저장 — 낙관적 업데이트.
 * 서버 응답을 기다리지 않고 화면을 먼저 바꾸고, 실패하면 이전 값으로 되돌린다.
 */
export function useUpdatePatientMemo(id: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.patientDetail(id);
  return useMutation({
    mutationFn: (memo: string) =>
      request(UpdatePatientMemoSchema, `/api/patients/${id}/memo`, {
        method: 'PATCH',
        body: JSON.stringify({ memo }),
      }),
    onMutate: async (memo) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PatientDetail>(key);
      if (previous) queryClient.setQueryData<PatientDetail>(key, { ...previous, memo });
      return { previous };
    },
    onError: (_error, _memo, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
