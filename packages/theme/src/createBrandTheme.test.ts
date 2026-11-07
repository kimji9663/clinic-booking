import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { brands } from './brands';
import { WCAG_AA } from './contrast';
import { createBrandTheme } from './createBrandTheme';
import { brandIds } from './tokens';

describe.each(brandIds)('createBrandTheme(%s)', (id) => {
  const tokens = brands[id];
  const theme = createBrandTheme(tokens);

  it('theme.brand 에 고객사 정보를 담는다', () => {
    expect(theme.brand).toMatchObject({ id, name: tokens.name });
  });

  it.each(['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const)(
    '%s 색상은 글자색과 WCAG AA 대비를 만족한다',
    (key) => {
      const { main, contrastText } = theme.palette[key];
      expect(getContrastRatio(main, contrastText)).toBeGreaterThanOrEqual(WCAG_AA);
    },
  );

  it('브랜드 radius 를 반영한다', () => {
    expect(theme.shape.borderRadius).toBe(tokens.radius);
  });
});
