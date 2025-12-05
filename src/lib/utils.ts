import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Greek format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Greek format
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Μόλις τώρα';
  if (minutes < 60) return `${minutes} λεπτά`;
  if (hours < 24) return `${hours} ώρες`;
  if (days < 7) return `${days} ημέρες`;
  return formatDate(date);
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Generate a random color for avatars/tags
 */
export function getRandomColor(): string {
  const colors = [
    '#0ea5e9', // cyan
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#6366f1', // indigo
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Customer category labels
 */
export const categoryLabels: Record<string, string> = {
  retail: 'Λιανική',
  wholesale: 'Χονδρική',
  fleet: 'Στόλος',
  government: 'Δημόσιο',
  premium: 'Premium',
  vip: 'VIP',
  partner: 'Συνεργάτης',
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}

/**
 * Customer category colors
 */
export const categoryColors: Record<string, string> = {
  retail: '#10b981',
  wholesale: '#0ea5e9',
  fleet: '#8b5cf6',
  government: '#6366f1',
  premium: '#f59e0b',
  vip: '#ec4899',
  partner: '#14b8a6',
};

/**
 * Lead status labels
 */
export const leadStatusLabels: Record<string, string> = {
  new: 'Νέος',
  contacted: 'Επικοινωνία',
  qualified: 'Αξιολογημένος',
  proposal: 'Πρόταση',
  won: 'Κερδισμένος',
  lost: 'Χαμένος',
};

export function getLeadStatusLabel(status: string): string {
  return leadStatusLabels[status] || status;
}

/**
 * Task priority labels
 */
export const taskPriorityLabels: Record<string, string> = {
  low: 'Χαμηλή',
  medium: 'Μέτρια',
  high: 'Υψηλή',
};

export function getTaskPriorityLabel(priority: string): string {
  return taskPriorityLabels[priority] || priority;
}

/**
 * Task status labels
 */
export const taskStatusLabels: Record<string, string> = {
  todo: 'Προς Υλοποίηση',
  in_progress: 'Σε Εξέλιξη',
  done: 'Ολοκληρωμένη',
};

export function getTaskStatusLabel(status: string): string {
  return taskStatusLabels[status] || status;
}

/**
 * Email campaign status labels
 */
export const campaignStatusLabels: Record<string, string> = {
  draft: 'Πρόχειρο',
  scheduled: 'Προγραμματισμένο',
  sending: 'Αποστολή',
  sent: 'Απεστάλη',
  failed: 'Αποτυχία',
};

export function getCampaignStatusLabel(status: string): string {
  return campaignStatusLabels[status] || status;
}

/**
 * Lifecycle stage labels
 */
export const lifecycleStageLabels: Record<string, string> = {
  lead: 'Δυνητικός',
  prospect: 'Υποψήφιος',
  customer: 'Πελάτης',
  churned: 'Ανενεργός',
  advocate: 'Υποστηρικτής',
};

export function getLifecycleStageLabel(stage: string): string {
  return lifecycleStageLabels[stage] || stage;
}

/**
 * Lead source labels
 */
export const leadSourceLabels: Record<string, string> = {
  website: 'Ιστοσελίδα',
  referral: 'Σύσταση',
  social: 'Social Media',
  email: 'Email',
  phone: 'Τηλέφωνο',
  event: 'Εκδήλωση',
  import: 'Εισαγωγή',
  manual: 'Χειροκίνητη',
  other: 'Άλλο',
};

export function getLeadSourceLabel(source: string): string {
  return leadSourceLabels[source] || source;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate Greek AFM (Tax ID)
 */
export function validateAFM(afm: string): boolean {
  if (!afm || afm.length !== 9) return false;
  if (!/^\d{9}$/.test(afm)) return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(afm[i]) * Math.pow(2, 8 - i);
  }
  const check = sum % 11 % 10;
  return check === parseInt(afm[8]);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Greek mobile (10 digits starting with 69)
  if (digits.length === 10 && digits.startsWith('69')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  // Greek landline (10 digits)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  return phone;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
