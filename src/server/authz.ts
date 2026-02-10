import { auth } from '@/auth';

export type OrgRole = 'owner' | 'admin' | 'member';

export function getDefaultOrgId(): string {
  return process.env.DEFAULT_ORG_ID?.trim() || 'org_kktires';
}

export async function requireSession() {
  const session = await auth();
  return session?.user?.id ? session : null;
}

export function getOrgIdFromSession(session: { user?: { currentOrgId?: string } } | null): string {
  return session?.user?.currentOrgId || getDefaultOrgId();
}

export function getRoleFromSession(session: { user?: { currentOrgRole?: string } } | null): OrgRole {
  const role = session?.user?.currentOrgRole;
  return role === 'owner' || role === 'admin' || role === 'member' ? role : 'member';
}

export function hasRole(session: { user?: { currentOrgRole?: string } } | null, roles: OrgRole[]): boolean {
  return roles.includes(getRoleFromSession(session));
}
