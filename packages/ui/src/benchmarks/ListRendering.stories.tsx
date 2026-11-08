import type { Meta, StoryObj } from '@storybook/react-vite';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { DataTable, type Column } from '../components/DataTable/DataTable';
import { VirtualDataTable } from '../components/VirtualDataTable/VirtualDataTable';

/**
 * 성능 비교용 스토리 — scripts/bench/run.mjs 가 이 화면들을 열어 측정한다.
 * 같은 10,000행을 일반 표(DataTable)와 가상화 표(VirtualDataTable)로 각각 그린다.
 */
const meta: Meta = {
  title: 'Benchmarks/List rendering',
  parameters: { layout: 'padded', a11y: { test: 'off' } },
};
export default meta;

type Story = StoryObj;

interface Row {
  id: string;
  name: string;
  phone: string;
  visits: number;
  last: string;
}

const ROWS = 10_000;
const rows: Row[] = Array.from({ length: ROWS }, (_, i) => ({
  id: String(i + 1),
  name: `환자 ${i + 1}`,
  phone: `010-****-${String(i % 10_000).padStart(4, '0')}`,
  visits: i % 12,
  last: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
}));

const columns: Column<Row>[] = [
  { key: 'id', header: '번호' },
  { key: 'name', header: '이름' },
  { key: 'phone', header: '연락처' },
  { key: 'visits', header: '방문', align: 'right', render: (n) => `${n}회` },
  { key: 'last', header: '최근 방문' },
];

declare global {
  interface Window {
    __bench?: { commits: { phase: string; actualDuration: number }[] };
  }
}

/** React 가 실제로 렌더링에 쓴 시간(actualDuration)을 측정 스크립트가 읽을 수 있게 기록 */
const record: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
  window.__bench ??= { commits: [] };
  window.__bench.commits.push({ phase, actualDuration });
};

export const Plain10k: Story = {
  name: '일반 표 10,000행',
  render: () => (
    <Profiler id="plain" onRender={record}>
      <DataTable caption="환자 10,000명" columns={columns} rows={rows} getRowId={(r) => r.id} />
    </Profiler>
  ),
};

export const Virtual10k: Story = {
  name: '가상화 표 10,000행',
  render: () => (
    <Profiler id="virtual" onRender={record}>
      <VirtualDataTable
        caption="환자 10,000명"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={600}
      />
    </Profiler>
  ),
};
