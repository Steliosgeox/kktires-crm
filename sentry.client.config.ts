import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: 0.1,
  
  // Capture Replay for 10% of all sessions,
  replaysSessionSampleRate: 0.1,
  
  // plus for 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Ignore common benign errors
  ignoreErrors: [
    'ResizeObserver loop',
    'ResizeObserver loop completed',
    'Non-Error promise rejection',
    /Loading chunk \d+ failed/,
  ],
});

