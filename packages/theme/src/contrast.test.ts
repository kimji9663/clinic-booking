import { describe, expect, it } from 'vitest';
import {
  DARK_TEXT,
  LIGHT_TEXT,
  WCAG_AA,
  contrastRatio,
  ensureContrast,
  toAccessiblePair,
} from './contrast';

describe('contrastRatio', () => {
  it('반올림 없이 계산해 4.49 를 4.5 로 통과시키지 않는다 (E2E 에서 발견한 경계값)', () => {
    const ratio = contrastRatio('#B4536A', '#FBF7F4');
    expect(ratio).toBeGreaterThan(4.48);
    expect(ratio).toBeLessThan(WCAG_AA);
    expect(ensureContrast('#B4536A', '#FBF7F4').ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });
});

describe('ensureContrast', () => {
  it('대비가 부족한 색은 기준을 만족할 때까지 보정한다', () => {
    const skyBlue = '#3BA0F5';
    expect(contrastRatio(skyBlue, LIGHT_TEXT)).toBeLessThan(WCAG_AA);

    const result = ensureContrast(skyBlue, LIGHT_TEXT);

    expect(result.adjusted).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('이미 기준을 만족하는 색은 그대로 둔다', () => {
    const navy = '#1F3A5F';
    const result = ensureContrast(navy, LIGHT_TEXT);

    expect(result).toEqual({
      color: navy,
      ratio: contrastRatio(navy, LIGHT_TEXT),
      adjusted: false,
    });
  });
});

describe('toAccessiblePair', () => {
  it('선호 글자색이 없으면 대비가 더 큰 쪽을 고른다', () => {
    expect(toAccessiblePair('#FFB648').contrastText).toBe(DARK_TEXT);
    expect(toAccessiblePair('#1F3A5F').contrastText).toBe(LIGHT_TEXT);
  });
});
