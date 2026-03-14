import { test, expect } from '@playwright/test';

test.describe('Create Listing', () => {
  test('rent modal opens from navbar', async ({ page }) => {
    await page.goto('/fr/dashboard');
    await expect(page.getByText(/Bonjour/i)).toBeVisible({ timeout: 10000 });

    // Click "Louer mon bien" in the navbar (desktop)
    await page.getByText('Louer mon bien').click();

    // RentModal should open — it is a multi-step flow
    // First step typically asks about the property category
    await expect(page.getByText(/type de logement|catégorie|votre logement/i)).toBeVisible({ timeout: 5000 });
  });

  test('properties page loads with add button', async ({ page }) => {
    await page.goto('/fr/properties');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // The page should show properties or an empty state with a CTA
    const hasContent = await page.getByText(/annonces|biens|ajouter|louer/i).count();
    expect(hasContent).toBeGreaterThan(0);
  });
});
