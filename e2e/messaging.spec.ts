import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test('inbox loads conversations or empty state', async ({ page }) => {
    await page.goto('/fr/inbox');

    // Either conversations list loads or empty state shows
    await expect(
      page.getByText(/message|conversation|aucun|boîte de réception/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('no JS errors on inbox', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/inbox');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
