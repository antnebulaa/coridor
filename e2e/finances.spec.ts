import { test, expect } from '@playwright/test';

test.describe('Finances', () => {
  test('page loads with net result and sections', async ({ page }) => {
    await page.goto('/fr/finances');

    // NetResultCard or header should be visible
    await expect(page.getByText(/résultat net|encaissé|finances/i).first()).toBeVisible({ timeout: 10000 });

    // Quick links section should show key actions
    await expect(page.getByText(/quittances/i)).toBeVisible();
    await expect(page.getByText(/dépenses/i)).toBeVisible();
  });

  test('no JS errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/finances');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
