import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
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
import type { ReactNode } from 'react';
import { visuallyHidden } from '../../a11y';
import { EmptyState } from '../EmptyState/EmptyState';

type StringKey<T> = Extract<keyof T, string>;

/**
 * 컬럼 정의. key 에 따라 render 의 value 타입이 자동으로 좁혀진다.
 * 예) { key: 'status', render: (status) => ... } 에서 status 는 T['status'] 타입.
 */
export type Column<T> = {
  [K in StringKey<T>]-?: {
    key: K;
    header: string;
    align?: 'left' | 'center' | 'right';
    width?: number | string;
    render?: (value: T[K], row: T) => ReactNode;
    /** 모바일 카드 보기에서 숨김 */
    hideOnMobile?: boolean;
  };
}[StringKey<T>];

export interface DataTableProps<T> {
  /** 표 제목. 스크린리더용 <caption> 으로도 사용된다. */
  caption: string;
  showCaption?: boolean;
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  emptyState?: ReactNode;
  /** true 이면 스켈레톤을 보여주고 aria-busy 로 로딩 중임을 알린다 */
  loading?: boolean;
}

const SKELETON_ROWS = 4;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function renderCell<T>(column: Column<T>, row: T): ReactNode {
  const value = row[column.key];
  if (!column.render) return formatValue(value);
  // Column<T> 는 key별 유니언이라 render 인자 타입이 교차된다. 공개 API의 타입 안전성은 Column<T> 가 보장한다.
  return (column.render as (value: unknown, row: T) => ReactNode)(value, row);
}

/**
 * 제네릭 데이터 테이블.
 * - sm 이상: 일반 표 (caption, th scope)
 * - sm 미만: 행마다 카드 + 정의 목록(dl) 으로 전환
 */
export function DataTable<T>({
  caption,
  showCaption = false,
  columns,
  rows,
  getRowId,
  emptyState,
  loading = false,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Paper variant="outlined" aria-busy="true" sx={{ p: 2 }}>
        <span style={visuallyHidden}>{caption} 불러오는 중</span>
        <Stack spacing={1.5} aria-hidden="true">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={36} />
          ))}
        </Stack>
      </Paper>
    );
  }

  if (rows.length === 0) {
    return (
      <Paper variant="outlined">
        {emptyState ?? <EmptyState title="표시할 데이터가 없습니다" />}
      </Paper>
    );
  }

  if (isMobile) {
    const mobileColumns = columns.filter((column) => !column.hideOnMobile);
    return (
      <Box component="section" aria-label={caption}>
        {showCaption && (
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            {caption}
          </Typography>
        )}
        <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {rows.map((row) => (
            <Card component="li" key={getRowId(row)} sx={{ p: 2 }}>
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
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        {/* MUI 기본 스타일은 caption 을 표 아래에 두므로 제목처럼 위로 올린다 */}
        <Table
          sx={{
            '& caption': {
              captionSide: 'top',
              typography: 'subtitle1',
              fontWeight: 700,
              color: 'text.primary',
            },
          }}
        >
          <caption style={showCaption ? undefined : visuallyHidden}>{caption}</caption>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  scope="col"
                  align={column.align ?? 'left'}
                  sx={{ width: column.width, fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowId(row)} hover>
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align ?? 'left'}>
                    {renderCell(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
