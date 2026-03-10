import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import {
  createRequestId,
  handleApiError,
  jsonError,
  withValidatedBody,
} from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import {
  normalizeRecipientFilters,
  selectRecipients,
} from '@/server/email/recipients';

const recipientFiltersSchema = z
  .object({
    cities: z.array(z.string().trim().min(1).max(120)).max(5_000).optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(5_000).optional(),
    segments: z.array(z.string().trim().min(1).max(80)).max(5_000).optional(),
    categories: z.array(z.string().trim().min(1).max(80)).max(5_000).optional(),
    customerIds: z.array(z.string().trim().min(1).max(80)).max(10_000).optional(),
    rawEmails: z.array(z.string().trim().email().max(254)).max(10_000).optional(),
  })
  .strict();

const previewRequestSchema = z
  .object({
    filters: recipientFiltersSchema.optional(),
  })
  .strict();

function normalizeEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
    }
    const orgId = getOrgIdFromSession(session);
    const body = await withValidatedBody(request, previewRequestSchema, {
      maxBytes: 500_000,
    });

    const filters = normalizeRecipientFilters(body.filters);
    const hasSelection =
      filters.cities.length > 0 ||
      filters.tags.length > 0 ||
      filters.segments.length > 0 ||
      filters.categories.length > 0 ||
      filters.customerIds.length > 0 ||
      filters.rawEmails.length > 0;

    if (!hasSelection) {
      return NextResponse.json({
        requestId,
        summary: {
          total: 0,
          customerRecipients: 0,
          manualEmailRecipients: 0,
          selectedCustomerCount: 0,
          selectedCustomersWithEmail: 0,
          selectedCustomersWithoutEmail: 0,
          duplicateSelectedCustomerEmails: 0,
          rawManualEmailCount: 0,
          manualEmailsMergedIntoCustomers: 0,
          cityFilterCount: 0,
          tagFilterCount: 0,
          segmentFilterCount: 0,
          categoryFilterCount: 0,
        },
        recipients: [],
      });
    }

    const recipients = await selectRecipients(orgId, filters);

    const selectedCustomers =
      filters.customerIds.length > 0
        ? await db
            .select({
              id: customers.id,
              email: customers.email,
            })
            .from(customers)
            .where(and(eq(customers.orgId, orgId), inArray(customers.id, filters.customerIds)))
        : [];

    const selectedCustomersWithEmail = selectedCustomers.filter((customer) => normalizeEmail(customer.email));
    const uniqueSelectedCustomerEmails = new Set(
      selectedCustomersWithEmail.map((customer) => normalizeEmail(customer.email))
    );
    const customerRecipientEmails = new Set(
      recipients
        .filter((recipient) => recipient.recipientSource === 'customer')
        .map((recipient) => normalizeEmail(recipient.email))
    );

    const manualEmailsMergedIntoCustomers = filters.rawEmails.filter((email) =>
      customerRecipientEmails.has(normalizeEmail(email))
    ).length;

    return NextResponse.json({
      requestId,
      summary: {
        total: recipients.length,
        customerRecipients: recipients.filter((recipient) => recipient.recipientSource === 'customer').length,
        manualEmailRecipients: recipients.filter((recipient) => recipient.recipientSource === 'manual_email').length,
        selectedCustomerCount: filters.customerIds.length,
        selectedCustomersWithEmail: selectedCustomersWithEmail.length,
        selectedCustomersWithoutEmail: Math.max(
          0,
          filters.customerIds.length - selectedCustomersWithEmail.length
        ),
        duplicateSelectedCustomerEmails: Math.max(
          0,
          selectedCustomersWithEmail.length - uniqueSelectedCustomerEmails.size
        ),
        rawManualEmailCount: filters.rawEmails.length,
        manualEmailsMergedIntoCustomers,
        cityFilterCount: filters.cities.length,
        tagFilterCount: filters.tags.length,
        segmentFilterCount: filters.segments.length,
        categoryFilterCount: filters.categories.length,
      },
      recipients: recipients.map((recipient) => ({
        id: recipient.customerId || `manual:${recipient.email}`,
        customerId: recipient.customerId,
        recipientSource: recipient.recipientSource,
        email: recipient.email,
        displayName: recipient.displayName,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        company: recipient.company,
        city: recipient.city,
        phone: recipient.phone,
        mobile: recipient.mobile,
      })),
    });
  } catch (error) {
    return handleApiError('recipients:preview:post', error, requestId, {
      message: 'Failed to preview recipients',
    });
  }
}
