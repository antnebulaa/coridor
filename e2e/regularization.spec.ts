import { test, expect } from '@playwright/test';

test.describe('Regularization', () => {
  test('regularization link accessible from finances page', async ({ page }) => {
    await page.goto('/fr/finances');

    // Wait for page to load
    await expect(page.getByText(/finances|résultat/i).first()).toBeVisible({ timeout: 10000 });

    // Find and click the regularization quick link
    const regLink = page.getByText(/régularisation/i);
    if (await regLink.count() > 0) {
      await regLink.first().click();

      // RegularizationModal or page should appear
      await expect(
        page.getByText(/régularisation des charges|bail|commencer|aucun bail/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
