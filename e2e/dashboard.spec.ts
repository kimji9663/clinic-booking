import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
// 등록된 모든 고객사를 자동으로 검사 (새 고객사를 추가해도 이 파일은 바꾸지 않는다)
import { brandIds } from '../packages/theme/src/tokens';

const pages = [
  { path: '/', heading: '오늘의 예약' },
  { path: '/appointments', heading: '예약 관리' },
  { path: '/schedule', heading: '진료 일정' },
  { path: '/patients', heading: '환자' },
  // 시드 대표 환자 이하준(010-3348-9021)의 프로필
  { path: '/patients/p-01033489021', heading: '이*준 님' },
] as const;

// 실시간 알림의 자동 이벤트(20~40초 간격)가 테스트 도중 데이터를 바꾸지 않도록 끈다.
// 알림 테스트는 POST /api/dev/events 로 이벤트를 직접 발생시킨다.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('clinic-booking:event-simulation', 'off');
  });
});

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('예약 대시보드', () => {
  test('첫 Tab 은 본문 바로가기 링크다', async ({ page, browserName }) => {
    // WebKit(Safari)은 기본 설정에서 Tab 키가 링크로 이동하지 않는다
    test.skip(browserName === 'webkit', 'Safari 기본 Tab 동작은 링크를 건너뜀');
    await page.goto('/');
    // 목업 API(MSW) 시작 후 앱이 그려질 때까지 기다린 뒤 Tab
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '본문 바로가기' })).toBeFocused();
  });

  test('목업 API 로 오늘 예약을 불러온다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '오늘의 예약' })).toBeVisible();
    await expect(page.getByText('김*준').first()).toBeVisible();
  });
});

