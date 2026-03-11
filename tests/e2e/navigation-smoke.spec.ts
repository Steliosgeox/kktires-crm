import { expect, test } from '@playwright/test';

function filterCriticalConsoleErrors(errors: string[]) {
  return errors.filter(
    (error) =>
      !error.includes('favicon') &&
      !error.includes('manifest') &&
      !error.includes('[Google Maps]')
  );
}

test('authenticated navigation across core dashboard pages stays healthy', async ({ page }) => {
  const errors: string[] = [];
  const appMain = page.locator('main').first();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  const routes = [
    { label: 'Πελάτες', path: '/customers' },
    { label: 'Δυνητικοί', path: '/leads' },
    { label: 'Email Marketing', path: '/email' },
    { label: 'Στατιστικά', path: '/statistics' },
    { label: 'Ρυθμίσεις', path: '/settings' },
  ];

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(appMain).toBeVisible();

  for (const route of routes) {
    await page.getByRole('link', { name: route.label, exact: true }).click();
    await page.waitForURL(`**${route.path}**`);
    await page.waitForLoadState('networkidle');
    await expect(appMain).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  }

  expect(filterCriticalConsoleErrors(errors)).toHaveLength(0);
});

test('draft campaigns show live recipient preview in the email page', async ({ page }) => {
  const seed = Date.now().toString();
  const previewEmail = `preview-${seed}@example.com`;
  const campaignName = `UI Campaign ${seed}`;

  const createCampaignRes = await page.request.post('/api/campaigns', {
    data: {
      name: campaignName,
      subject: `Subject ${seed}`,
      content: `<p>Body ${seed}</p>`,
      recipientFilters: {
        rawEmails: [previewEmail],
      },
    },
  });

  expect(createCampaignRes.status()).toBe(201);

  await page.goto('/email');
  await page.waitForLoadState('networkidle');

  await page.getByText(campaignName, { exact: false }).click();
  await expect(page.getByRole('button', { name: /1 παραλήπτες/ })).toBeVisible();

  await page.getByRole('button', { name: /1 παραλήπτες/ }).click();

  await expect(page.getByText('Παραλήπτες')).toBeVisible();
  await expect(page.getByText(previewEmail)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Αντιγραφή' })).toBeVisible();
});
