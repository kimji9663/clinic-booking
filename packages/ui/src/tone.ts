import type { Theme } from '@mui/material/styles';
import { vars } from './palette';

/** 도메인과 무관한 의미 색 단계. 화면 코드는 색상 대신 tone 으로 의도를 표현한다. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneToPaletteKey = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
} as const satisfies Record<Exclude<Tone, 'neutral'>, keyof Theme['palette']>;

export function toneColor(theme: Theme, tone: Tone): string {
  const palette = vars(theme);
  return tone === 'neutral' ? palette.text.secondary : palette[toneToPaletteKey[tone]].main;
}

export const toneToChipColor = {
  neutral: 'default',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
} as const satisfies Record<Tone, string>;
