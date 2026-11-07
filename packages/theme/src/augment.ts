/**
 * MUI 테마 타입 확장 (module augmentation).
 * index.ts 에서 import 하므로 이 패키지를 쓰는 모든 곳에서 아래 확장 타입이 적용된다.
 */
import type { CSSProperties } from 'react';
import type { BrandMeta } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    brand: BrandMeta;
  }
  interface ThemeOptions {
    brand?: BrandMeta;
  }

  interface TypographyVariants {
    label: CSSProperties;
  }
  interface TypographyVariantsOptions {
    label?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    label: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    /** 옅은 배경 + 진한 글자의 보조 버튼 */
    soft: true;
  }
}