test.describe('예약 등록', () => {
  test('폼을 작성해 예약을 등록하면 목록에 나타난다', async ({ page }) => {
    await page.goto('/appointments');
    await page.getByRole('button', { name: '예약 등록' }).click();
    const dialog = page.getByRole('dialog', { name: '예약 등록' });

    await dialog.getByRole('combobox', { name: '환자 이름' }).fill('홍길동');
    await dialog.getByRole('textbox', { name: '연락처' }).fill('01055556666');
    await expect(dialog.getByRole('textbox', { name: '연락처' })).toHaveValue('010-5555-6666');
    await dialog.getByRole('combobox', { name: '담당의' }).click();
    await page.getByRole('option', { name: '정도윤 원장' }).click();
    await dialog.getByRole('combobox', { name: '시간' }).click();
    await page.getByRole('option', { name: '16:00' }).click();
    await dialog.getByRole('button', { name: '등록' }).click();

    await expect(page.getByRole('status')).toContainText('홍*동 님의 예약이 등록되었습니다.');
    await expect(page.getByText('홍*동').first()).toBeVisible();
  });

  test('기존 환자를 자동완성에서 키보드로 골라 이름·연락처를 채운다', async ({
    page,
    browserName,
  }) => {
    await page.goto('/appointments');
    await page.getByRole('button', { name: '예약 등록' }).click();
    const dialog = page.getByRole('dialog', { name: '예약 등록' });
    const name = dialog.getByRole('combobox', { name: '환자 이름' });

    await name.pressSequentially('9021'); // 연락처 뒷자리로 검색
    const listbox = dialog.getByRole('listbox', { name: '환자 이름 추천' });
    await expect(listbox.getByRole('option')).toHaveCount(1);
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    // 목록이 열린 상태(대화상자 안)도 접근성 규칙 검사
    if (browserName !== 'firefox') await expectNoA11yViolations(page);

    await page.keyboard.press('ArrowDown');
    await expect(name).toHaveAttribute('aria-activedescendant', /.+/);
    await page.keyboard.press('Enter');

    await expect(name).toHaveValue('이하준');
    await expect(dialog.getByRole('textbox', { name: '연락처' })).toHaveValue('010-3348-9021');
    await expect(listbox).toBeHidden();
    // Esc 는 목록이 닫힌 뒤에야 대화상자를 닫는다
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('환자 목록 (가상화 + 무한 스크롤)', () => {
  test('페이지를 스크롤하면 150명까지 이어서 불러오고, DOM 에는 일부 행만 있다', async ({
    page,
  }) => {
    await page.goto('/patients');
    const table = page.locator('main');
    const status = page.getByRole('status').filter({ hasText: '전체 150건' });
    await expect(status).toHaveText('전체 150건 중 30건 표시');

    // 페이지 전체 스크롤: 키보드 End 키로 문서 끝까지 이동할 때마다 다음 페이지를 불러온다
    await expect(async () => {
      await page.keyboard.press('End');
      await expect(status).toHaveText('전체 150건 중 150건 표시', { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // 마지막 페이지가 붙은 뒤 끝으로 이동하면 150번째 항목이 보인다
    // (데스크톱은 표 행, 모바일은 카드 목록 — 둘 다 data-index 를 가진다)
    // 카드 높이는 그려진 뒤 실측해 보정되므로 전체 높이가 바뀔 수 있다 → 끝에 닿을 때까지 반복
    // (모바일 WebKit 은 End 키 스크롤이 문서 끝에 못 미칠 때가 있어 직접 끝으로 이동도 함께 한다)
    await expect(async () => {
      await page.keyboard.press('End');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(table.locator('[data-index="149"]')).toBeInViewport({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    expect(await table.locator('[data-index]').count()).toBeLessThan(60);
  });
});

test.describe('환자 프로필', () => {
  test('목록에서 프로필로 이동해 메모를 수정하면 새로고침 후에도 유지된다', async ({ page }) => {
    await page.goto('/patients');
    const link = page.getByRole('link', { name: /프로필$/ }).first();
    const name = (await link.textContent()) ?? '';
    await link.click();
    await expect(page.getByRole('heading', { level: 1, name: `${name} 님` })).toBeVisible();

    const memo = page.getByRole('region', { name: '메모' });
    await memo.getByRole('button', { name: '메모 수정' }).click();
    await memo.getByRole('textbox', { name: '메모' }).fill('E2E 메모: 오후 진료 선호');
    await memo.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('status')).toContainText('메모를 저장했습니다.');

    await page.reload();
    await expect(page.getByRole('region', { name: '메모' })).toContainText(
      'E2E 메모: 오후 진료 선호',
    );
  });
});

test.describe('실시간 알림 (SSE)', () => {
  test('서버 이벤트를 받으면 토스트·배지로 알리고, 알림을 누르면 환자 프로필로 이동한다', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '오늘의 예약' })).toBeVisible();

    // 연결 상태 확인
    const bell = page.getByRole('button', { name: /^알림/ });
    await bell.click();
    const panel = page.getByRole('dialog', { name: '알림' });
    await expect(panel.getByText('실시간 연결됨')).toBeVisible();
    await expect(panel.getByText('새 알림이 없습니다.')).toBeVisible();
    if (browserName !== 'firefox') await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    // 서버에서 이벤트 발생 (목업 전용 엔드포인트)
    const event = await page.evaluate(async () => {
      const response = await fetch('/api/dev/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'appointment.requested' }),
      });
      return (await response.json()) as { patientId: string };
    });

    await expect(page.getByRole('status')).toContainText('새 예약 요청');
    await expect(page.getByRole('button', { name: '알림, 읽지 않음 1개' })).toBeVisible();

    await page.getByRole('button', { name: '알림, 읽지 않음 1개' }).click();
    await page.getByRole('dialog', { name: '알림' }).getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/patients/${event.patientId}$`));
    await expect(page.getByRole('heading', { level: 2, name: '진료 이력' })).toBeVisible();
    await expect(page.getByRole('button', { name: '알림' })).toBeVisible();
  });
});

test.describe('접근성 (axe, WCAG 2 A/AA)', () => {
  for (const brand of brandIds) {
    for (const mode of ['light', 'dark'] as const) {
      test(`${brand} / ${mode} — 모든 페이지 위반 0건`, async ({ page, browserName }) => {
        // Playwright Firefox 빌드에서 서비스 워커(MSW)가 제어하는 페이지에 axe 를 실행하면
        // 페이지 프로세스가 크래시한다 (서비스 워커 차단 시 정상). 앱이 아닌 실행 환경 문제로 판단해
        // Firefox 는 기능 테스트만 실행하고, 접근성 규칙은 Chromium·WebKit·모바일에서 검사한다.
        test.fixme(
          browserName === 'firefox',
          'Firefox + MSW 서비스 워커 + axe 조합에서 페이지 크래시',
        );
        await page.emulateMedia({ colorScheme: mode });
        for (const { path, heading } of pages) {
          await page.goto(`${path}?brand=${brand}`);
          await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
          // 데이터 로딩(스켈레톤)이 끝난 화면을 검사
          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
          await expectNoA11yViolations(page);
        }
      });
    }
  }
});
