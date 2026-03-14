import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('desktop navigation via UserMenu works', async ({ page }) => {
    await page.goto('/fr/dashboard');
    await expect(page.getByText(/Bonjour/i)).toBeVisible({ timeout: 10000 });

    // Navigate to properties via UserMenu dropdown
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.getByText('Annonces').click();
    await expect(page).toHaveURL(/properties/);

    // Navigate to finances
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.getByText('Finances').click();
    await expect(page).toHaveURL(/finances/);

    // Navigate to calendar
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.getByText('Agenda').click();
    await expect(page).toHaveURL(/calendar/);

    // Navigate to inbox
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.getByText('Messages').click();
    await expect(page).toHaveURL(/inbox/);

    // Back to dashboard
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await page.getByText('Activités').click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('mobile bottom nav works', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/fr/dashboard');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('#bottom-nav');

    // Navigate to Finances via bottom nav (landlord mode)
    await bottomNav.getByText('Finances').click();
    await expect(page).toHaveURL(/finances/);

    // Navigate to Messages
    await bottomNav.getByText('Messages').click();
    await expect(page).toHaveURL(/inbox/);

    // Navigate back to Activites (dashboard)
    await bottomNav.getByText('Activités').click();
    await expect(page).toHaveURL(/dashboard/);
  });
});
