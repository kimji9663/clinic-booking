import { vi } from 'vitest';

/**
 * jsdom 에는 matchMedia 가 없어 기본적으로 모바일 레이아웃으로 렌더링된다.
 * 데스크톱 너비(1280px)를 흉내내 min-width 미디어쿼리만 일치시킨다.
 */
export function mockDesktopViewport(width = 1280) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      const min = /min-width:\s*([\d.]+)px/.exec(query);
      const max = /max-width:\s*([\d.]+)px/.exec(query);
      const matches =
        (min ? width >= Number(min[1]) : true) &&
        (max ? width <= Number(max[1]) : true) &&
        !query.includes('prefers-color-scheme');
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  );
}
