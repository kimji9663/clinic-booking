import {
  alpha,
  createTheme,
  type Components,
  type PaletteMode,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
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

/** CSS 변수 이름 접두사: --clinic-palette-primary-main 등 */
export const CSS_VAR_PREFIX = 'clinic';
/** <html data-color-scheme="dark"> 로 색 구성을 바꾼다 */
export const COLOR_SCHEME_ATTRIBUTE = 'data-color-scheme';

export interface SoftButtonColors {
  color: string;
  backgroundColor: string;
  hoverBackgroundColor: string;
}

export interface BrandScheme {
  palette: {
    primary: AccessiblePaletteColor;
    secondary: AccessiblePaletteColor;
    info: AccessiblePaletteColor;
    success: AccessiblePaletteColor;
    warning: AccessiblePaletteColor;
    error: AccessiblePaletteColor;
    background: { default: string; paper: string };
  };
  soft: { primary: SoftButtonColors; secondary: SoftButtonColors };
  /** soft 버튼 배경 불투명도 (기본, hover) */
  softAlpha: readonly [number, number];
}

/**
 * 한 가지 모드(light/dark)의 색 구성.
 * 각 색은 실제로 놓이는 모든 곳에서 WCAG AA(4.5:1)를 만족하도록 보정한다.
 * 1) 색 배경 위 글자(contained 버튼)  2) 흰/어두운 카드(paper) 위 글자
 * 3) 브랜드 배경(default) 위 글자(text 버튼)  4) soft 버튼의 반투명 배경 위 글자
 */
export function createBrandScheme(tokens: BrandTokens, mode: PaletteMode): BrandScheme {
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

  const softAlpha = dark ? ([0.16, 0.24] as const) : ([0.12, 0.2] as const);
  const soft = (main: string): SoftButtonColors => {
    // 반투명 배경이 표면과 합성된 "실제 배경색" 위에서 글자 대비를 계산
    const backgrounds = surfaces.flatMap((surface) =>
      softAlpha.map((a) => composite(main, a, surface)),
    );
    return {
      color: ensureContrastOnAll(main, backgrounds),
      backgroundColor: alpha(main, softAlpha[0]),
      hoverBackgroundColor: alpha(main, softAlpha[1]),
    };
  };

  return {
    palette: {
      primary,
      secondary,
      info: fit(SEMANTIC_BASE.info, textOn),
      success: fit(SEMANTIC_BASE.success, textOn),
      warning: fit(SEMANTIC_BASE.warning, textOn),
      error: fit(SEMANTIC_BASE.error, textOn),
      background,
    },
    soft: { primary: soft(primary.main), secondary: soft(secondary.main) },
    softAlpha,
  };
}

/** 고객사와 무관한 앱 쪽 설정(예: 라우터 링크 컴포넌트)을 테마에 합칠 때 사용 */
export interface BrandThemeExtras {
  components?: ThemeOptions['components'];
}

function mergeComponents(
  base: Components<Theme>,
  extra: ThemeOptions['components'] = {},
): Components<Theme> {
  // 컴포넌트별로 한 단계만 합친다 (예: MuiButtonBase 의 styleOverrides + 앱의 defaultProps)
  const merged = { ...base } as Record<string, object | undefined>;
  for (const [key, value] of Object.entries(extra) as [string, object | undefined][]) {
    merged[key] = { ...merged[key], ...value };
  }
  return merged as Components<Theme>;
}

/**
 * 브랜드 토큰 → MUI Theme (CSS 변수 모드).
 * 고객사가 늘어나도 화면 코드는 그대로 두고 토큰 파일만 추가하면 되도록 하는 것이 목적.
 *
 * - light/dark 두 색 구성을 한 번에 만들어 CSS 변수(--clinic-palette-*)로 내보낸다.
 * - 화면 모드를 바꿔도 테마 객체를 다시 만들거나 컴포넌트 스타일을 다시 계산하지 않고,
 *   <html data-color-scheme> 속성만 바뀌어 CSS 변수 값이 교체된다.
 */
export function createBrandTheme(tokens: BrandTokens, extras: BrandThemeExtras = {}): Theme {
  const compact = tokens.density === 'compact';
  const light = createBrandScheme(tokens, 'light');
  const dark = createBrandScheme(tokens, 'dark');
  const heading = { fontFamily: tokens.typography.heading, fontWeight: 700 };

  const softVariant = (key: 'primary' | 'secondary') => ({
    props: { variant: 'soft' as const, color: key },
    style: ({ theme }: { theme: Theme }) => ({
      padding: compact ? '4px 10px' : '6px 16px',
      color: light.soft[key].color,
      backgroundColor: light.soft[key].backgroundColor,
      '&:hover': { backgroundColor: light.soft[key].hoverBackgroundColor },
      ...theme.applyStyles('dark', {
        color: dark.soft[key].color,
        backgroundColor: dark.soft[key].backgroundColor,
        '&:hover': { backgroundColor: dark.soft[key].hoverBackgroundColor },
      }),
    }),
  });

  const components: Components<Theme> = {
    MuiButtonBase: {
      styleOverrides: {
        // 키보드 사용자를 위한 선명한 포커스 표시 (모드에 따라 CSS 변수로 색이 바뀜)
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `3px solid rgba(${theme.vars?.palette.primary.mainChannel ?? '0 0 0'} / 0.55)`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: compact ? 'small' : 'medium' },
      variants: [softVariant('primary'), softVariant('secondary')],
    },
    MuiTextField: { defaultProps: { size: compact ? 'small' : 'medium' } },
    MuiTable: { defaultProps: { size: compact ? 'small' : 'medium' } },
    MuiTypography: { defaultProps: { variantMapping: { label: 'span' } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiAppBar: { defaultProps: { elevation: 0 } },
  };

  return createTheme({
    cssVariables: { colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE, cssVarPrefix: CSS_VAR_PREFIX },
    colorSchemes: {
      light: { palette: light.palette as PaletteOptions },
      dark: { palette: dark.palette as PaletteOptions },
    },
    brand: {
      id: tokens.id,
      name: tokens.name,
      shortName: tokens.shortName,
      department: tokens.department,
      tagline: tokens.tagline,
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
    components: mergeComponents(components, extras.components),
  });
}
