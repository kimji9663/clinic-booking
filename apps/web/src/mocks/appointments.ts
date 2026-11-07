import { z } from 'zod';
import { AppointmentSchema, type Appointment } from '../domain/appointment';

/** 실제 API 대신 쓰는 목업 응답. 다음 단계에서 MSW 핸들러로 옮길 예정. */
const rawResponse: unknown = [
  {
    id: 'a-001',
    time: '09:00',
    patientName: '김민준',
    doctor: '이서연',
    visitType: 'return',
    status: 'completed',
  },
  {
    id: 'a-002',
    time: '09:30',
    patientName: '박서아',
    doctor: '정도윤',
    visitType: 'first',
    status: 'checked-in',
  },
  {
    id: 'a-003',
    time: '10:00',
    patientName: '최지우',
    doctor: '이서연',
    visitType: 'return',
    status: 'checked-in',
  },
  {
    id: 'a-004',
    time: '10:30',
    patientName: '이하준',
    doctor: '정도윤',
    visitType: 'first',
    status: 'confirmed',
    memo: '보호자 동반',
  },
  {
    id: 'a-005',
    time: '11:00',
    patientName: '정유나',
    doctor: '이서연',
    visitType: 'return',
    status: 'cancelled',
  },
  {
    id: 'a-006',
    time: '11:30',
    patientName: '강도현',
    doctor: '정도윤',
    visitType: 'return',
    status: 'confirmed',
  },
  {
    id: 'a-007',
    time: '14:00',
    patientName: '윤서윤',
    doctor: '이서연',
    visitType: 'first',
    status: 'requested',
  },
  {
    id: 'a-008',
    time: '14:30',
    patientName: '장시우',
    doctor: '정도윤',
    visitType: 'return',
    status: 'requested',
  },
];

export const todayAppointments: Appointment[] = z.array(AppointmentSchema).parse(rawResponse);
