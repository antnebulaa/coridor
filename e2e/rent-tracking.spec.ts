import { test, expect } from '@playwright/test';

test.describe('Rent Tracking', () => {
  test('suivi-loyers page loads with monthly view', async ({ page }) => {
    await page.goto('/fr/finances/suivi-loyers');

    // Page should show rent tracking content or empty state
    await expect(
      page.getByText(/encaissé|loyer|suivi|aucun/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('no JS errors on rent tracking page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/finances/suivi-loyers');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
