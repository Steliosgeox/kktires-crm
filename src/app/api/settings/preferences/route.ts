import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { userPreferences } from '@/lib/db/schema';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

const NotificationsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  birthdays: z.boolean(),
  tasks: z.boolean(),
  campaigns: z.boolean(),
});

const PreferencesUpdateSchema = z.object({
  notifications: NotificationsSchema.optional(),
  theme: z.enum(['dark', 'light']).optional(),
});

const DEFAULT_NOTIFICATIONS = {
  email: true,
  push: true,
  birthdays: true,
  tasks: true,
  campaigns: true,
} satisfies z.infer<typeof NotificationsSchema>;

async function getOrCreate(userId: string, orgId: string) {
  const existing = await db.query.userPreferences.findFirst({
    where: (p, { and, eq }) => and(eq(p.userId, userId), eq(p.orgId, orgId)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(userPreferences)
    .values({
      id: `upref_${nanoid()}`,
      userId,
      orgId,
      notifications: DEFAULT_NOTIFICATIONS,
      theme: 'dark',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const pref = await getOrCreate(session.user.id, orgId);
    return NextResponse.json(pref);
  } catch (error) {
    console.error('[settings/preferences] GET error:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = getOrgIdFromSession(session);

  try {
    const body = PreferencesUpdateSchema.parse(await request.json());
    const current = await getOrCreate(session.user.id, orgId);

    const nextNotifications = body.notifications ?? current.notifications ?? DEFAULT_NOTIFICATIONS;
    const nextTheme = body.theme ?? current.theme ?? 'dark';

    await db
      .update(userPreferences)
      .set({
        notifications: nextNotifications,
        theme: nextTheme,
        updatedAt: new Date(),
      })
      .where(and(eq(userPreferences.userId, session.user.id), eq(userPreferences.orgId, orgId)));

    const pref = await db.query.userPreferences.findFirst({
      where: (p, { and, eq }) => and(eq(p.userId, session.user.id), eq(p.orgId, orgId)),
    });

    if (!pref) return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });
    return NextResponse.json(pref);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[settings/preferences] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

