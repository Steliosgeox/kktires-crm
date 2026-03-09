import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { campaignRecipients, emailCampaigns, emailJobs, emailJobItems } from '@/lib/db/schema';
import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { ensureEmailTransportReady } from '@/server/email/transport';

/**
 * POST /api/campaigns/[id]/retry
 *
 * Retries sending to only the failed recipients of a campaign.
 * Creates a new email job that targets just the failed recipients.
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const requestId = createRequestId();
    try {
        const session = await requireSession();
        if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
        const orgId = getOrgIdFromSession(session);

        const { id: campaignId } = await params;

        // Verify campaign belongs to org
        const campaign = await db.query.emailCampaigns.findFirst({
            where: (c, { eq: whereEq, and: whereAnd }) => whereAnd(whereEq(c.id, campaignId), whereEq(c.orgId, orgId)),
        });

        if (!campaign) {
            return jsonError('Campaign not found', 404, 'NOT_FOUND', requestId);
        }

        // Check SMTP readiness
        const transport = ensureEmailTransportReady();
        if (!transport.ok) {
            return jsonError(transport.errorMessage, 503, 'INTERNAL_ERROR', requestId);
        }

        // Find failed recipients
        const failedRecipients = await db
            .select({ id: campaignRecipients.id, email: campaignRecipients.email })
            .from(campaignRecipients)
            .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'failed')));

        if (failedRecipients.length === 0) {
            return NextResponse.json({
                message: 'No failed recipients to retry',
                failedCount: 0,
                requestId,
            });
        }

        // Guard: do not create a second job if one is already active
        const activeJob = await db.query.emailJobs.findFirst({
            where: (j, { and: wa, eq: we, inArray: wi }) =>
                wa(we(j.campaignId, campaignId), wi(j.status, ['queued', 'processing'])),
        });
        if (activeJob) {
            return NextResponse.json({
                message: 'A job is already active for this campaign',
                jobId: activeJob.id,
                failedCount: failedRecipients.length,
                requestId,
            });
        }

        const now = new Date();

        // Reset failed recipients to pending
        await db
            .update(campaignRecipients)
            .set({
                status: 'pending',
                errorMessage: null,
                sentAt: null,
            })
            .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'failed')));

        // Create a new email job for the retry
        const jobId = `job_${nanoid()}`;
        await db.insert(emailJobs).values({
            id: jobId,
            orgId,
            campaignId,
            senderUserId: session.user.id,
            status: 'queued',
            runAt: now,
            attempts: 0,
            maxAttempts: 3,
            lockedAt: null,
            lockedBy: null,
            startedAt: null,
            completedAt: null,
            lastError: null,
            createdAt: now,
            updatedAt: now,
        });

        // Batch insert job items (100 per chunk to stay within SQLite param limits)
        const itemRows = failedRecipients.map((recipient) => ({
            id: `ji_${nanoid()}`,
            jobId,
            campaignId,
            recipientId: recipient.id,
            status: 'pending' as const,
            sentAt: null,
            errorMessage: null,
            createdAt: now,
            updatedAt: now,
        }));

        await db.transaction(async (tx) => {
            for (let i = 0; i < itemRows.length; i += 100) {
                await tx.insert(emailJobItems).values(itemRows.slice(i, i + 100));
            }
        });

        // Set campaign status back to 'sending' so the cron picks it up
        await db
            .update(emailCampaigns)
            .set({ status: 'sending', updatedAt: now })
            .where(eq(emailCampaigns.id, campaignId));

        return NextResponse.json({
            message: `Retrying ${failedRecipients.length} failed recipients`,
            jobId,
            failedCount: failedRecipients.length,
            recipients: failedRecipients.map(r => r.email),
            requestId,
        });
    } catch (error) {
        return handleApiError('campaigns:id:retry:post', error, requestId, {
            message: 'Failed to retry campaign recipients',
        });
    }
}
