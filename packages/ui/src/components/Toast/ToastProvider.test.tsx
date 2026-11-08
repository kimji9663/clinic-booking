import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { ToastProvider, useToast } from './ToastProvider';

function Trigger({ severity }: { severity: 'success' | 'error' }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast({ message: '처리되었습니다', severity })}>
      실행
    </button>
  );
}

describe('ToastProvider', () => {
  it('성공 메시지는 role="status" 로 알린다', async () => {
    renderWithTheme(
      <ToastProvider>
        <Trigger severity="success" />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '실행' }));
    expect(await screen.findByRole('status')).toHaveTextContent('처리되었습니다');
  });

  it('오류 메시지는 role="alert" 로 즉시 알린다', async () => {
    renderWithTheme(
      <ToastProvider>
        <Trigger severity="error" />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '실행' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('처리되었습니다');
  });
});
