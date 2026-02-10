'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#14151a] to-[#1a1b23]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 mb-4"
            >
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">KK Tires CRM</h1>
            <p className="text-white/60">Συνδεθείτε με το Google λογαριασμό σας</p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error === 'AccessDenied' && (
                <>
                  <strong className="block mb-1">Δεν επιτρέπεται η πρόσβαση</strong>
                  Μόνο οι εξουσιοδοτημένοι χρήστες μπορούν να συνδεθούν.
                </>
              )}
              {error === 'OAuthCallback' && (
                <>
                  <strong className="block mb-1">Σφάλμα σύνδεσης</strong>
                  Υπήρξε πρόβλημα με την σύνδεση Google. Δοκιμάστε ξανά.
                </>
              )}
              {error === 'Configuration' && (
                <>
                  <strong className="block mb-1">Σφάλμα ρυθμίσεων</strong>
                  Λείπουν ή είναι λάθος οι μεταβλητές περιβάλλοντος στο Vercel (DB/NextAuth/Google OAuth).
                  Ελέγξτε πρώτα το <code className="px-1 rounded bg-white/10">/api/health</code> και μετά τις
                  μεταβλητές: <code className="px-1 rounded bg-white/10">DATABASE_URL</code>,{' '}
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
                  <strong className="block mb-1">Σφάλμα επιβεβαίωσης</strong>
                  Το link σύνδεσης έχει λήξει, έχει ήδη χρησιμοποιηθεί ή δημιουργήθηκε με διαφορετικό{' '}
                  <code className="px-1 rounded bg-white/10">NEXTAUTH_SECRET</code>. Ζητήστε νέο link και πατήστε το
                  μία φορά.
                </>
              )}
              {!['AccessDenied', 'OAuthCallback', 'Configuration', 'Verification'].includes(error) && (
                <>
                  <strong className="block mb-1">Σφάλμα</strong>
                  {error}
                </>
              )}
            </motion.div>
          )}

          {/* Google Sign In Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
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
            Σύνδεση με Google
          </motion.button>

          {/* Email Link Sign In (for non-Gmail mailboxes like Roundcube) */}
          <div className="mt-6 space-y-3">
            <div className="text-xs text-white/50">
              Εναλλακτικά, συνδεθείτε με email (θα λάβετε link σύνδεσης).
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
              Στείλε μου link σύνδεσης
            </button>
          </div>

          {/* Info */}
          <p className="mt-6 text-center text-white/40 text-sm">
            Συνδεθείτε με τον Google λογαριασμό σας
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-white/30 text-xs">
          © {new Date().getFullYear()} KK Tires. All rights reserved.
        </p>
      </motion.div>
    </div>
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



