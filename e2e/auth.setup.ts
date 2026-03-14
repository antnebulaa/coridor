import { test as setup, expect } from '@playwright/test';

const LANDLORD_EMAIL = process.env.TEST_LANDLORD_EMAIL || 'test-landlord@coridor.fr';
const LANDLORD_PASSWORD = process.env.TEST_LANDLORD_PASSWORD || 'TestPassword123!';

setup('authenticate as landlord', async ({ page }) => {
  await page.goto('/fr');

  // Open the UserMenu to access login
  await page.locator('[data-testid="user-menu-trigger"]').click();

  // Click "Connexion" in the dropdown menu
  await page.getByText('Connexion', { exact: true }).click();

  // The LoginModal opens — it uses SoftInput components with floating labels
  // SoftInput renders <input id="email"> and <input id="password"> with <label> siblings
  // Fill email field
  await page.locator('#email').fill(LANDLORD_EMAIL);

  // Fill password field
  await page.locator('#password').fill(LANDLORD_PASSWORD);

  // Click the "Continuer" submit button (actionLabel from Modal)
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Wait for successful login — dashboard redirect
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Save session state for reuse across tests
  await page.context().storageState({ path: 'e2e/.auth/landlord.json' });
});
