/** 로컬 시간 기준 YYYY-MM-DD (toISOString 은 UTC 라 한국 시간 자정 전후로 날짜가 밀린다) */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return toISODate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
}

const formatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

/** 2026-11-08 → 11월 8일 (일) */
export function formatDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return formatter.format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}
