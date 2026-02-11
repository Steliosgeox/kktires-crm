import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Mail,
  Map,
  BarChart3,
  CheckSquare,
  Settings,
  Tag,
  FolderKanban,
  Upload,
  Download,
  Database,
} from 'lucide-react';

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const mainNavigation: NavItem[] = [
  { name: 'Αρχική', href: '/', icon: LayoutDashboard },
  { name: 'Πελάτες', href: '/customers', icon: Users },
  { name: 'Δυνητικοί', href: '/leads', icon: UserPlus },
  { name: 'Ετικέτες', href: '/tags', icon: Tag },
  { name: 'Τμήματα', href: '/segments', icon: FolderKanban },
  { name: 'Εισαγωγή', href: '/import', icon: Upload },
  { name: 'Εξαγωγή', href: '/export', icon: Download },
  { name: 'Email Marketing', href: '/email', icon: Mail },
  { name: 'Χάρτης', href: '/map', icon: Map },
  { name: 'Στατιστικά', href: '/statistics', icon: BarChart3 },
  { name: 'Εργασίες', href: '/tasks', icon: CheckSquare },
];

export const bottomNavigation: NavItem[] = [
  { name: 'Μετεγκατάσταση', href: '/migrate', icon: Database, adminOnly: true },
  { name: 'Ρυθμίσεις', href: '/settings', icon: Settings },
];

