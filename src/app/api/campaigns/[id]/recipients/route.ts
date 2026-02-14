import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { campaignRecipients, customers, emailCampaigns } from '@/lib/db/schema';
import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

/**
 * GET /api/campaigns/[id]/recipients
 *
 * Returns per-recipient delivery status for a campaign.
 * Query params:
 *   ?status=failed   — filter to only failed recipients
 *   ?status=sent     — filter to only successful ones
 *   ?limit=50        — max recipients to return (default 100)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const requestId = createRequestId();
    try {
        const session = await requireSession();
        if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
        const orgId = getOrgIdFromSession(session);

        const { id: campaignId } = await params;
        const url = new URL(request.url);
        const statusFilter = url.searchParams.get('status');
        const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));

        // Verify campaign belongs to org
        const campaign = await db.query.emailCampaigns.findFirst({
            where: (c, { eq: whereEq, and: whereAnd }) => whereAnd(whereEq(c.id, campaignId), whereEq(c.orgId, orgId)),
        });

        if (!campaign) {
            return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
        }

        // Get summary breakdown
        const breakdownRows = await db
            .select({
                status: campaignRecipients.status,
                count: sql<number>`count(*)`,
            })
            .from(campaignRecipients)
            .where(eq(campaignRecipients.campaignId, campaignId))
            .groupBy(campaignRecipients.status);

        const summary: Record<string, number> = { total: 0, sent: 0, failed: 0, pending: 0, bounced: 0 };
        for (const row of breakdownRows) {
            const status = String(row.status);
            const count = Number(row.count);
            summary[status] = count;
            summary.total += count;
        }

        // Build recipients query
        const conditions = [eq(campaignRecipients.campaignId, campaignId)];
        if (statusFilter && ['sent', 'failed', 'pending', 'bounced'].includes(statusFilter)) {
            conditions.push(eq(campaignRecipients.status, statusFilter));
        }

        const recipients = await db
            .select({
                id: campaignRecipients.id,
                email: campaignRecipients.email,
                status: campaignRecipients.status,
                errorMessage: campaignRecipients.errorMessage,
                sentAt: campaignRecipients.sentAt,
                customerId: campaignRecipients.customerId,
                firstName: customers.firstName,
                lastName: customers.lastName,
                company: customers.company,
            })
            .from(campaignRecipients)
            .leftJoin(customers, eq(customers.id, campaignRecipients.customerId))
            .where(and(...conditions))
            .limit(limit);

        return NextResponse.json({
            campaignId,
            campaignName: campaign.name,
            campaignStatus: campaign.status,
            summary,
            recipients,
            requestId,
        });
    } catch (error) {
        return handleApiError('campaigns:id:recipients:get', error, requestId, {
            message: 'Failed to fetch campaign recipients',
        });
    }
}
