import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { visuallyHidden } from '../../a11y';
import { TableSkeleton, renderCell, type Column } from '../DataTable/column';
import { APP_HEADER_HEIGHT_VAR } from '../AppShell/AppShell';
import { EmptyState } from '../EmptyState/EmptyState';

export interface VirtualDataTableProps<T> {
  /** 표 제목. 표·스크롤 영역의 접근 가능한 이름으로 쓰인다. */
  caption: string;
  showCaption?: boolean;
  columns: readonly Column<T>[];
  /** 지금까지 불러온 행 */
  rows: readonly T[];
  getRowId: (row: T) => string;
  /** 서버가 알려준 전체 행 수. 스크린리더에 "전체 N건 중 M건"을 알리는 데 쓴다. */
  totalCount?: number;
  /**
   * container: 표 안에 고정 높이 스크롤 영역을 둔다 (기본)
   * window: 페이지 전체 스크롤을 따라 가상화한다. 표 머리글은 stickyTop 아래에 고정된다.
   */
  scrollMode?: 'container' | 'window';
  /** container 모드의 스크롤 영역 높이 (기본 560px) */
  height?: number | string;
  /** window 모드에서 머리글이 고정될 위치. 기본은 AppShell 상단 바 높이 */
  stickyTop?: number | string;
  /** 측정 전 예상 높이. 실제 높이는 렌더 후 측정해 보정한다. */
  estimateRowHeight?: number;
  estimateCardHeight?: number;
  /** 화면 밖에 미리 그려 둘 행 수 */
  overscan?: number;
  /** 무한 스크롤: 더 불러올 데이터가 있는지 */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** 끝에서 몇 행 전에 다음 페이지를 요청할지 */
  loadMoreThreshold?: number;
  loading?: boolean;
  emptyState?: ReactNode;
}

/**
 * 대용량 목록용 가상화 표 (TanStack Virtual).
 * - 화면에 보이는 행(+overscan)만 DOM 에 그려 수천 행도 가볍게 스크롤한다.
 * - onLoadMore 를 주면 끝에 가까워질 때 다음 페이지를 요청하는 무한 스크롤이 된다.
 * - 접근성: 그려지지 않은 행이 있어도 aria-rowcount / aria-rowindex(카드는 aria-setsize / aria-posinset)로
 *   전체 위치를 알리고, 스크롤 영역은 키보드로 포커스해 화살표로 스크롤할 수 있다.
 */
