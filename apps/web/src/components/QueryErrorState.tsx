import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export function QueryErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          다시 시도
        </Button>
      }
    >
      데이터를 불러오지 못했습니다. {error.message}
    </Alert>
  );
}
