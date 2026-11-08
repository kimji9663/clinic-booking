import type { ToastSeverity } from '@clinic/ui';
import type { ClinicEvent, ClinicEventType } from '../../domain/clinicEvent';
import { formatDateLabel, today } from '../../utils/date';
import { maskName } from '../../utils/maskName';

const meta: Record<ClinicEventType, { title: string; severity: ToastSeverity }> = {
  'appointment.requested': { title: '새 예약 요청', severity: 'info' },
  'appointment.checked-in': { title: '내원 접수', severity: 'success' },
  'appointment.cancelled': { title: '예약 취소', severity: 'warning' },
};

/** 알림 목록·토스트에 쓰는 문장. 환자 이름은 항상 마스킹한다. */
export function describeEvent(event: ClinicEvent) {
  const { appointment } = event;
  const when =
    appointment.date === today()
      ? `오늘 ${appointment.time}`
      : `${formatDateLabel(appointment.date)} ${appointment.time}`;
  const { title, severity } = meta[event.type];
  return {
    title,
    severity,
    message: `${title} — ${when} ${maskName(appointment.patientName)} 님 (${appointment.doctorName})`,
  };
}

/** "방금 전", "3분 전", "2시간 전", 그 이상은 날짜 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return formatDateLabel(iso.slice(0, 10));
}
