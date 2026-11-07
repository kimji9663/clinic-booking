import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { AppShell } from './AppShell';

const navItems = [
  { id: 'dashboard', label: '대시보드', href: '/', current: true },
  { id: 'patients', label: '환자', href: '/patients' },
];

/** jsdom 에는 matchMedia 가 없어 모바일로 렌더링된다. 데스크톱 뷰포트를 흉내낸다. */
function mockDesktopViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppShell', () => {
  it('본문 바로가기 링크와 main 랜드마크를 제공한다', () => {
    renderWithTheme(
      <AppShell title="예약 관리" navItems={navItems}>
        본문
      </AppShell>,
    );

    const skipLink = screen.getByRole('link', { name: '본문 바로가기' });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('모바일에서는 메뉴 버튼으로 내비게이션을 연다', () => {
    renderWithTheme(
      <AppShell title="예약 관리" navItems={navItems}>
        본문
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('데스크톱에서는 사이드바가 항상 보이고 현재 메뉴에 aria-current 를 붙인다', () => {
    mockDesktopViewport();
    renderWithTheme(
      <AppShell title="예약 관리" navItems={navItems}>
        본문
      </AppShell>,
    );

    expect(screen.queryByRole('button', { name: '메뉴 열기' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
    expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('aria-current', 'page');
  });
});
