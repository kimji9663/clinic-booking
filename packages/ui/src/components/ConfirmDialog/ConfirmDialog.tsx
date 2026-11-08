import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useId } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: 삭제·취소처럼 되돌릴 수 없는 작업 */
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 확인 대화상자. 위험한 작업일 때는 실수로 Enter 를 눌러도 실행되지 않도록
 * 기본 포커스를 "닫기" 버튼에 둔다.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '닫기',
  tone = 'default',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const danger = tone === 'danger';

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText id={descriptionId}>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose} disabled={loading} autoFocus={danger}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          autoFocus={!danger}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
