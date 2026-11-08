import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled, useTheme } from '@mui/material/styles';
import { useId, type FormEventHandler, type ReactNode } from 'react';

export interface FormDialogProps {
  open: boolean;
  title: string;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  children: ReactNode;
}

const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
});

/**
 * 폼을 담는 대화상자. 모바일에서는 전체 화면으로 열린다.
 * 폼 라이브러리에 의존하지 않고 onSubmit 만 받는다 (react-hook-form 의 handleSubmit 을 그대로 전달).
 */
export function FormDialog({
  open,
  title,
  submitLabel = '저장',
  cancelLabel = '취소',
  submitting = false,
  onSubmit,
  onClose,
  children,
}: FormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
    >
      <Form noValidate onSubmit={onSubmit}>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogContent dividers>{children}</DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="contained" loading={submitting}>
            {submitLabel}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
