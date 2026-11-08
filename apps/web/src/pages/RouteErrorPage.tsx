import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useRouteError } from 'react-router';

/** 렌더링 중 예외(또는 청크 로딩 실패)가 나도 빈 화면 대신 복구 방법을 보여준다 */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

  return (
    <Box component="main" sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => window.location.reload()}>
            새로고침
          </Button>
        }
      >
        <AlertTitle>화면을 표시하지 못했습니다</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
}
