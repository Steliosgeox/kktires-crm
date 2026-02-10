import { getWorkerId } from '@/server/email/job-queue';
import { processDueEmailJobs } from '@/server/email/process-jobs';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const workerId = getWorkerId();

  const pollMs = Number.parseInt(process.env.EMAIL_WORKER_POLL_MS || '5000', 10);
  const once = process.argv.includes('--once') || process.env.EMAIL_WORKER_ONCE === 'true';

  console.log(`[email-worker] started workerId=${workerId} pollMs=${pollMs} once=${once}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await processDueEmailJobs({
        workerId,
        timeBudgetMs: Number.parseInt(process.env.EMAIL_WORKER_TIME_BUDGET_MS || '25000', 10),
        maxJobs: Number.parseInt(process.env.EMAIL_WORKER_MAX_JOBS || '20', 10),
      });

      const didWork = result.claimed > 0;
      if (didWork) {
        console.log(
          `[email-worker] tick claimed=${result.claimed} processedJobs=${result.processedJobs} items=${result.processedItems} sent=${result.sent} failed=${result.failed} elapsedMs=${result.elapsedMs}`
        );
      } else {
        if (once) break;
        await sleep(Number.isFinite(pollMs) ? pollMs : 5000);
      }
    } catch (error) {
      console.error('[email-worker] tick error:', error);
      await sleep(2000);
    }
  }

  console.log('[email-worker] exiting');
}

main().catch((err) => {
  console.error('[email-worker] fatal:', err);
  process.exit(1);
});
