import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const brandIds = ['sky-pediatrics', 'barun-dental', 'ongyeol-derma'] as const;
const pages = [
  { path: '/', heading: '오늘의 예약' },
  { path: '/appointments', heading: '예약 관리' },
  { path: '/schedule', heading: '진료 일정' },
  { path: '/patients', heading: '환자' },
] as const;

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

    await dialog.getByRole('textbox', { name: '환자 이름' }).fill('홍길동');
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

    // 마지막 페이지가 붙은 뒤 한 번 더 끝으로 이동하면 150번째 항목이 보인다
    // (데스크톱은 표 행, 모바일은 카드 목록 — 둘 다 data-index 를 가진다)
    await page.keyboard.press('End');
    await expect(table.locator('[data-index="149"]')).toBeInViewport();
    expect(await table.locator('[data-index]').count()).toBeLessThan(60);
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
