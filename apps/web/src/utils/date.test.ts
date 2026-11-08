import { describe, expect, it } from 'vitest';
import { addDays, toISODate } from './date';

describe('date utils', () => {
  it('로컬 시간 기준으로 날짜를 만든다', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('월말·연말을 넘어 날짜를 더한다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
