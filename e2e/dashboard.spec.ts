import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const brandIds = ['sky-pediatrics', 'barun-dental', 'ongyeol-derma'] as const;

test.describe('예약 대시보드', () => {
  test('첫 Tab 은 본문 바로가기 링크다', async ({ page, browserName }) => {
    // WebKit(Safari)은 기본 설정에서 Tab 키가 링크로 이동하지 않는다
    test.skip(browserName === 'webkit', 'Safari 기본 Tab 동작은 링크를 건너뜀');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '본문 바로가기' })).toBeFocused();
  });

  test('예약 목록이 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '오늘의 예약' })).toBeVisible();
    await expect(page.getByText('김*준').first()).toBeVisible();
  });

  for (const brand of brandIds) {
    test(`${brand} 테마에 접근성 위반이 없다 (axe)`, async ({ page }) => {
      await page.goto(`/?brand=${brand}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
