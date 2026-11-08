import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('제목과 설명으로 대화상자 이름·설명을 제공한다', () => {
    renderWithTheme(
      <ConfirmDialog
        open
        title="예약을 취소할까요?"
        description="취소한 예약은 되돌릴 수 없습니다."
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '예약을 취소할까요?' });
    expect(dialog).toHaveAccessibleDescription('취소한 예약은 되돌릴 수 없습니다.');
  });

  it('위험한 작업이면 기본 포커스를 닫기 버튼에 둔다', () => {
    renderWithTheme(
      <ConfirmDialog
        open
        tone="danger"
        title="예약을 취소할까요?"
        confirmLabel="예약 취소"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus();
  });

  it('확인 버튼을 누르면 onConfirm 을 호출한다', async () => {
    const onConfirm = vi.fn();
    renderWithTheme(
      <ConfirmDialog open title="진행할까요?" onConfirm={onConfirm} onClose={() => {}} />,
    );

    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
