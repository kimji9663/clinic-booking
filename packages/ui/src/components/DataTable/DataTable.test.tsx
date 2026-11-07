import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { DataTable, type Column } from './DataTable';

interface Row {
  id: string;
  name: string;
  age: number;
}

const columns: Column<Row>[] = [
  { key: 'name', header: '이름' },
  { key: 'age', header: '나이', align: 'right', render: (age) => `${age}세` },
];

const rows: Row[] = [
  { id: '1', name: '김하늘', age: 7 },
  { id: '2', name: '이바다', age: 34 },
];

describe('DataTable', () => {
  it('caption 으로 표 이름을 제공한다', () => {
    renderWithTheme(
      <DataTable caption="환자 목록" columns={columns} rows={rows} getRowId={(r) => r.id} />,
    );

    expect(screen.getByRole('table', { name: '환자 목록' })).toBeInTheDocument();
  });

  it('컬럼 헤더와 render 결과를 보여준다', () => {
    renderWithTheme(
      <DataTable caption="환자 목록" columns={columns} rows={rows} getRowId={(r) => r.id} />,
    );

    expect(screen.getByRole('columnheader', { name: '나이' })).toBeInTheDocument();
    const firstRow = screen.getAllByRole('row')[1];
    expect(firstRow).toBeDefined();
    expect(within(firstRow!).getByText('7세')).toBeInTheDocument();
  });

  it('데이터가 없으면 빈 상태를 보여준다', () => {
    renderWithTheme(
      <DataTable caption="환자 목록" columns={columns} rows={[]} getRowId={(r) => r.id} />,
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();
  });
});
