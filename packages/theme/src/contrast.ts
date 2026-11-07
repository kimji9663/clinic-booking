import { darken, getContrastRatio, getLuminance, lighten } from '@mui/material/styles';

/** WCAG 2.1 AA — 일반 텍스트 최소 명도 대비 */
export const WCAG_AA = 4.5;

export const LIGHT_TEXT = '#FFFFFF';
export const DARK_TEXT = '#1A1A1A';

export interface ContrastResult {
  /** 대비 기준을 만족하는 배경색 (보정되지 않았다면 입력값 그대로) */
  color: string;
  ratio: number;
  /** 원래 색으로는 기준 미달이라 보정했는지 여부 */
  adjusted: boolean;
}

/**
 * 글자색(foreground) 대비가 minRatio 이상이 될 때까지 배경색을 조금씩 어둡게(또는 밝게) 만든다.
 * 고객사 브랜드 색을 최대한 유지하면서 접근성 기준을 지키기 위한 함수.
 */
export function ensureContrast(
  background: string,
  foreground: string,
  minRatio: number = WCAG_AA,
): ContrastResult {
  const shiftDarker = getLuminance(foreground) > 0.5;
  const STEP = 0.02;
  const MAX_STEPS = 50;

  let color = background;
  let steps = 0;
  while (getContrastRatio(color, foreground) < minRatio && steps < MAX_STEPS) {
    steps += 1;
    color = shiftDarker ? darken(background, STEP * steps) : lighten(background, STEP * steps);
  }

  return { color, ratio: getContrastRatio(color, foreground), adjusted: steps > 0 };
}

export interface AccessiblePaletteColor {
  main: string;
  contrastText: string;
}

/**
 * 버튼·칩처럼 "색 배경 + 글자"로 쓰이는 색 한 쌍을 만든다.
 * prefer 를 주지 않으면 흰/검정 중 대비가 더 큰 글자색을 고른다.
 */
export function toAccessiblePair(
  color: string,
  prefer?: 'light' | 'dark',
  minRatio: number = WCAG_AA,
): AccessiblePaletteColor {
  const text =
    prefer === 'light'
      ? LIGHT_TEXT
      : prefer === 'dark'
        ? DARK_TEXT
        : getContrastRatio(color, LIGHT_TEXT) >= getContrastRatio(color, DARK_TEXT)
          ? LIGHT_TEXT
          : DARK_TEXT;

  return { main: ensureContrast(color, text, minRatio).color, contrastText: text };
}
