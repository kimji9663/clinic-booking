import { darken, decomposeColor, lighten } from '@mui/material/styles';

/** WCAG 2.1 AA — 일반 텍스트 최소 명도 대비 */
export const WCAG_AA = 4.5;

export const LIGHT_TEXT = '#FFFFFF';
export const DARK_TEXT = '#1A1A1A';

type Rgb = [number, number, number];

/** 브라우저가 실제로 그리는 값과 같도록 정수 RGB 로 반올림 */
function toRgb(color: string): Rgb {
  const { type, values } = decomposeColor(color);
  if (!type.startsWith('rgb')) throw new Error(`rgb/hex 색상만 지원합니다: ${color}`);
  return [Math.round(values[0]), Math.round(values[1]), Math.round(values[2])];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * WCAG 상대 휘도. MUI 의 getLuminance/getContrastRatio 는 소수점을 반올림해서
 * 4.49 를 4.5 로 판정하는 경계값 오차가 있어 직접 계산한다.
 */
export function relativeLuminance(color: string): number {
  const [r, g, b] = toRgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

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
  const shiftDarker = relativeLuminance(foreground) > 0.5;
  const STEP = 0.01;
  const MAX_STEPS = 100;

  let color = toHex(toRgb(background));
  let steps = 0;
  while (contrastRatio(color, foreground) < minRatio && steps < MAX_STEPS) {
    steps += 1;
    const shifted = shiftDarker
      ? darken(background, STEP * steps)
      : lighten(background, STEP * steps);
    color = toHex(toRgb(shifted));
  }

  return { color, ratio: contrastRatio(color, foreground), adjusted: steps > 0 };
}

/**
 * 색이 놓일 수 있는 모든 표면 위에서 대비를 만족하도록 보정한다.
 * (표면들은 모두 밝은 계열이거나 모두 어두운 계열이라고 가정 → 보정 방향이 같다)
 */
export function ensureContrastOnAll(
  color: string,
  surfaces: readonly string[],
  minRatio: number = WCAG_AA,
): string {
  return surfaces.reduce(
    (current, surface) => ensureContrast(current, surface, minRatio).color,
    color,
  );
}

/** 반투명 overlay 색을 base 위에 합성했을 때 실제로 보이는 색 */
export function composite(overlay: string, opacity: number, base: string): string {
  const top = toRgb(overlay);
  const bottom = toRgb(base);
  const mix = (i: 0 | 1 | 2) => Math.round(top[i] * opacity + bottom[i] * (1 - opacity));
  return toHex([mix(0), mix(1), mix(2)]);
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
        : contrastRatio(color, LIGHT_TEXT) >= contrastRatio(color, DARK_TEXT)
          ? LIGHT_TEXT
          : DARK_TEXT;

  return { main: ensureContrast(color, text, minRatio).color, contrastText: text };
}
