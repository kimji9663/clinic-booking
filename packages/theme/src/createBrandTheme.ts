import { alpha, createTheme, darken, type Theme } from '@mui/material/styles';
import { LIGHT_TEXT, toAccessiblePair } from './contrast';
import type { BrandTokens } from './tokens';

/** 모든 고객사가 공유하는 상태 색. 브랜드 색과 마찬가지로 대비를 보정해서 쓴다. */
const SEMANTIC_BASE = {
  info: '#0288D1',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
} as const;

/**
 * 브랜드 토큰 → MUI Theme.
 * 고객사가 늘어나도 화면 코드는 그대로 두고 토큰 파일만 추가하면 되도록 하는 것이 목적.
 */
export function createBrandTheme(tokens: BrandTokens): Theme {
  const compact = tokens.density === 'compact';

  const primary = toAccessiblePair(tokens.colors.primary, tokens.onPrimary);
  const secondary = toAccessiblePair(tokens.colors.secondary);
  const info = toAccessiblePair(SEMANTIC_BASE.info, 'light');
  const success = toAccessiblePair(SEMANTIC_BASE.success, 'light');
  const warning = toAccessiblePair(SEMANTIC_BASE.warning, 'light');
  const error = toAccessiblePair(SEMANTIC_BASE.error, 'light');

  const heading = { fontFamily: tokens.typography.heading, fontWeight: 700 };

  const softButton = (main: string) => ({
    padding: compact ? '4px 10px' : '6px 16px',
    color: darken(main, 0.25),
    backgroundColor: alpha(main, 0.12),
    '&:hover': { backgroundColor: alpha(main, 0.2) },
  });

  return createTheme({
    brand: {
      id: tokens.id,
      name: tokens.name,
      shortName: tokens.shortName,
      department: tokens.department,
      tagline: tokens.tagline,
    },
    palette: {
      mode: 'light',
      primary,
      secondary,
      info,
      success,
      warning,
      error,
      background: { default: tokens.colors.background, paper: LIGHT_TEXT },
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
