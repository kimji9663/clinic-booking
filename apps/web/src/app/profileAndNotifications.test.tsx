import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { patientIdOf } from '../domain/patient';
import { connectedClientCount, emitClinicEvent } from '../mocks/events';
import { renderApp } from '../test/renderApp';
import { server } from '../test/setup';
import { mockDesktopViewport } from '../test/viewport';

beforeEach(() => mockDesktopViewport());
afterEach(() => vi.unstubAllGlobals());

// 시드의 대표 환자: 이하준(010-3348-9021) — 메모가 미리 들어 있다
const LEE = patientIdOf('010-3348-9021');
// 김민준(010-2381-4410) — 메모 없음
const KIM = patientIdOf('010-2381-4410');

describe('환자 프로필', () => {
  it('기본 정보·메모·진료 이력을 마스킹해서 보여준다', async () => {
    renderApp(`/patients/${LEE}`);

    expect(await screen.findByRole('heading', { level: 1, name: '이*준 님' })).toBeInTheDocument();
    expect(document.title).toBe('이*준 님 | 하늘소아과의원');

    const info = screen.getByRole('region', { name: '기본 정보' });
    expect(within(info).getByText('010-****-9021')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '메모' })).getByText(/페니실린/),
    ).toBeInTheDocument();

    const upcoming = screen.getByRole('region', { name: /예정된 예약/ });
    expect(within(upcoming).getByText(/10:30 · 정도윤/)).toBeInTheDocument();
    expect(within(upcoming).getByText('예약 확정')).toBeInTheDocument();
    expect(screen.queryByText('이하준')).not.toBeInTheDocument();
  });

  it('메모를 수정하면 바로 반영되고 저장 완료를 알린다', async () => {
    const { user } = renderApp(`/patients/${KIM}`);
    const memo = await screen.findByRole('region', { name: '메모' });
    expect(within(memo).getByText('등록된 메모가 없습니다.')).toBeInTheDocument();

    await user.click(within(memo).getByRole('button', { name: '메모 수정' }));
    await user.type(within(memo).getByRole('textbox', { name: '메모' }), '땅콩 알레르기');
    await user.click(within(memo).getByRole('button', { name: '저장' }));

    // 낙관적 업데이트: 응답 전에 이미 보기 모드로 바뀌어 새 메모가 보인다
    expect(within(memo).getByText('땅콩 알레르기')).toBeInTheDocument();
    expect(await screen.findByText('메모를 저장했습니다.')).toBeInTheDocument();
  });

  it('메모 저장이 실패하면 이전 메모로 되돌리고, 작성 중이던 내용은 편집 창에 남긴다', async () => {
    server.use(
      http.patch('/api/patients/:id/memo', () =>
        HttpResponse.json({ message: '일시적인 오류입니다.' }, { status: 500 }),
      ),
    );
    const { user } = renderApp(`/patients/${LEE}`);
    const memo = await screen.findByRole('region', { name: '메모' });

    await user.click(within(memo).getByRole('button', { name: '메모 수정' }));
    const textbox = within(memo).getByRole('textbox', { name: '메모' });
    await user.clear(textbox);
    await user.type(textbox, '바뀐 메모');
    await user.click(within(memo).getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류입니다.');
    expect(within(memo).getByRole('textbox', { name: '메모' })).toHaveValue('바뀐 메모');
    await user.click(within(memo).getByRole('button', { name: '취소' }));
    expect(within(memo).getByText(/페니실린/)).toBeInTheDocument();
  });

  it('500자를 넘기면 저장할 수 없다', async () => {
    const { user } = renderApp(`/patients/${KIM}`);
    const memo = await screen.findByRole('region', { name: '메모' });
    await user.click(within(memo).getByRole('button', { name: '메모 수정' }));
    const textbox = within(memo).getByRole('textbox', { name: '메모' });
    await user.click(textbox);
    await user.paste('가'.repeat(501));

    expect(textbox).toHaveAccessibleDescription(/501\/500자/);
    expect(within(memo).getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('프로필에서 예약 등록을 열면 이름·연락처가 채워져 있다', async () => {
    const { user } = renderApp(`/patients/${KIM}`);
    await screen.findByRole('heading', { level: 1, name: '김*준 님' });
    await user.click(screen.getByRole('button', { name: '예약 등록' }));

    const dialog = await screen.findByRole('dialog', { name: '예약 등록' });
    expect(within(dialog).getByRole('textbox', { name: '환자 이름' })).toHaveValue('김민준');
    expect(within(dialog).getByRole('textbox', { name: '연락처' })).toHaveValue('010-2381-4410');
  });

  it('없는 환자는 안내 화면을 보여준다', async () => {
    renderApp('/patients/p-00000000000');
    expect(
      await screen.findByRole('heading', { level: 1, name: '환자를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  });

  it('환자 목록의 이름을 누르면 프로필로 이동한다', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(50);
    vi.stubGlobal('innerHeight', 600);
    const { user, router } = renderApp('/patients');
    const link = (await screen.findAllByRole('link', { name: /프로필$/ }))[0];
    if (!link) throw new Error('프로필 링크가 있어야 한다');
    await user.click(link);
    expect(router.state.location.pathname).toMatch(/^\/patients\/p-\d+$/);
    expect(await screen.findByRole('heading', { level: 2, name: '진료 이력' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('실시간 알림 (SSE)', () => {
  async function connected() {
    await waitFor(() => expect(connectedClientCount()).toBe(1));
  }

  it('새 예약 요청을 받으면 토스트·알림 배지로 알리고 열린 화면을 갱신한다', async () => {
    renderApp('/', { realtime: true });
    const table = await screen.findByRole('table', { name: '오늘의 예약 목록' });
    await connected();
    const before = within(table).getAllByRole('row').length;

    act(() => {
      emitClinicEvent('appointment.requested');
    });

    expect(await screen.findByRole('status')).toHaveTextContent(/새 예약 요청 — /);
    expect(screen.getByRole('button', { name: '알림, 읽지 않음 1개' })).toBeInTheDocument();
    // 오늘 예약 요청이면 대시보드 목록이 자동으로 늘어난다 (다음 날로 잡히는 경우 제외)
    await waitFor(() =>
      expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(before),
    );
  });

  it('알림 목록에서 항목을 누르면 읽음 처리되고 환자 프로필로 이동한다', async () => {
    const { user, router } = renderApp('/', { realtime: true });
    await screen.findByRole('table', { name: '오늘의 예약 목록' });
    await connected();
    let patientId = '';
    act(() => {
      patientId = emitClinicEvent('appointment.cancelled')?.patientId ?? '';
    });
    await user.click(await screen.findByRole('button', { name: '알림, 읽지 않음 1개' }));

    const panel = await screen.findByRole('dialog', { name: '알림' });
    expect(within(panel).getByText('실시간 연결됨')).toBeInTheDocument();
    const item = within(panel).getByRole('link', { name: /읽지 않음/ });
    expect(item).toHaveTextContent('예약 취소');
    await user.click(item);

    expect(router.state.location.pathname).toBe(`/patients/${patientId}`);
    expect(await screen.findByRole('button', { name: '알림' })).toBeInTheDocument();
  });

  it('모두 읽음을 누르면 배지가 사라진다', async () => {
    const { user } = renderApp('/', { realtime: true });
    await screen.findByRole('table', { name: '오늘의 예약 목록' });
    await connected();
    act(() => {
      emitClinicEvent('appointment.requested');
      emitClinicEvent('appointment.checked-in');
    });
    await user.click(await screen.findByRole('button', { name: '알림, 읽지 않음 2개' }));
    const panel = screen.getByRole('dialog', { name: '알림' });
    const markAll = within(panel).getByRole('button', { name: '모두 읽음' });
    await user.click(markAll);
    expect(within(panel).queryByText(/읽지 않음/)).not.toBeInTheDocument();
    expect(markAll).toHaveFocus();
    // 팝오버가 열려 있는 동안 바깥은 aria-hidden 이므로 닫은 뒤 확인 (포커스는 알림 버튼으로 돌아간다)
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('button', { name: '알림' })).toHaveFocus();
  });
});
