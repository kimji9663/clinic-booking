import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { ToastProvider, useToast } from '../Toast/ToastProvider';
import { FormDialog } from './FormDialog';

function FormDialogDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        예약 등록
      </Button>
      <FormDialog
        open={open}
        title="예약 등록"
        submitLabel="등록"
        onClose={() => setOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
          toast('예약이 등록되었습니다.');
        }}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="환자 이름" required />
          <TextField label="연락처" placeholder="010-1234-5678" required />
        </Stack>
      </FormDialog>
    </>
  );
}

function ConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
        예약 취소
      </Button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="예약을 취소할까요?"
        description="취소한 예약은 되돌릴 수 없습니다."
        confirmLabel="예약 취소"
        onConfirm={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const meta: Meta = {
  title: 'Feedback/Dialogs',
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};
export default meta;

export const Form: StoryObj = { render: () => <FormDialogDemo /> };
export const Confirm: StoryObj = { render: () => <ConfirmDemo /> };
