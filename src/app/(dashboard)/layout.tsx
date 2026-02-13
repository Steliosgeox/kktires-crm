import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardShell from './dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}

