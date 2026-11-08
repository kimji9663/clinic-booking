import { PageHeader, VirtualDataTable, type Column } from '@clinic/ui';
import Stack from '@mui/material/Stack';
import { usePatientPages } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { QueryErrorState } from '../components/QueryErrorState';
import type { Patient } from '../domain/patient';
import { formatDateLabel } from '../utils/date';
import { maskName, maskPhone } from '../utils/maskName';

const columns: Column<Patient>[] = [
  { key: 'name', header: '이름', render: (name) => maskName(name) },
  { key: 'phone', header: '연락처', render: (phone) => maskPhone(phone) },
  { key: 'visitCount', header: '방문 횟수', align: 'right', render: (n) => `${n}회` },
  {
    key: 'lastVisit',
    header: '최근 방문',
    hideOnMobile: true,
    render: (date) => (date ? formatDateLabel(date) : '-'),
  },
  {
    key: 'nextAppointment',
    header: '다음 예약',
    render: (next) => {
      if (!next) return '-';
      const [date = '', time = ''] = next.split(' ');
      return `${formatDateLabel(date)} ${time}`;
    },
  },
];

export function PatientsPage() {
  usePageTitle('환자');
  const { data, isPending, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    usePatientPages();

  return (
    <Stack spacing={3}>
      <PageHeader
        title="환자"
        description="예약 이력을 기준으로 집계한 환자 목록입니다. 아래로 스크롤하면 다음 목록을 이어서 불러옵니다. 개인정보는 마스킹되어 표시됩니다."
      />
      {error && !data ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <VirtualDataTable
          caption={`환자 ${data ? `${data.total}명` : ''}`}
          showCaption
          loading={isPending}
          columns={columns}
          rows={data?.rows ?? []}
          totalCount={data?.total}
          getRowId={(p) => p.id}
          scrollMode="window"
          hasMore={hasNextPage && !error}
          loadingMore={isFetchingNextPage}
          onLoadMore={() => void fetchNextPage()}
        />
      )}
      {/* 다음 페이지 요청이 실패하면 이미 불러온 목록은 유지하고 이어서 다시 시도할 수 있게 한다 */}
      {error && data && <QueryErrorState error={error} onRetry={() => void fetchNextPage()} />}
    </Stack>
  );
}
