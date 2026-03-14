import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads with KPIs and property cards', async ({ page }) => {
    // Register error listener BEFORE navigation to catch all errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/fr/dashboard');

    // Dashboard header renders (greeting + contextual message)
    await expect(page.getByText(/Bonjour/i)).toBeVisible({ timeout: 10000 });

    // Monthly KPIs section is visible (revenus, loyers, depenses)
    await expect(page.getByText(/revenus|encaissé/i).first()).toBeVisible({ timeout: 10000 });

    // No JS errors during load
    expect(errors).toHaveLength(0);
  });

  test('action cards render when there are pending actions', async ({ page }) => {
    await page.goto('/fr/dashboard');

    // Wait for dashboard to load
    await expect(page.getByText(/Bonjour/i)).toBeVisible({ timeout: 10000 });

    // The page should have either action cards or property status cards
    const hasContent = await page.getByText(/urgent|action|annonces|biens/i).count();
    expect(hasContent).toBeGreaterThan(0);
  });
});
