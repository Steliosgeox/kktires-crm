import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Nodemailer from 'next-auth/providers/nodemailer';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { accounts, organizationMembers, organizations, sessions, users, verificationTokens } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { encryptAccountTokens } from '@/server/crypto/oauth-tokens';

function getAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return secret?.trim() ? secret : undefined;
}

function getTrustHost(): boolean {
  // Auth.js / NextAuth behind a proxy (like Vercel) needs trustHost unless NEXTAUTH_URL is set correctly.
  // This makes local + Vercel behave without needing extra flags.
  return process.env.VERCEL === '1' || process.env.NODE_ENV !== 'production';
}

function getGoogleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  return Google({
    clientId,
    clientSecret,
    authorization: {
      params: {
        prompt: 'consent',
        access_type: 'offline',
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
      },
    },
  });
}

function getNodemailerProvider() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = (process.env.SMTP_FROM || user || '').trim();
  if (!host || !portRaw || !user || !pass || !from) return null;

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) return null;

  const secureRaw = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    secureRaw === 'true' ||
    secureRaw === '1' ||
    port === 465;

  // Provider id is "nodemailer". We'll use it explicitly in the login page.
  return Nodemailer({
    server: {
      host,
      port,
      secure,
      auth: { user, pass },
    },
    from,
  });
}

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

function normalizePossiblySecondsDate(date: unknown): unknown {
  // If DB values were stored in seconds but interpreted as ms, they show up as 1970-era dates.
  // Auth.js expects ms-based timestamps (Date.getTime()).
  if (!(date instanceof Date)) return date;
  const t = date.valueOf();
  if (Number.isFinite(t) && t > 0 && t < 1_000_000_000_000) {
    return new Date(t * 1000);
  }
  return date;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: getAuthSecret(),
  trustHost: getTrustHost(),
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
      // Auth.js uses Date objects for expires; normalize in case the DB has second-based values.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async createSession(data: any) {
        const session = await base.createSession?.(data);
        if (!session) return session;
        return { ...session, expires: normalizePossiblySecondsDate(session.expires) } as any;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async updateSession(data: any) {
        const session = await base.updateSession?.(data);
        if (!session) return session;
        return { ...session, expires: normalizePossiblySecondsDate(session.expires) } as any;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async getSessionAndUser(sessionToken: any) {
        const res = await base.getSessionAndUser?.(sessionToken);
        if (!res) return res;
        return {
          ...res,
          session: { ...res.session, expires: normalizePossiblySecondsDate(res.session.expires) },
        } as any;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async createVerificationToken(data: any) {
        const token = await base.createVerificationToken?.(data);
        if (!token) return token;
        return { ...token, expires: normalizePossiblySecondsDate(token.expires) } as any;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async useVerificationToken(params: any) {
        const token = await base.useVerificationToken?.(params);
        if (!token) return token;
        return { ...token, expires: normalizePossiblySecondsDate(token.expires) } as any;
      },
    } as any;
  })(),
  providers: (() => {
    const providers = [];
    const google = getGoogleProvider();
    if (google) providers.push(google);
    const mail = getNodemailerProvider();
    if (mail) providers.push(mail);
    return providers;
  })(),
  events: {
    // Ensure the default org exists and the user is a member after successful sign-in.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: any) {
      // IMPORTANT: Do not block sign-in if org bootstrapping fails.
      // Some environments might have partial schema/migrations during initial setup.
      try {
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
      } catch (error) {
        console.error('[auth] signIn event org bootstrap failed (non-fatal):', error);
      }
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
        try {
          const membership = await db.query.organizationMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.userId, user.id), eq(m.orgId, orgId)),
          });

          session.user.currentOrgId = membership?.orgId || orgId;
          session.user.currentOrgRole = (membership?.role || 'member') as
            | 'owner'
            | 'admin'
            | 'member';
        } catch (error) {
          console.error('[auth] session org lookup failed (non-fatal):', error);
          session.user.currentOrgId = orgId;
          session.user.currentOrgRole = 'member';
        }
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
  debug: process.env.NODE_ENV !== 'production' || process.env.AUTH_DEBUG === '1',
  logger: {
    error(error) {
      console.error('[auth] error', error);
    },
    warn(code) {
      console.warn('[auth] warn', code);
    },
    debug(message, metadata) {
      if (process.env.AUTH_DEBUG === '1') {
        console.log('[auth] debug', message, metadata);
      }
    },
  },
}); 
