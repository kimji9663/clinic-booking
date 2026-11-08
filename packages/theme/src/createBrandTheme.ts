import { alpha, createTheme, type PaletteMode, type Theme } from '@mui/material/styles';
import {
  DARK_TEXT,
  LIGHT_TEXT,
  composite,
  ensureContrastOnAll,
  toAccessiblePair,
  type AccessiblePaletteColor,
} from './contrast';
import type { BrandTokens } from './tokens';

/** 모든 고객사가 공유하는 상태 색. 브랜드 색과 마찬가지로 대비를 보정해서 쓴다. */
const SEMANTIC_BASE = {
  info: '#0288D1',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
} as const;

/** 다크 모드 표면색. paper 를 DARK_TEXT 와 같게 두어 "버튼 글자 대비 = 표면 위 글자 대비"가 되도록 한다. */
const DARK_SURFACE = { default: '#121212', paper: DARK_TEXT } as const;

/**
 * 브랜드 토큰 → MUI Theme.
 * 고객사가 늘어나도 화면 코드는 그대로 두고 토큰 파일만 추가하면 되도록 하는 것이 목적.
 *
 * 각 색은 실제로 놓이는 모든 곳에서 WCAG AA(4.5:1)를 만족하도록 보정한다.
 * 1) 색 배경 위 글자(contained 버튼)  2) 흰/어두운 카드(paper) 위 글자
 * 3) 브랜드 배경(default) 위 글자(text 버튼)  4) soft 버튼의 반투명 배경 위 글자
 */
export function createBrandTheme(tokens: BrandTokens, mode: PaletteMode = 'light'): Theme {
  const compact = tokens.density === 'compact';
  const dark = mode === 'dark';
  const textOn = dark ? 'dark' : 'light';
  const background = dark ? DARK_SURFACE : { default: tokens.colors.background, paper: LIGHT_TEXT };
  const surfaces = [background.paper, background.default];

  const fit = (color: string, prefer: 'light' | 'dark'): AccessiblePaletteColor => {
    const pair = toAccessiblePair(color, prefer);
    return { ...pair, main: ensureContrastOnAll(pair.main, surfaces) };
  };

  const primary = fit(tokens.colors.primary, dark ? 'dark' : tokens.onPrimary);
  const secondary = fit(tokens.colors.secondary, textOn);
  const info = fit(SEMANTIC_BASE.info, textOn);
  const success = fit(SEMANTIC_BASE.success, textOn);
  const warning = fit(SEMANTIC_BASE.warning, textOn);
  const error = fit(SEMANTIC_BASE.error, textOn);

  const heading = { fontFamily: tokens.typography.heading, fontWeight: 700 };

  const SOFT_ALPHA = dark ? 0.16 : 0.12;
  const SOFT_HOVER_ALPHA = dark ? 0.24 : 0.2;
  const softButton = (main: string) => {
    // 반투명 배경이 표면과 합성된 "실제 배경색" 위에서 글자 대비를 계산
    const softBackgrounds = surfaces.flatMap((surface) => [
      composite(main, SOFT_ALPHA, surface),
      composite(main, SOFT_HOVER_ALPHA, surface),
    ]);
    return {
      padding: compact ? '4px 10px' : '6px 16px',
      color: ensureContrastOnAll(main, softBackgrounds),
      backgroundColor: alpha(main, SOFT_ALPHA),
      '&:hover': { backgroundColor: alpha(main, SOFT_HOVER_ALPHA) },
    };
  };

  return createTheme({
    brand: {
      id: tokens.id,
      name: tokens.name,
      shortName: tokens.shortName,
      department: tokens.department,
      tagline: tokens.tagline,
    },
    palette: {
      mode,
      primary,
      secondary,
      info,
      success,
      warning,
      error,
      background,
    },
    shape: { borderRadius: tokens.radius },
    spacing: compact ? 7 : 8,
    typography: {
      fontFamily: tokens.typography.body,
      h1: heading,
      h2: heading,
      h3: heading,
      h4: heading,
      h5: heading,
      h6: heading,
      button: { textTransform: 'none', fontWeight: 600 },
      label: {
        fontFamily: tokens.typography.body,
        fontSize: '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiButtonBase: {
        styleOverrides: {
          // 키보드 사용자를 위한 선명한 포커스 표시
          root: {
            '&.Mui-focusVisible': {
              outline: `3px solid ${alpha(primary.main, 0.55)}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true, size: compact ? 'small' : 'medium' },
        variants: [
          { props: { variant: 'soft', color: 'primary' }, style: softButton(primary.main) },
          { props: { variant: 'soft', color: 'secondary' }, style: softButton(secondary.main) },
        ],
      },
      MuiTextField: { defaultProps: { size: compact ? 'small' : 'medium' } },
      MuiTable: { defaultProps: { size: compact ? 'small' : 'medium' } },
      MuiTypography: { defaultProps: { variantMapping: { label: 'span' } } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiAppBar: { defaultProps: { elevation: 0 } },
    },
  });
}
