import { brands, createBrandTheme, type BrandId } from '@clinic/theme';
import { ThemeProvider } from '@mui/material/styles';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithTheme(
  ui: ReactElement,
  { brandId = 'sky-pediatrics', ...options }: RenderOptions & { brandId?: BrandId } = {},
) {
  const theme = createBrandTheme(brands[brandId]);
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>, options);
}
