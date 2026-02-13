-- Auth.js / NextAuth uses millisecond timestamps for its core tables.
-- Earlier versions of this repo used seconds (`mode: 'timestamp'`) which makes
-- Email magic-link tokens look expired immediately.
--
-- This migration normalizes existing rows by converting second-based values to ms.

-- Heuristic: anything < 1e12 is almost certainly seconds since epoch.
UPDATE `sessions`
SET `expires` = `expires` * 1000
WHERE `expires` < 1000000000000;
--> statement-breakpoint

UPDATE `verification_tokens`
SET `expires` = `expires` * 1000
WHERE `expires` < 1000000000000;
--> statement-breakpoint

UPDATE `users`
SET `emailVerified` = `emailVerified` * 1000
WHERE `emailVerified` IS NOT NULL
  AND `emailVerified` < 1000000000000;
