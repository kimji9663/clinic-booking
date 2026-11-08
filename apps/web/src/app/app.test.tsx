import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import { mockDesktopViewport, mockElementSize, scrollWindowTo } from '../test/viewport';

beforeEach(() => mockDesktopViewport());
afterEach(() => vi.unstubAllGlobals());

describe('대시보드', () => {
  it('오늘 예약을 API 에서 불러와 보여주고 환자 이름은 마스킹한다', async () => {
    renderApp('/');

    // 페이지는 lazy 로딩되므로 findBy 로 기다린다
    expect(
      await screen.findByRole('heading', { level: 1, name: '오늘의 예약' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: '오늘의 예약 목록' });
    expect(within(table).getByText('김*준')).toBeInTheDocument();
    expect(screen.queryByText('김민준')).not.toBeInTheDocument();
  });

  it('고객사를 바꾸면 브랜드와 문서 제목이 전환된다', async () => {
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('combobox', { name: '고객사' }));
    await user.click(screen.getByRole('option', { name: '바른치과' }));

    await waitFor(() => expect(document.title).toBe('대시보드 | 바른치과'));
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toHaveTextContent('바른치과');
  });

  it('다크 모드로 전환할 수 있다', async () => {
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: '다크 모드로 전환' }));
    expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument();
  });
});

describe('라우팅', () => {
  it('메뉴로 이동하면 현재 메뉴 표시가 바뀌고 본문으로 포커스가 이동한다', async () => {
    const { user } = renderApp('/');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    await user.click(within(nav).getByRole('link', { name: '예약 관리' }));

    expect(await screen.findByRole('heading', { level: 1, name: '예약 관리' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: '예약 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('없는 주소는 안내 페이지를 보여준다', async () => {
    renderApp('/unknown');
    expect(
      await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  });
});

describe('예약 관리', () => {
  it('상태 필터는 URL 쿼리에 반영된다', async () => {
    const { user, router } = renderApp('/appointments');

    await user.click(await screen.findByRole('combobox', { name: '상태' }));
    await user.click(screen.getByRole('option', { name: '승인 대기' }));

    await waitFor(() => expect(router.state.location.search).toContain('status=requested'));
    const table = await screen.findByRole('table', { name: /예약 2건/ });
    expect(within(table).getAllByRole('row')).toHaveLength(3); // 헤더 + 2건
  });

  it('승인 대기 예약을 승인하면 예약 확정으로 바뀐다', async () => {
    const { user } = renderApp('/appointments');

    await user.click(await screen.findByRole('button', { name: '14:00 윤*윤 승인' }));

    expect(await screen.findByRole('status')).toHaveTextContent("'예약 확정' 상태가 되었습니다");
    const row = (await screen.findByText('윤*윤')).closest('tr');
    expect(row).not.toBeNull();
    await waitFor(() => expect(within(row!).getByText('예약 확정')).toBeInTheDocument());
  });

  it('예약 취소는 확인 대화상자를 거친다', async () => {
    const { user } = renderApp('/appointments');

    await user.click(await screen.findByRole('button', { name: '10:30 이*준 예약 취소' }));
    const dialog = screen.getByRole('dialog', { name: '예약을 취소할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '예약 취소' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '예약을 취소할까요?' })).not.toBeInTheDocument(),
    );
    const row = screen.getByText('이*준').closest('tr');
    await waitFor(() => expect(within(row!).getByText('취소')).toBeInTheDocument());
  });
});

describe('환자', () => {
  afterEach(() => vi.restoreAllMocks());

  it('150명 중 첫 페이지만 불러오고, 화면에 보이는 행만 그린다', async () => {
    mockElementSize();
    renderApp('/patients');

    const table = await screen.findByRole('table', { name: '환자 150명' });
    expect(table).toHaveAttribute('aria-rowcount', '151');
    expect(screen.getByRole('status')).toHaveTextContent('전체 150건 중 30건 표시');
    // 600px / 50px = 12행 + overscan 8 → 30행 전체가 아니라 일부만 DOM 에 있다
    const rendered = within(table).getAllByRole('row').length - 1;
    expect(rendered).toBeLessThan(30);
    // 연락처는 마스킹
    expect(within(table).getAllByText(/^010-\*{4}-\d{4}$/).length).toBeGreaterThan(0);
  });

  it('페이지를 끝까지 스크롤하면 다음 페이지를 이어서 불러온다 (무한 스크롤)', async () => {
    mockElementSize();
    renderApp('/patients');
    await screen.findByRole('table', { name: '환자 150명' });
    // 페이지 전체 스크롤 방식이라 별도 스크롤 영역이 없다
    expect(screen.queryByRole('region', { name: '환자 150명' })).not.toBeInTheDocument();

    for (const loaded of [60, 90, 120, 150]) {
      // 지금까지 불러온 목록의 끝("불러오는 중" 행)이 화면 맨 위에 오도록 스크롤
      const bottom = (loaded - 30) * 50;
      // 실제 사용자는 스크롤 이벤트를 계속 발생시킨다. 부하가 큰 환경에서 첫 이벤트가 데이터 요청과
      // 엇갈려도 결과가 같도록, 기다리는 동안 스크롤 이벤트를 다시 보낸다.
      await waitFor(() => {
        act(() => scrollWindowTo(bottom));
        expect(screen.getByRole('status')).toHaveTextContent(`전체 150건 중 ${loaded}건 표시`);
      });
    }
    // 마지막 페이지 이후에는 "불러오는 중" 행이 없다
    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument();
  });
});
