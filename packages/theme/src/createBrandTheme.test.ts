import { describe, expect, it } from 'vitest';
import { brands } from './brands';
import { WCAG_AA, composite, contrastRatio } from './contrast';
import { createBrandTheme } from './createBrandTheme';
import { brandIds } from './tokens';

const paletteKeys = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

describe.each(brandIds)('createBrandTheme(%s)', (id) => {
  const tokens = brands[id];

  it('theme.brand 에 고객사 정보를 담는다', () => {
    expect(createBrandTheme(tokens).brand).toMatchObject({ id, name: tokens.name });
  });

  it('브랜드 radius 를 반영한다', () => {
    expect(createBrandTheme(tokens).shape.borderRadius).toBe(tokens.radius);
  });

  describe.each(['light', 'dark'] as const)('%s 모드', (mode) => {
    const theme = createBrandTheme(tokens, mode);
    const { paper, default: page } = theme.palette.background;

    it.each(paletteKeys)('%s: 색 배경 위 글자가 WCAG AA 를 만족한다', (key) => {
      const { main, contrastText } = theme.palette[key];
      expect(contrastRatio(main, contrastText)).toBeGreaterThanOrEqual(WCAG_AA);
    });

    it.each(paletteKeys)(
      '%s: 카드(paper)·페이지 배경 위 글자로 써도 WCAG AA 를 만족한다',
      (key) => {
        const { main } = theme.palette[key];
        expect(contrastRatio(main, paper)).toBeGreaterThanOrEqual(WCAG_AA);
        expect(contrastRatio(main, page)).toBeGreaterThanOrEqual(WCAG_AA);
      },
    );

    it('soft 버튼 글자가 반투명 배경 위에서도 WCAG AA 를 만족한다', () => {
      const variant = theme.components?.MuiButton?.variants?.find(
        (v) =>
          typeof v.props === 'object' && v.props.variant === 'soft' && v.props.color === 'primary',
      );
      const style = variant?.style as { color: string } | undefined;
      expect(style).toBeDefined();

      const main = theme.palette.primary.main;
      for (const surface of [paper, page]) {
        for (const opacity of [mode === 'dark' ? 0.16 : 0.12, mode === 'dark' ? 0.24 : 0.2]) {
          const bg = composite(main, opacity, surface);
          expect(contrastRatio(style!.color, bg)).toBeGreaterThanOrEqual(WCAG_AA);
        }
      }
    });
  });
});
