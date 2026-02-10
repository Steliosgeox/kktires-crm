import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { accounts, organizationMembers, organizations, sessions, users, verificationTokens } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { encryptAccountTokens } from '@/server/crypto/oauth-tokens';

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseAllowedEmails(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;

  raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => set.add(email));

  return set;
}

function getDefaultOrgId(): string {
  return process.env.DEFAULT_ORG_ID?.trim() || 'org_kktires';
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: (() => {
    // Wrap the adapter so OAuth tokens are encrypted at rest when configured.
    // Decryption happens only where the app needs to use them (e.g. Gmail send/refresh).
    const base = DrizzleAdapter(db as any, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    } as any);

    return {
      ...base,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async linkAccount(account: any) {
        return base.linkAccount?.(encryptAccountTokens(account));
      },
    } as any;
  })(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
        },
      },
    }),
  ],
  events: {
    // Ensure the default org exists and the user is a member after successful sign-in.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: any) {
      if (!user?.id) return;

      const orgId = getDefaultOrgId();

      const existingOrg = await db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.id, orgId),
      });

      if (!existingOrg) {
        await db.insert(organizations).values({
          id: orgId,
          name: 'KK Tires',
          slug: 'kktires',
          settings: {
            currency: 'EUR',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            timezone: 'Europe/Athens',
            language: 'el',
          },
          subscriptionTier: 'premium',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const existingMembership = await db.query.organizationMembers.findFirst({
        where: (m, { and, eq }) => and(eq(m.userId, user.id), eq(m.orgId, orgId)),
      });

      if (existingMembership) return;

      const [{ count: memberCount } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, orgId));

      await db.insert(organizationMembers).values({
        id: `mbr_${nanoid()}`,
        userId: user.id,
        orgId,
        role: memberCount === 0 ? 'owner' : 'member',
        joinedAt: new Date(),
      });
    },
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: any) {
      const email = normalizeEmail(user?.email);
      if (!email) return false;

      const allowed = parseAllowedEmails(process.env.AUTH_ALLOWED_EMAILS);
      if (allowed.size === 0) return false;

      return allowed.has(email);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, user }: any) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id;

        const orgId = getDefaultOrgId();
        const membership = await db.query.organizationMembers.findFirst({
          where: (m, { and, eq }) => and(eq(m.userId, user.id), eq(m.orgId, orgId)),
        });

        session.user.currentOrgId = membership?.orgId || orgId;
        session.user.currentOrgRole = (membership?.role || 'member') as
          | 'owner'
          | 'admin'
          | 'member';
      }
      return session;
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
