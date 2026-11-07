import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { DARK_TEXT, LIGHT_TEXT, WCAG_AA, ensureContrast, toAccessiblePair } from './contrast';

describe('ensureContrast', () => {
  it('대비가 부족한 색은 기준을 만족할 때까지 보정한다', () => {
    const skyBlue = '#3BA0F5';
    expect(getContrastRatio(skyBlue, LIGHT_TEXT)).toBeLessThan(WCAG_AA);

    const result = ensureContrast(skyBlue, LIGHT_TEXT);

    expect(result.adjusted).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it('이미 기준을 만족하는 색은 그대로 둔다', () => {
    const navy = '#1F3A5F';
    const result = ensureContrast(navy, LIGHT_TEXT);

    expect(result).toEqual({
      color: navy,
      ratio: getContrastRatio(navy, LIGHT_TEXT),
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
