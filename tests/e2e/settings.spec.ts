import { test, expect } from '@playwright/test';

test('settings profile name persists after save + reload', async ({ page }) => {
  await page.goto('/settings?section=profile');

  const nameInput = page.getByLabel('Όνομα');
  await expect(nameInput).toBeVisible();

  await nameInput.fill('E2E Name');
  await page.getByRole('button', { name: 'Αποθήκευση' }).click();

  // Toast success title
  await expect(page.getByText('Αποθηκεύτηκε')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Όνομα')).toHaveValue('E2E Name');
});

