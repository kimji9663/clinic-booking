import { EmptyState } from '@clinic/ui';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { usePageTitle } from '../app/usePageTitle';

export function NotFoundPage() {
  usePageTitle('페이지를 찾을 수 없음');
  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        페이지를 찾을 수 없습니다
      </Typography>
      <EmptyState
        title="주소가 바뀌었거나 삭제된 페이지입니다."
        action={
          <Button variant="contained" href="/">
            대시보드로 이동
          </Button>
        }
      />
    </>
  );
}
