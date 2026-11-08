import { StatusBadge, type Column } from '@clinic/ui';
import {
  appointmentStatusConfig,
  visitTypeLabel,
  type Appointment,
} from '../../domain/appointment';
import { maskName, maskPhone } from '../../utils/maskName';
import { AppointmentActions } from './AppointmentActions';

/** 예약 표의 공통 컬럼. 페이지마다 필요한 컬럼만 골라 쓴다. */
export const appointmentColumns = {
  time: { key: 'time', header: '시간', width: 80 },
  patient: { key: 'patientName', header: '환자', render: (name) => maskName(name) },
  phone: { key: 'phone', header: '연락처', hideOnMobile: true, render: (p) => maskPhone(p) },
  visitType: { key: 'visitType', header: '구분', render: (type) => visitTypeLabel[type] },
  doctor: { key: 'doctorName', header: '담당의', hideOnMobile: true },
  memo: { key: 'memo', header: '메모', hideOnMobile: true, render: (memo) => memo ?? '-' },
  status: {
    key: 'status',
    header: '상태',
    render: (status) => <StatusBadge status={status} config={appointmentStatusConfig} />,
  },
  actions: {
    key: 'id',
    header: '작업',
    render: (_, appointment) => <AppointmentActions appointment={appointment} />,
  },
} satisfies Record<string, Column<Appointment>>;
