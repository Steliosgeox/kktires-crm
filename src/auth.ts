import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema';

// Allowed email domains (only kktires.gr emails can sign in)
const ALLOWED_DOMAINS = ['kktires.gr'];

// Or specific email addresses
const ALLOWED_EMAILS = [
  'stelios@kktires.gr',
  // Add more team members here
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  // @ts-expect-error - Custom schema doesn't match DrizzleAdapter's expected types exactly
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as any),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if the user's email is allowed
      const email = user.email?.toLowerCase();
      if (!email) return false;

      // Check if email is in allowed list
      if (ALLOWED_EMAILS.includes(email)) {
        return true;
      }

      // Check if email domain is allowed
      const domain = email.split('@')[1];
      if (ALLOWED_DOMAINS.includes(domain)) {
        return true;
      }

      // Reject sign in
      return false;
    },
    async session({ session, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
  debug: process.env.NODE_ENV === 'development',
});

