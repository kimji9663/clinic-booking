import { PageHeader, VirtualDataTable, type Column } from '@clinic/ui';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { usePatientPages } from '../api/clinic';
import { usePageTitle } from '../app/usePageTitle';
import { QueryErrorState } from '../components/QueryErrorState';
import type { Patient } from '../domain/patient';
import { formatDateLabel } from '../utils/date';
import { maskName, maskPhone } from '../utils/maskName';

const columns: Column<Patient>[] = [
  {
    key: 'name',
    header: '이름',
    // 이름을 누르면 프로필로 이동. 스크린리더에는 "김*준 프로필"로 읽힌다
    render: (name, row) => (
      <Link href={`/patients/${row.id}`} aria-label={`${maskName(name)} 프로필`}>
        {maskName(name)}
      </Link>
    ),
  },
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
  const { data, isPending, isFetching, error, refetch, hasNextPage, fetchNextPage } =
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
          // 실시간 알림으로 목록을 다시 불러오는 동안에는 다음 페이지 요청이 무시되므로,
          // 그 동안도 "불러오는 중"으로 두어 끝나면 다시 요청하게 한다
          loadingMore={isFetching}
          // 스크롤 이벤트가 연달아 와도 진행 중인 다음 페이지 요청을 취소하고 다시 보내지 않게 한다
          onLoadMore={() => void fetchNextPage({ cancelRefetch: false })}
        />
      )}
      {/* 다음 페이지 요청이 실패하면 이미 불러온 목록은 유지하고 이어서 다시 시도할 수 있게 한다 */}
      {error && data && <QueryErrorState error={error} onRetry={() => void fetchNextPage()} />}
    </Stack>
  );
}
