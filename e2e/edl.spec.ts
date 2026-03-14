import { test, expect } from '@playwright/test';

test.describe('Properties & EDL', () => {
  test('properties page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/properties');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('calendar page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/calendar');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
