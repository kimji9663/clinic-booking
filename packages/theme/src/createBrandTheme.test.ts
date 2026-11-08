import type { CssVarsTheme, Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { brands } from './brands';
import { WCAG_AA, composite, contrastRatio } from './contrast';
import { COLOR_SCHEME_ATTRIBUTE, createBrandScheme, createBrandTheme } from './createBrandTheme';
import { brandIds } from './tokens';

const paletteKeys = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

describe.each(brandIds)('createBrandTheme(%s)', (id) => {
  const tokens = brands[id];
  const theme = createBrandTheme(tokens) as Theme & CssVarsTheme;

  it('theme.brand 에 고객사 정보를 담는다', () => {
    expect(theme.brand).toMatchObject({ id, name: tokens.name });
  });

  it('브랜드 radius 를 반영한다', () => {
    expect(theme.shape.borderRadius).toBe(tokens.radius);
  });

  it('light/dark 색 구성을 CSS 변수로 함께 담는다 (모드 전환 시 테마를 다시 만들지 않음)', () => {
    expect(theme.colorSchemes.light?.palette.primary.main).toBe(
      createBrandScheme(tokens, 'light').palette.primary.main,
    );
    expect(theme.colorSchemes.dark?.palette.primary.main).toBe(
      createBrandScheme(tokens, 'dark').palette.primary.main,
    );
    // 스타일에는 실제 색 대신 CSS 변수(+기본값)가 들어간다
    expect(theme.vars.palette.primary.main).toMatch(/^var\(--clinic-palette-primary-main/);
    expect(theme.getColorSchemeSelector('dark')).toContain(`[${COLOR_SCHEME_ATTRIBUTE}="dark"]`);
  });

  describe.each(['light', 'dark'] as const)('%s 모드', (mode) => {
    const scheme = createBrandScheme(tokens, mode);
    const { paper, default: page } = scheme.palette.background;

    it.each(paletteKeys)('%s: 색 배경 위 글자가 WCAG AA 를 만족한다', (key) => {
      const { main, contrastText } = scheme.palette[key];
      expect(contrastRatio(main, contrastText)).toBeGreaterThanOrEqual(WCAG_AA);
    });

    it.each(paletteKeys)(
      '%s: 카드(paper)·페이지 배경 위 글자로 써도 WCAG AA 를 만족한다',
      (key) => {
        const { main } = scheme.palette[key];
        expect(contrastRatio(main, paper)).toBeGreaterThanOrEqual(WCAG_AA);
        expect(contrastRatio(main, page)).toBeGreaterThanOrEqual(WCAG_AA);
      },
    );

    it.each(['primary', 'secondary'] as const)(
      '%s soft 버튼 글자가 반투명 배경 위에서도 WCAG AA 를 만족한다',
      (key) => {
        const { color } = scheme.soft[key];
        const main = scheme.palette[key].main;
        for (const surface of [paper, page]) {
          for (const opacity of scheme.softAlpha) {
            expect(contrastRatio(color, composite(main, opacity, surface))).toBeGreaterThanOrEqual(
              WCAG_AA,
            );
          }
        }
      },
    );
  });
});
