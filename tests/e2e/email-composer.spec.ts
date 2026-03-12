import { expect, test } from '@playwright/test';

test('email composer refactor keeps template, variable, preview, and schedule flows healthy', async ({
  page,
}) => {
  const seed = Date.now().toString();
  const previewEmail = `composer-${seed}@example.com`;

  const templateRes = await page.request.post('/api/templates', {
    data: {
      name: `Template-${seed}`,
      subject: `Template Subject ${seed}`,
      content: `<p>Template Body ${seed}</p><script>window.__unsafe = true;</script>`,
      category: 'general',
    },
  });
  expect(templateRes.status()).toBe(201);
  const template = await templateRes.json();

  const campaignRes = await page.request.post('/api/campaigns', {
    data: {
      name: `Composer Campaign ${seed}`,
      subject: `Original Subject ${seed}`,
      content: `<p>Original Body ${seed}</p>`,
      recipientFilters: { rawEmails: [previewEmail] },
    },
  });
  expect(campaignRes.status()).toBe(201);
  const campaign = await campaignRes.json();

  await page.goto('/email');
  await page.waitForLoadState('networkidle');

  await page.getByText(campaign.name, { exact: false }).click();
  await expect(page.getByTestId('campaign-name-input')).toHaveValue(campaign.name);

  await page.getByTestId('templates-popover-button').click();
  await page.getByTestId(`template-option-${template.id}`).click();
  await expect(page.getByTestId('subject-input')).toHaveValue(template.subject);

  await page.locator('.ck-editor__editable').click();
  await page.getByTestId('variables-popover-button').click();
  await page.getByRole('button', { name: /First Name/i }).click();

  await page.getByTestId('preview-toggle-button').click();
  const previewFrame = page.frameLocator('[data-testid="outlook-preview-pane"]');
  await expect(previewFrame.locator('body')).toContainText(`Template Body ${seed}`);
  await expect(previewFrame.locator('body')).toContainText('{{firstName}}');
  await expect(previewFrame.locator('script')).toHaveCount(0);

  await page.getByTestId('toggle-schedule-button').click();
  await expect(page.getByTestId('schedule-date-input')).toBeVisible();
  await expect(page.getByTestId('schedule-time-input')).toBeVisible();

  await page.getByTestId('schedule-date-input').fill('2026-03-20');
  await page.getByTestId('schedule-time-input').fill('09:30');
  await page.getByTestId('schedule-submit-button').click();

  await page.waitForResponse(
    (response) =>
      response.url().includes(`/api/campaigns/${campaign.id}`) && response.request().method() === 'PUT'
  );
});
