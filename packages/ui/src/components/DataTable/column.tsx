import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { visuallyHidden } from '../../a11y';

type StringKey<T> = Extract<keyof T, string>;

/**
 * 컬럼 정의. key 에 따라 render 의 value 타입이 자동으로 좁혀진다.
 * 예) { key: 'status', render: (status) => ... } 에서 status 는 T['status'] 타입.
 * DataTable 과 VirtualDataTable 이 같은 정의를 공유한다.
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

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function renderCell<T>(column: Column<T>, row: T): ReactNode {
  const value = row[column.key];
  if (!column.render) return formatValue(value);
  // Column<T> 는 key별 유니언이라 render 인자 타입이 교차된다. 공개 API의 타입 안전성은 Column<T> 가 보장한다.
  return (column.render as (value: unknown, row: T) => ReactNode)(value, row);
}

const SKELETON_ROWS = 4;

/** 표 로딩 상태. aria-busy 와 숨김 문구로 스크린리더에도 로딩 중임을 알린다. */
export function TableSkeleton({ caption }: { caption: string }) {
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
