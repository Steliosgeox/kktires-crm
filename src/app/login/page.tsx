'use client';

import { signIn } from 'next-auth/react';
import { Suspense } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

function LoginContent() {
  const [error] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('error');
  });
  const callbackUrl = '/';
  const [email, setEmail] = useState('');
  const prefersReducedMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#14151a] to-[#1a1b23]">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

      <m.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <m.div
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 mb-4"
            >
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </m.div>
            <h1 className="text-2xl font-bold text-white mb-2">KK Tires CRM</h1>
            <p className="text-white/60">Î£Ï…Î½Î´ÎµÎ¸ÎµÎ¯Ï„Îµ Î¼Îµ Ï„Î¿ Google Î»Î¿Î³Î±ÏÎ¹Î±ÏƒÎ¼ÏŒ ÏƒÎ±Ï‚</p>
          </div>

          {/* Error message */}
          {error && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error === 'AccessDenied' && (
                <>
                  <strong className="block mb-1">Î”ÎµÎ½ ÎµÏ€Î¹Ï„ÏÎ­Ï€ÎµÏ„Î±Î¹ Î· Ï€ÏÏŒÏƒÎ²Î±ÏƒÎ·</strong>
                  ÎœÏŒÎ½Î¿ Î¿Î¹ ÎµÎ¾Î¿Ï…ÏƒÎ¹Î¿Î´Î¿Ï„Î·Î¼Î­Î½Î¿Î¹ Ï‡ÏÎ®ÏƒÏ„ÎµÏ‚ Î¼Ï€Î¿ÏÎ¿ÏÎ½ Î½Î± ÏƒÏ…Î½Î´ÎµÎ¸Î¿ÏÎ½.
                </>
              )}
              {error === 'OAuthCallback' && (
                <>
                  <strong className="block mb-1">Î£Ï†Î¬Î»Î¼Î± ÏƒÏÎ½Î´ÎµÏƒÎ·Ï‚</strong>
                  Î¥Ï€Î®ÏÎ¾Îµ Ï€ÏÏŒÎ²Î»Î·Î¼Î± Î¼Îµ Ï„Î·Î½ ÏƒÏÎ½Î´ÎµÏƒÎ· Google. Î”Î¿ÎºÎ¹Î¼Î¬ÏƒÏ„Îµ Î¾Î±Î½Î¬.
                </>
              )}
              {error === 'Configuration' && (
                <>
                  <strong className="block mb-1">Î£Ï†Î¬Î»Î¼Î± ÏÏ…Î¸Î¼Î¯ÏƒÎµÏ‰Î½</strong>
                  Î›ÎµÎ¯Ï€Î¿Ï…Î½ Î® ÎµÎ¯Î½Î±Î¹ Î»Î¬Î¸Î¿Ï‚ Î¿Î¹ Î¼ÎµÏ„Î±Î²Î»Î·Ï„Î­Ï‚ Ï€ÎµÏÎ¹Î²Î¬Î»Î»Î¿Î½Ï„Î¿Ï‚ ÏƒÏ„Î¿ Vercel (DB/NextAuth/Google OAuth).
                  Î•Î»Î­Î³Î¾Ï„Îµ Ï€ÏÏŽÏ„Î± Ï„Î¿ <code className="px-1 rounded bg-white/10">/api/health</code> ÎºÎ±Î¹ Î¼ÎµÏ„Î¬ Ï„Î¹Ï‚
                  Î¼ÎµÏ„Î±Î²Î»Î·Ï„Î­Ï‚: <code className="px-1 rounded bg-white/10">DATABASE_URL</code>,{' '}
                  <code className="px-1 rounded bg-white/10">DATABASE_AUTH_TOKEN</code>,{' '}
                  <code className="px-1 rounded bg-white/10">NEXTAUTH_URL</code>,{' '}
                  <code className="px-1 rounded bg-white/10">NEXTAUTH_SECRET</code>,{' '}
                  <code className="px-1 rounded bg-white/10">GOOGLE_CLIENT_ID</code>,{' '}
                  <code className="px-1 rounded bg-white/10">GOOGLE_CLIENT_SECRET</code>,{' '}
                  <code className="px-1 rounded bg-white/10">AUTH_ALLOWED_EMAILS</code>.
                </>
              )}
              {error === 'Verification' && (
                <>
                  <strong className="block mb-1">Î£Ï†Î¬Î»Î¼Î± ÎµÏ€Î¹Î²ÎµÎ²Î±Î¯Ï‰ÏƒÎ·Ï‚</strong>
                  Î¤Î¿ link ÏƒÏÎ½Î´ÎµÏƒÎ·Ï‚ Î­Ï‡ÎµÎ¹ Î»Î®Î¾ÎµÎ¹, Î­Ï‡ÎµÎ¹ Î®Î´Î· Ï‡ÏÎ·ÏƒÎ¹Î¼Î¿Ï€Î¿Î¹Î·Î¸ÎµÎ¯ Î® Î´Î·Î¼Î¹Î¿Ï…ÏÎ³Î®Î¸Î·ÎºÎµ Î¼Îµ Î´Î¹Î±Ï†Î¿ÏÎµÏ„Î¹ÎºÏŒ{' '}
                  <code className="px-1 rounded bg-white/10">NEXTAUTH_SECRET</code>. Î–Î·Ï„Î®ÏƒÏ„Îµ Î½Î­Î¿ link ÎºÎ±Î¹ Ï€Î±Ï„Î®ÏƒÏ„Îµ Ï„Î¿
                  Î¼Î¯Î± Ï†Î¿ÏÎ¬.
                </>
              )}
              {!['AccessDenied', 'OAuthCallback', 'Configuration', 'Verification'].includes(error) && (
                <>
                  <strong className="block mb-1">Î£Ï†Î¬Î»Î¼Î±</strong>
                  {error}
                </>
              )}
            </m.div>
          )}

          {/* Google Sign In Button */}
          <m.button
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            Î£ÏÎ½Î´ÎµÏƒÎ· Î¼Îµ Google
          </m.button>

          {/* Email Link Sign In (for non-Gmail mailboxes like Roundcube) */}
          <div className="mt-6 space-y-3">
            <div className="text-xs text-white/50">
              Î•Î½Î±Î»Î»Î±ÎºÏ„Î¹ÎºÎ¬, ÏƒÏ…Î½Î´ÎµÎ¸ÎµÎ¯Ï„Îµ Î¼Îµ email (Î¸Î± Î»Î¬Î²ÎµÏ„Îµ link ÏƒÏÎ½Î´ÎµÏƒÎ·Ï‚).
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@kktires.gr"
              type="email"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <button
              onClick={() => signIn('nodemailer', { email: email.trim(), callbackUrl })}
              disabled={!email.trim()}
              className="w-full px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Î£Ï„ÎµÎ¯Î»Îµ Î¼Î¿Ï… link ÏƒÏÎ½Î´ÎµÏƒÎ·Ï‚
            </button>
          </div>

          {/* Info */}
          <p className="mt-6 text-center text-white/40 text-sm">
            Î£Ï…Î½Î´ÎµÎ¸ÎµÎ¯Ï„Îµ Î¼Îµ Ï„Î¿Î½ Google Î»Î¿Î³Î±ÏÎ¹Î±ÏƒÎ¼ÏŒ ÏƒÎ±Ï‚
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-white/30 text-xs">
          Â© {new Date().getFullYear()} KK Tires. All rights reserved.
        </p>
      </m.div>
      </div>
    </LazyMotion>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}




