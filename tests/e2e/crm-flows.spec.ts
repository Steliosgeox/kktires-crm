import { expect, test } from '@playwright/test';

test('session remains authenticated after navigation and reload', async ({ page }) => {
  const profileBefore = await page.request.get('/api/settings/profile');
  expect(profileBefore.status()).toBe(200);
  const beforePayload = await profileBefore.json();
  expect(beforePayload.email).toBe('test@example.com');

  await page.goto('/settings?section=profile');
  await page.reload();

  const profileAfter = await page.request.get('/api/settings/profile');
  expect(profileAfter.status()).toBe(200);
  const afterPayload = await profileAfter.json();
  expect(afterPayload.email).toBe('test@example.com');
});

test('customer create-update-delete lifecycle works via API', async ({ page }) => {
  const seed = Date.now().toString();
  const createRes = await page.request.post('/api/customers', {
    data: {
      firstName: `E2E-${seed}`,
      email: `e2e-${seed}@example.com`,
      city: 'Athens',
    },
  });
  expect(createRes.status()).toBe(201);
  const created = await createRes.json();
  const customerId = created.id as string;

  const updateRes = await page.request.put(`/api/customers/${customerId}`, {
    data: { city: 'Thessaloniki', isVip: true },
  });
  expect(updateRes.status()).toBe(200);
  const updated = await updateRes.json();
  expect(updated.city).toBe('Thessaloniki');
  expect(updated.isVip).toBe(true);

  const deleteRes = await page.request.delete(`/api/customers/${customerId}`);
  expect(deleteRes.status()).toBe(200);

  const getDeletedRes = await page.request.get(`/api/customers/${customerId}`);
  expect(getDeletedRes.status()).toBe(404);
});

test('lead conversion creates customer and marks lead as converted', async ({ page }) => {
  const seed = Date.now().toString();
  const createLeadRes = await page.request.post('/api/leads', {
    data: {
      firstName: `Lead-${seed}`,
      email: `lead-${seed}@example.com`,
      source: 'manual',
    },
  });
  expect(createLeadRes.status()).toBe(201);
  const lead = await createLeadRes.json();
  const leadId = lead.id as string;

  const convertRes = await page.request.post(`/api/leads/${leadId}/convert`);
  expect(convertRes.status()).toBe(200);
  const convertPayload = await convertRes.json();
  expect(convertPayload.ok).toBe(true);
  expect(typeof convertPayload.customerId).toBe('string');

  const customerRes = await page.request.get(`/api/customers/${convertPayload.customerId}`);
  expect(customerRes.status()).toBe(200);
  const customer = await customerRes.json();
  expect(customer.firstName).toBe(`Lead-${seed}`);
});

test('campaign draft-save-schedule send flow works', async ({ page }) => {
  const seed = Date.now().toString();
  const createCampaignRes = await page.request.post('/api/campaigns', {
    data: {
      name: `Campaign-${seed}`,
      subject: `Subject-${seed}`,
      content: `<p>Body ${seed}</p>`,
      recipientFilters: { cities: [] },
    },
  });
  expect(createCampaignRes.status()).toBe(201);
  const campaign = await createCampaignRes.json();
  const campaignId = campaign.id as string;

  const scheduledAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const updateCampaignRes = await page.request.put(`/api/campaigns/${campaignId}`, {
    data: {
      status: 'scheduled',
      scheduledAt,
      name: `Campaign-${seed}-updated`,
    },
  });
  expect(updateCampaignRes.status()).toBe(200);
  const updated = await updateCampaignRes.json();
  expect(updated.status).toBe('scheduled');

  const sendRes = await page.request.post(`/api/campaigns/${campaignId}/send`, {
    data: { runAt: scheduledAt },
  });
  expect(sendRes.status()).toBe(200);
  const sendPayload = await sendRes.json();
  expect(sendPayload.success).toBe(true);
  expect(typeof sendPayload.jobId).toBe('string');
});

test('direct email send returns actionable SMTP failure details when transport cannot connect', async ({ page }) => {
  const sendRes = await page.request.post('/api/email/send', {
    data: {
      to: 'receiver@example.com',
      subject: 'SMTP connectivity test',
      content: '<p>test</p>',
      html: true,
    },
  });

  expect(sendRes.status()).toBe(502);
  const payload = await sendRes.json();
  expect(payload.code).toBe('SMTP_SEND_FAILED');
  expect(typeof payload.error).toBe('string');
  expect(payload.error.length).toBeGreaterThan(0);
  expect(typeof payload.requestId).toBe('string');
});

test('export download neutralizes spreadsheet formulas', async ({ page }) => {
  const seed = Date.now().toString();
  const createRes = await page.request.post('/api/customers', {
    data: {
      firstName: '=SUM(1,1)',
      email: `formula-${seed}@example.com`,
    },
  });
  expect(createRes.status()).toBe(201);

  const exportRes = await page.request.post('/api/customers/export', {
    data: {
      fields: ['firstName', 'email'],
      format: 'csv',
      filter: 'all',
    },
  });
  expect(exportRes.status()).toBe(200);
  expect(exportRes.headers()['content-type']).toContain('text/csv');

  const csv = await exportRes.text();
  expect(csv).toContain('\'=SUM(1,1)');
});
