// Re-export database types
export type {
  Organization,
  NewOrganization,
  User,
  NewUser,
  Customer,
  NewCustomer,
  Tag,
  NewTag,
  EmailTemplate,
  NewEmailTemplate,
  EmailCampaign,
  NewEmailCampaign,
  Task,
  NewTask,
  Lead,
  NewLead,
} from '@/lib/db/schema';

// Session types
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  currentOrgId?: string;
  currentOrgRole?: 'owner' | 'admin' | 'member';
}

export interface Session {
  user: SessionUser;
  expires: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface CustomerFilters {
  search?: string;
  category?: string;
  tags?: string[];
  city?: string;
  lifecycleStage?: string;
  leadSource?: string;
  minRevenue?: number;
  maxRevenue?: number;
  isVip?: boolean;
  isActive?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastContactAfter?: string;
  lastContactBefore?: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  assignedTo?: string;
  minScore?: number;
  maxScore?: number;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  customerId?: string;
  dueBefore?: string;
  dueAfter?: string;
  overdue?: boolean;
}

// Sort types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

// Form types
export interface CustomerFormData {
  firstName: string;
  lastName?: string;
  company?: string;
  title?: string;
  email?: string;
  emailSecondary?: string;
  phone?: string;
  phoneSecondary?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  afm?: string;
  doy?: string;
  gemh?: string;
  activityCode?: string;
  legalForm?: string;
  category?: string;
  lifecycleStage?: string;
  leadSource?: string;
  revenue?: number;
  paymentTerms?: string;
  creditLimit?: number;
  birthday?: string;
  notes?: string;
  isVip?: boolean;
  tagIds?: string[];
}

export interface LeadFormData {
  firstName: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  source: string;
  status?: string;
  notes?: string;
  assignedTo?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  customerId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
}

// Email types
export interface EmailRecipient {
  customerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface EmailVariable {
  key: string;
  label: string;
  example: string;
}

export const EMAIL_VARIABLES: EmailVariable[] = [
  { key: '{{first_name}}', label: 'Όνομα', example: 'Γιώργος' },
  { key: '{{last_name}}', label: 'Επώνυμο', example: 'Παπαδόπουλος' },
  { key: '{{company}}', label: 'Εταιρεία', example: 'ΑΒΓ ΑΕ' },
  { key: '{{email}}', label: 'Email', example: 'info@example.gr' },
  { key: '{{phone}}', label: 'Τηλέφωνο', example: '210 1234567' },
  { key: '{{city}}', label: 'Πόλη', example: 'Αθήνα' },
];

// Map types
export interface MapMarker {
  id: string;
  customerId: string;
  name: string;
  company?: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  email?: string;
  isVip: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RouteStop {
  id: string;
  customerId?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

// Dashboard types
export interface KpiData {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

// Activity types
export type ActivityType =
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'call'
  | 'meeting'
  | 'note_added'
  | 'status_change'
  | 'tag_added'
  | 'tag_removed'
  | 'customer_created'
  | 'customer_updated'
  | 'task_created'
  | 'task_completed';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
}

// Segment types
export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in';
  value: unknown;
}

export interface SegmentFilter {
  conditions: SegmentCondition[];
  logic: 'and' | 'or';
}

