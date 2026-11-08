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

/**
 * jsdom 은 레이아웃을 계산하지 않아 요소 크기가 모두 0 이라 가상화 목록이 아무 행도 그리지 않는다.
 * 스크롤 영역과 행 높이를 고정해 TanStack Virtual 의 범위 계산을 재현한다. (afterEach 에서 vi.restoreAllMocks)
 */
export function mockElementSize({ viewport = 600, row = 50 } = {}) {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(viewport);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(row);
  // 페이지 전체 스크롤(window) 가상화용 (afterEach 에서 vi.unstubAllGlobals)
  vi.stubGlobal('innerHeight', viewport);
  vi.stubGlobal('scrollY', 0);
}

/** 페이지(window) 스크롤 흉내 */
export function scrollWindowTo(top: number) {
  vi.stubGlobal('scrollY', top);
  window.dispatchEvent(new Event('scroll'));
}
