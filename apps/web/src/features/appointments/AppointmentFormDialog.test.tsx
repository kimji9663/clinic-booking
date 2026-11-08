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

    const name = within(dialog).getByRole('combobox', { name: /환자 이름/ });
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

    await user.type(within(dialog).getByRole('combobox', { name: /환자 이름/ }), '홍길동');
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

  it('기존 환자를 이름으로 검색해 고르면 이름·연락처가 채워진다 (키보드만으로)', async () => {
    const { user, dialog } = await openForm();
    const name = within(dialog).getByRole('combobox', { name: /환자 이름/ });

    await user.type(name, '김민');
    const listbox = await within(dialog).findByRole('listbox', { name: '환자 이름 추천' });
    // 목록에는 마스킹된 정보만 보인다
    expect(
      within(listbox).getByRole('option', { name: /김\*준.*010-\*{4}-4410/ }),
    ).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    expect(name).toHaveAttribute('aria-activedescendant');
    await user.keyboard('{Enter}');

    expect(name).toHaveValue('김민준');
    expect(within(dialog).getByRole('textbox', { name: /연락처/ })).toHaveValue('010-2381-4410');
    // Enter 는 폼 제출이 아니라 선택에 쓰였으므로 대화상자는 그대로 열려 있다
    expect(screen.getByRole('dialog', { name: '예약 등록' })).toBeInTheDocument();
  });

  it('연락처 뒷자리로도 검색된다', async () => {
    const { user, dialog } = await openForm();
    await user.type(within(dialog).getByRole('combobox', { name: /환자 이름/ }), '9021');
    const listbox = await within(dialog).findByRole('listbox', { name: '환자 이름 추천' });
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
    expect(within(listbox).getByRole('option')).toHaveTextContent('이*준');
  });

  it('서버가 시간 중복(409)을 알리면 시간 필드에 오류를 표시한다', async () => {
    server.use(
      http.post('/api/appointments', () =>
        HttpResponse.json({ message: '선택한 시간에 이미 예약이 있습니다.' }, { status: 409 }),
      ),
    );
    const { user, dialog } = await openForm();

    await user.type(within(dialog).getByRole('combobox', { name: /환자 이름/ }), '홍길동');
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
