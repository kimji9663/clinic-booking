import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Column } from '../DataTable/column';
import { renderWithTheme } from '../../test-utils';
import { VirtualDataTable } from './VirtualDataTable';

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [
  { key: 'id', header: '번호' },
  { key: 'name', header: '이름' },
];

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `환자 ${i + 1}` }));

/**
 * jsdom 은 레이아웃을 계산하지 않아 모든 크기가 0 이다.
 * 스크롤 영역 400px, 행 40px 로 고정해 가상화 범위 계산을 재현한다.
 */
const VIEWPORT = 400;
const ROW = 40;
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(VIEWPORT);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(ROW);
  vi.stubGlobal('innerHeight', VIEWPORT);
  vi.stubGlobal('scrollY', 0);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function scrollTo(region: HTMLElement, top: number) {
  Object.defineProperty(region, 'scrollTop', { configurable: true, value: top });
  act(() => {
    fireEvent.scroll(region);
  });
}

function renderedIndexes() {
  return screen
    .getAllByRole('row')
    .map((row) => Number(row.getAttribute('aria-rowindex')))
    .filter((i) => i > 1);
}

describe('VirtualDataTable', () => {
  it('1,000행 중 보이는 범위만 그리고, 전체 행 수는 aria-rowcount 로 알린다', () => {
    renderWithTheme(
      <VirtualDataTable
        caption="환자 목록"
        columns={columns}
        rows={makeRows(1000)}
        getRowId={(r) => r.id}
        estimateRowHeight={ROW}
        overscan={2}
      />,
    );

    const table = screen.getByRole('table', { name: '환자 목록' });
    expect(table).toHaveAttribute('aria-rowcount', '1001');
    const indexes = renderedIndexes();
    // 400px / 40px = 10행 + overscan 2
    expect(indexes.length).toBeLessThanOrEqual(12);
    expect(indexes[0]).toBe(2);
    expect(screen.getByRole('status')).toHaveTextContent('전체 1000건 중 1000건 표시');
  });

  it('스크롤하면 해당 위치의 행으로 바뀐다', () => {
    renderWithTheme(
      <VirtualDataTable
        caption="환자 목록"
        columns={columns}
        rows={makeRows(1000)}
        getRowId={(r) => r.id}
        estimateRowHeight={ROW}
        overscan={0}
      />,
    );

    scrollTo(screen.getByRole('region', { name: '환자 목록' }), 500 * ROW);
    const indexes = renderedIndexes();
    // 501번째 행(aria-rowindex 502)부터 보인다
    expect(indexes[0]).toBe(502);
    expect(screen.getByText('환자 501')).toBeInTheDocument();
    expect(screen.queryByText('환자 1')).not.toBeInTheDocument();
  });

  it('스크롤 영역은 키보드로 포커스할 수 있다', () => {
    renderWithTheme(
      <VirtualDataTable
        caption="환자 목록"
        columns={columns}
        rows={makeRows(5)}
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByRole('region', { name: '환자 목록' })).toHaveAttribute('tabindex', '0');
  });

  it('끝에 가까워지면 onLoadMore 를 호출하고, 불러오는 중에는 다시 호출하지 않는다', () => {
    const onLoadMore = vi.fn();
    const props = {
      caption: '환자 목록',
      columns,
      rows: makeRows(30),
      getRowId: (r: Row) => r.id,
      totalCount: 150,
      estimateRowHeight: ROW,
      overscan: 0,
      hasMore: true,
      onLoadMore,
    };
    const { rerender } = renderWithTheme(<VirtualDataTable {...props} />);
    expect(onLoadMore).not.toHaveBeenCalled();

    const region = screen.getByRole('region', { name: '환자 목록' });
    scrollTo(region, 25 * ROW);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(within(region).getByText('불러오는 중…')).toBeInTheDocument();

    onLoadMore.mockClear();
    rerender(<VirtualDataTable {...props} loadingMore />);
    scrollTo(region, 26 * ROW);
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('다음 목록을 불러오는 중');
  });

  it('더 불러올 데이터가 없으면 onLoadMore 를 호출하지 않는다', () => {
    const onLoadMore = vi.fn();
    renderWithTheme(
      <VirtualDataTable
        caption="환자 목록"
        columns={columns}
        rows={makeRows(5)}
        getRowId={(r) => r.id}
        onLoadMore={onLoadMore}
      />,
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  describe('scrollMode="window" (페이지 전체 스크롤)', () => {
    function scrollWindowTo(top: number) {
      vi.stubGlobal('scrollY', top);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
    }

    it('별도 스크롤 영역 없이 창 높이만큼만 그린다', () => {
      renderWithTheme(
        <VirtualDataTable
          caption="환자 목록"
          columns={columns}
          rows={makeRows(1000)}
          getRowId={(r) => r.id}
          scrollMode="window"
          estimateRowHeight={ROW}
          overscan={2}
        />,
      );

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(screen.getByRole('table', { name: '환자 목록' })).toHaveAttribute(
        'aria-rowcount',
        '1001',
      );
      expect(renderedIndexes().length).toBeLessThanOrEqual(12);
    });

    it('페이지를 스크롤하면 해당 위치의 행으로 바뀌고, 끝에 가까워지면 onLoadMore 를 호출한다', () => {
      const onLoadMore = vi.fn();
      renderWithTheme(
        <VirtualDataTable
          caption="환자 목록"
          columns={columns}
          rows={makeRows(30)}
          getRowId={(r) => r.id}
          totalCount={150}
          scrollMode="window"
          estimateRowHeight={ROW}
          overscan={0}
          hasMore
          onLoadMore={onLoadMore}
        />,
      );

      scrollWindowTo(10 * ROW);
      expect(renderedIndexes()[0]).toBe(12);
      expect(onLoadMore).not.toHaveBeenCalled();

      scrollWindowTo(25 * ROW);
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
  });
});
