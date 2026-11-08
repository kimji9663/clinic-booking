import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCallback, useRef, useState } from 'react';
import type { Column } from '../DataTable/column';
import { VirtualDataTable } from './VirtualDataTable';

interface Patient {
  id: string;
  name: string;
  phone: string;
  visits: number;
}

const columns: Column<Patient>[] = [
  { key: 'id', header: '번호', width: 88 },
  { key: 'name', header: '이름' },
  { key: 'phone', header: '연락처', hideOnMobile: true },
  { key: 'visits', header: '방문 횟수', align: 'right', render: (n) => `${n}회` },
];

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤'];

function makeRows(from: number, count: number): Patient[] {
  return Array.from({ length: count }, (_, i) => {
    const n = from + i + 1;
    return {
      id: String(n),
      name: `${SURNAMES[n % SURNAMES.length] ?? '김'}*${n % 2 ? '준' : '아'}`,
      phone: `010-****-${String(n).padStart(4, '0')}`,
      visits: n % 12,
    };
  });
}

const meta: Meta = {
  title: 'Data/VirtualDataTable',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

const tenThousand = makeRows(0, 10_000);

/** 10,000행을 한 번에 넘겨도 보이는 행만 DOM 에 그린다 */
export const TenThousandRows: Story = {
  render: () => (
    <VirtualDataTable
      caption="환자 10,000명"
      showCaption
      columns={columns}
      rows={tenThousand}
      getRowId={(r) => r.id}
      height={480}
    />
  ),
};

const TOTAL = 300;
const PAGE = 30;

function InfiniteScrollDemo() {
  const [rows, setRows] = useState(() => makeRows(0, PAGE));
  const [loadingMore, setLoadingMore] = useState(false);
  const pending = useRef(false);

  const loadMore = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setLoadingMore(true);
    // 네트워크 지연 흉내
    window.setTimeout(() => {
      setRows((prev) => [...prev, ...makeRows(prev.length, Math.min(PAGE, TOTAL - prev.length))]);
      setLoadingMore(false);
      pending.current = false;
    }, 600);
  }, []);

  return (
    <VirtualDataTable
      caption={`환자 ${TOTAL}명`}
      showCaption
      columns={columns}
      rows={rows}
      totalCount={TOTAL}
      getRowId={(r) => r.id}
      height={480}
      hasMore={rows.length < TOTAL}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
    />
  );
}

/** 30행씩 이어 불러오는 무한 스크롤 (가상화와 함께 동작) */
export const InfiniteScroll: Story = {
  render: () => <InfiniteScrollDemo />,
};

export const Loading: Story = {
  render: () => (
    <VirtualDataTable caption="환자" columns={columns} rows={[]} getRowId={(r) => r.id} loading />
  ),
};

/** 페이지 전체 스크롤을 따라 가상화 (머리글은 화면 상단에 고정) */
export const WindowScroll: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 16 }}>
      <VirtualDataTable
        caption="환자 10,000명"
        showCaption
        columns={columns}
        rows={tenThousand}
        getRowId={(r) => r.id}
        scrollMode="window"
      />
    </div>
  ),
};
