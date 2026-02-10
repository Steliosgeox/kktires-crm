import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, sessions, users, verificationTokens } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check database connectivity and presence of core tables
    const [org] = await db.select({ count: sql<number>`count(*)` }).from(organizations).limit(1);
    const [usr] = await db.select({ count: sql<number>`count(*)` }).from(users).limit(1);
    const [sess] = await db.select({ count: sql<number>`count(*)` }).from(sessions).limit(1);
    const [vt] = await db.select({ count: sql<number>`count(*)` }).from(verificationTokens).limit(1);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      tables: {
        organizations: org?.count ?? 0,
        users: usr?.count ?? 0,
        sessions: sess?.count ?? 0,
        verification_tokens: vt?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
