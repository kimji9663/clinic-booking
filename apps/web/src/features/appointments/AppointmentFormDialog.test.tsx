import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/setup';
import { mockDesktopViewport } from '../../test/viewport';

beforeEach(() => mockDesktopViewport());
afterEach(() => vi.unstubAllGlobals());

async function openForm() {
  const app = renderApp('/appointments');
  await app.user.click(await screen.findByRole('button', { name: '예약 등록' }));
  const dialog = await screen.findByRole('dialog', { name: '예약 등록' });
  return { ...app, dialog };
}

async function selectOption(
  user: ReturnType<typeof renderApp>['user'],
  dialog: HTMLElement,
  label: string,
  option: string,
) {
  await user.click(within(dialog).getByRole('combobox', { name: new RegExp(label) }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('예약 등록 폼', () => {
  it('필수 항목을 비우고 제출하면 오류 메시지를 보여준다', async () => {
    const { user, dialog } = await openForm();

    await user.click(within(dialog).getByRole('button', { name: '등록' }));

    const name = within(dialog).getByRole('textbox', { name: /환자 이름/ });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('이름을 2자 이상 입력하세요.');
    expect(within(dialog).getByText('010-1234-5678 형식으로 입력하세요.')).toBeInTheDocument();
  });

  it('연락처는 입력하는 동안 하이픈이 자동으로 들어간다', async () => {
    const { user, dialog } = await openForm();
    const phone = within(dialog).getByRole('textbox', { name: /연락처/ });

    await user.type(phone, '01098765432');
    expect(phone).toHaveValue('010-9876-5432');
  });

  it('담당의를 고르면 이미 찬 시간은 선택할 수 없다', async () => {
    const { user, dialog } = await openForm();

    await selectOption(user, dialog, '담당의', '이서연 대표원장');
    await user.click(within(dialog).getByRole('combobox', { name: /시간/ }));

    expect(await screen.findByRole('option', { name: '14:00 (예약됨)' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('option', { name: '15:00' })).not.toHaveAttribute('aria-disabled');
  });

  it('올바르게 입력하면 예약을 등록하고 목록에 반영한다', async () => {
    const { user, dialog } = await openForm();

    await user.type(within(dialog).getByRole('textbox', { name: /환자 이름/ }), '홍길동');
    await user.type(within(dialog).getByRole('textbox', { name: /연락처/ }), '01055556666');
    await selectOption(user, dialog, '담당의', '정도윤 원장');
    await selectOption(user, dialog, '시간', '16:00');
    await user.click(within(dialog).getByRole('radio', { name: '재진' }));
    await user.click(within(dialog).getByRole('button', { name: '등록' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '홍*동 님의 예약이 등록되었습니다.',
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '예약 등록' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('홍*동')).toBeInTheDocument();
  });

  it('서버가 시간 중복(409)을 알리면 시간 필드에 오류를 표시한다', async () => {
    server.use(
      http.post('/api/appointments', () =>
        HttpResponse.json({ message: '선택한 시간에 이미 예약이 있습니다.' }, { status: 409 }),
      ),
    );
    const { user, dialog } = await openForm();

    await user.type(within(dialog).getByRole('textbox', { name: /환자 이름/ }), '홍길동');
    await user.type(within(dialog).getByRole('textbox', { name: /연락처/ }), '01055556666');
    await selectOption(user, dialog, '담당의', '정도윤 원장');
    await selectOption(user, dialog, '시간', '16:00');
    await user.click(within(dialog).getByRole('button', { name: '등록' }));

    expect(
      await within(dialog).findByText('선택한 시간에 이미 예약이 있습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '예약 등록' })).toBeInTheDocument();
  });
});