export function VirtualDataTable<T>({
  caption,
  showCaption = false,
  columns,
  rows,
  getRowId,
  totalCount,
  scrollMode = 'container',
  height = 560,
  stickyTop = `var(${APP_HEADER_HEIGHT_VAR}, 0px)`,
  estimateRowHeight = 53,
  estimateCardHeight = 180,
  overscan = 8,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  loadMoreThreshold = 5,
  loading = false,
  emptyState,
}: VirtualDataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = totalCount ?? rows.length;
  // 더 불러올 데이터가 있으면 마지막에 "불러오는 중" 행을 하나 더 둔다
  const count = rows.length + (hasMore ? 1 : 0);

  const isWindow = scrollMode === 'window';
  // 목록이 문서 맨 위에서 얼마나 떨어져 있는지 (window 모드에서 스크롤 위치 → 행 번호 계산에 필요)
  const listRef = useRef<HTMLElement | null>(null);
  const setListRef = (node: HTMLElement | null) => {
    listRef.current = node;
  };
  const [scrollMargin, setScrollMargin] = useState(0);

  const options = {
    count,
    estimateSize: () => (isMobile ? estimateCardHeight : estimateRowHeight),
    overscan,
    getItemKey: (index: number) => {
      const row = rows[index];
      return row ? getRowId(row) : '__loader__';
    },
  };
  // 훅은 조건부로 부를 수 없으므로 둘 다 만들고 enabled 로 하나만 동작시킨다
  const containerVirtualizer = useVirtualizer({
    ...options,
    getScrollElement: () => scrollRef.current,
    enabled: !isWindow,
  });
  const windowVirtualizer = useWindowVirtualizer({
    ...options,
    scrollMargin,
    enabled: isWindow,
  });
  const virtualizer = isWindow ? windowVirtualizer : containerVirtualizer;
  const hasList = !loading && rows.length > 0;

  useLayoutEffect(() => {
    if (!isWindow || !hasList) return;
    const measure = () => {
      const top = listRef.current?.getBoundingClientRect().top;
      // 같은 값이면 React 가 리렌더를 생략한다
      if (top !== undefined) setScrollMargin(Math.round(top + window.scrollY));
    };
    measure();
    // 목록 위쪽 내용의 높이는 웹폰트 로딩·창 크기 변경으로 나중에 바뀔 수 있어 문서 크기 변화를 따라 다시 잰다
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isWindow, hasList, isMobile]);

  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? -1;

  // 마지막으로 그려진 행이 끝에 가까워지면 다음 페이지 요청
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    if (lastIndex >= rows.length - loadMoreThreshold) onLoadMore();
  }, [lastIndex, rows.length, hasMore, loadingMore, onLoadMore, loadMoreThreshold]);

  if (loading) return <TableSkeleton caption={caption} />;

  if (rows.length === 0) {
    return (
      <Paper variant="outlined">
        {emptyState ?? <EmptyState title="표시할 데이터가 없습니다" />}
      </Paper>
    );
  }

  // 화면 밖 행 자리를 비워 두는 여백. window 모드의 start/end 에는 scrollMargin 이 더해져 있다.
  const margin = isWindow ? scrollMargin : 0;
  const paddingTop = (items[0]?.start ?? margin) - margin;
  // getTotalSize() 는 scrollMargin 을 뺀 목록 자체의 높이
  const paddingBottom = virtualizer.getTotalSize() - ((items.at(-1)?.end ?? margin) - margin);

  const title = (
    <Typography
      id={titleId}
      variant="subtitle1"
      component="h2"
      sx={showCaption ? { fontWeight: 700, mb: 1 } : visuallyHidden}
    >
      {caption}
    </Typography>
  );

  const status = (
    <span role="status" style={visuallyHidden}>
      {loadingMore ? '다음 목록을 불러오는 중' : `전체 ${total}건 중 ${rows.length}건 표시`}
    </span>
  );

  const loader = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={16} aria-hidden="true" />
      <Typography variant="body2" color="text.secondary">
        불러오는 중…
      </Typography>
    </Stack>
  );

  // container 모드의 스크롤 영역: 키보드로 포커스해 스크롤할 수 있어야 한다 (WCAG 2.1.1)
  // window 모드는 페이지 자체가 스크롤되므로 별도 영역이 필요 없다
  const scrollProps = isWindow
    ? {}
    : ({ ref: scrollRef, role: 'region', 'aria-labelledby': titleId, tabIndex: 0 } as const);
  const focusRing = (offset: number) => ({
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: offset,
  });
  const scrollSx = isWindow
    ? {}
    : ({
        height,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        '&:focus-visible': focusRing(-3),
      } as const);

  if (isMobile) {
    const mobileColumns = columns.filter((column) => !column.hideOnMobile);
    return (
      <Box>
        {title}
        {status}
        <Box {...scrollProps} sx={scrollSx}>
          <Box
            component="ul"
            ref={setListRef}
            sx={{ listStyle: 'none', m: 0, px: 0, py: 0 }}
            style={{ paddingTop, paddingBottom }}
          >
            {items.map((item) => {
              const row = rows[item.index];
              return (
                <Box
                  component="li"
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  aria-setsize={total}
                  aria-posinset={item.index + 1}
                  sx={{ pb: 1.5 }}
                >
                  {row ? (
                    <Card sx={{ p: 2 }}>
                      <Box
                        component="dl"
                        sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, m: 0 }}
                      >
                        {mobileColumns.map((column) => (
                          <Box key={column.key} sx={{ display: 'contents' }}>
                            <Typography component="dt" variant="label" color="text.secondary">
                              {column.header}
                            </Typography>
                            <Box component="dd" sx={{ m: 0 }}>
                              {renderCell(column, row)}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Card>
                  ) : (
                    <Box sx={{ py: 2 }}>{loader}</Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    );
  }

  const spacer = (size: number) =>
    size > 0 ? (
      <tr aria-hidden="true">
        <td colSpan={columns.length} style={{ height: size, padding: 0, border: 0 }} />
      </tr>
    ) : null;

  return (
    <Box>
      {title}
      {status}
      {/* sticky 헤더의 각진 배경이 둥근 테두리를 덮지 않게 모서리를 잘라낸다.
          window 모드는 clip 을 써야 한다 (hidden 은 스크롤 컨테이너가 되어 sticky 가 페이지 기준으로 동작하지 않음).
          포커스 표시는 헤더에 가려지지 않도록 바깥 Paper 에 그린다. */}
      <Paper
        variant="outlined"
        sx={{
          overflow: isWindow ? 'clip' : 'hidden',
          '&:has(> [role="region"]:focus-visible)': focusRing(2),
        }}
      >
        <TableContainer
          {...scrollProps}
          sx={
            isWindow
              ? { overflow: 'visible' }
              : { ...scrollSx, '&:focus-visible': { outline: 'none' } }
          }
        >
          <Table stickyHeader aria-labelledby={titleId} aria-rowcount={total + 1}>
            <TableHead>
              <TableRow aria-rowindex={1}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    scope="col"
                    align={column.align ?? 'left'}
                    sx={{
                      width: column.width,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      ...(isWindow && { top: stickyTop }),
                    }}
                  >
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody ref={setListRef}>
              {spacer(paddingTop)}
              {items.map((item) => {
                const row = rows[item.index];
                return (
                  <TableRow
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    aria-rowindex={item.index + 2}
                    hover={Boolean(row)}
                  >
                    {row ? (
                      columns.map((column) => (
                        <TableCell key={column.key} align={column.align ?? 'left'}>
                          {renderCell(column, row)}
                        </TableCell>
                      ))
                    ) : (
                      <TableCell colSpan={columns.length}>{loader}</TableCell>
                    )}
                  </TableRow>
                );
              })}
              {spacer(paddingBottom)}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
