import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// MULTI-TENANT: ORGANIZATIONS
// ============================================

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  settings: text('settings', { mode: 'json' }).$type<{
    currency: string;
    dateFormat: string;
    timeFormat: string;
    timezone: string;
    language: string;
    companyProfile?: {
      vatId?: string;
      address?: string;
      city?: string;
      phone?: string;
      website?: string;
    };
  }>(),
  subscriptionTier: text('subscription_tier').default('free'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, admin, member
  invitedAt: integer('invited_at', { mode: 'timestamp' }),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('organization_members_user_org_uidx').on(table.userId, table.orgId),
}));

export const organizationInvitations = sqliteTable('organization_invitations', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// AUTHENTICATION: USERS & SESSIONS
// ============================================

// Users table - compatible with NextAuth
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  // Auth.js / NextAuth expects ms timestamps for these core auth fields.
  // Using `timestamp` (seconds) causes Email sign-in tokens to appear instantly expired.
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  avatar: text('avatar'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Sessions table - compatible with NextAuth
export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

// Accounts table - compatible with NextAuth (for OAuth providers)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  providerAccountIdx: uniqueIndex('accounts_provider_account_uidx').on(table.provider, table.providerAccountId),
}));

// Verification tokens - compatible with NextAuth
export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

// ============================================
// CRM CORE: CUSTOMERS
// ============================================

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Basic Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  company: text('company'),
  title: text('title'),
  avatar: text('avatar'),

  // Contact Info
  email: text('email'),
  emailSecondary: text('email_secondary'),
  phone: text('phone'),
  phoneSecondary: text('phone_secondary'),
  mobile: text('mobile'),
  fax: text('fax'),
  website: text('website'),

  // Address
  street: text('street'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country').default('Ελλάδα'),

  // Greek Business Fields
  afm: text('afm'), // ΑΦΜ - Tax ID
  doy: text('doy'), // ΔΟΥ - Tax Office
  gemh: text('gemh'), // ΓΕΜΗ - Business Registry
  activityCode: text('activity_code'), // Κωδικός Δραστηριότητας (KAD)
  legalForm: text('legal_form'), // ΑΕ, ΕΠΕ, ΙΚΕ, etc.

  // Classification
  category: text('category').default('retail'), // retail, wholesale, fleet, garage, vip, premium, standard, basic
  lifecycleStage: text('lifecycle_stage').default('customer'), // lead, prospect, customer, churned
  leadSource: text('lead_source'), // website, referral, import, manual
  leadScore: integer('lead_score').default(0),

  // Financial
  revenue: real('revenue').default(0),
  currency: text('currency').default('EUR'),
  paymentTerms: text('payment_terms'),
  creditLimit: real('credit_limit'),

  // Dates
  birthday: text('birthday'), // YYYY-MM-DD format
  lastContactDate: integer('last_contact_date', { mode: 'timestamp' }),
  nextFollowUpDate: integer('next_follow_up_date', { mode: 'timestamp' }),

  // Location
  latitude: real('latitude'),
  longitude: real('longitude'),
  geocodedAt: integer('geocoded_at', { mode: 'timestamp' }),

  // Metadata
  notes: text('notes'),
  isVip: integer('is_vip', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  unsubscribed: integer('unsubscribed', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by').references(() => users.id),
}, (table) => ({
  orgIdx: index('customers_org_idx').on(table.orgId),
  emailIdx: index('customers_email_idx').on(table.email),
  cityIdx: index('customers_city_idx').on(table.city),
  categoryIdx: index('customers_category_idx').on(table.category),
  afmIdx: index('customers_afm_idx').on(table.afm),
}));

// ============================================
// CRM: CUSTOMER NOTES
// ============================================

export const customerNotes = sqliteTable('customer_notes', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  customerIdx: index('notes_customer_idx').on(table.customerId),
}));

// ============================================
// CRM: CUSTOMER ACTIVITIES (Timeline)
// ============================================

export const customerActivities = sqliteTable('customer_activities', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // email_sent, email_opened, call, meeting, note, status_change, tag_added, etc.
  title: text('title').notNull(),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  customerIdx: index('activities_customer_idx').on(table.customerId),
  typeIdx: index('activities_type_idx').on(table.type),
}));

// ============================================
// CRM: TAGS
// ============================================

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgNameIdx: index('tags_org_name_idx').on(table.orgId, table.name),
}));

export const customerTags = sqliteTable('customer_tags', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  customerTagIdx: index('customer_tag_idx').on(table.customerId, table.tagId),
}));

// ============================================
// CRM: CUSTOM FIELDS
// ============================================

export const customFields = sqliteTable('custom_fields', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  label: text('label').notNull(),
  type: text('type').notNull(), // text, number, date, select, multiselect, checkbox
  options: text('options', { mode: 'json' }).$type<string[]>(),
  required: integer('required', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const customerCustomValues = sqliteTable('customer_custom_values', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  fieldId: text('field_id').notNull().references(() => customFields.id, { onDelete: 'cascade' }),
  value: text('value'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  customerFieldIdx: index('custom_values_idx').on(table.customerId, table.fieldId),
}));

// ============================================
// CRM: LEADS
// ============================================

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Basic Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),

  // Lead Info
  source: text('source').notNull(), // website, referral, import, manual
  status: text('status').notNull().default('new'), // new, contacted, qualified, proposal, won, lost
  score: integer('score').default(0),

  // Assignment
  assignedTo: text('assigned_to').references(() => users.id),

  // Conversion
  convertedToCustomerId: text('converted_to_customer_id').references(() => customers.id),
  convertedAt: integer('converted_at', { mode: 'timestamp' }),

  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgIdx: index('leads_org_idx').on(table.orgId),
  statusIdx: index('leads_status_idx').on(table.status),
}));

// ============================================
// EMAIL MARKETING: GMAIL CREDENTIALS
// ============================================

export const gmailCredentials = sqliteTable('gmail_credentials', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// EMAIL MARKETING: TEMPLATES
// ============================================

export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(), // HTML content
  category: text('category'), // welcome, offers, updates, birthday, etc.
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  thumbnail: text('thumbnail'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgCategoryIdx: index('templates_org_category_idx').on(table.orgId, table.category),
}));

// ============================================
// EMAIL MARKETING: CAMPAIGNS
// ============================================

export const emailCampaigns = sqliteTable('email_campaigns', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  templateId: text('template_id').references(() => emailTemplates.id),
  signatureId: text('signature_id').references(() => emailSignatures.id),
  status: text('status').notNull().default('draft'), // draft, scheduled, sending, sent, paused, cancelled

  // Sending
  fromEmail: text('from_email'),
  gmailCredentialId: text('gmail_credential_id').references(() => gmailCredentials.id),
  recipientFilters: text('recipient_filters', { mode: 'json' }).$type<{
    cities: string[];
    tags: string[];
    segments: string[];
    categories: string[];
    customerIds: string[];
    rawEmails: string[];
  }>(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),

  // Stats
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  bounceCount: integer('bounce_count').default(0),
  unsubscribeCount: integer('unsubscribe_count').default(0),

  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgStatusIdx: index('campaigns_org_status_idx').on(table.orgId, table.status),
}));

export const emailAssets = sqliteTable('email_assets', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  uploaderUserId: text('uploader_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blobUrl: text('blob_url').notNull(),
  blobPath: text('blob_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  kind: text('kind').notNull(), // image | file
  width: integer('width'),
  height: integer('height'),
  sha256: text('sha256').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  orgCreatedIdx: index('email_assets_org_created_idx').on(table.orgId, table.createdAt),
  orgKindIdx: index('email_assets_org_kind_idx').on(table.orgId, table.kind),
  shaIdx: index('email_assets_sha_idx').on(table.sha256),
}));

export const campaignAssets = sqliteTable('campaign_assets', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => emailAssets.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // inline_image | attachment
  embedInline: integer('embed_inline', { mode: 'boolean' }).notNull().default(false),
  displayWidthPx: integer('display_width_px'),
  align: text('align'), // left | center | right
  altText: text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  campaignRoleIdx: index('campaign_assets_campaign_role_idx').on(table.campaignId, table.role),
  assetIdx: index('campaign_assets_asset_idx').on(table.assetId),
}));

// ============================================
// EMAIL MARKETING: CAMPAIGN RECIPIENTS
// ============================================

export const campaignRecipients = sqliteTable('campaign_recipients', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  recipientSource: text('recipient_source').notNull().default('customer'), // customer | manual_email
  displayName: text('display_name'),
  status: text('status').notNull().default('pending'), // pending, sent, failed, bounced
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),

  // Enhanced tracking fields (added in migration 0007)
  failureCategory: text('failure_category'), // syntax, dns, bounce, complaint
  failureReasonDetailed: text('failure_reason_detailed'), // invalid_syntax, dns_failure, hard_bounce, etc.
  bounceType: text('bounce_type'), // hard, soft
  attemptCount: integer('attempt_count').default(0),
  lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp' }),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),
  mxValid: integer('mx_valid', { mode: 'boolean' }),
  dnsCheckedAt: integer('dns_checked_at', { mode: 'timestamp' }),
  emailNormalized: text('email_normalized'),
  domain: text('domain'),
}, (table) => ({
  campaignIdx: index('recipients_campaign_idx').on(table.campaignId),
  campaignStatusIdx: index('idx_recipients_campaign_status').on(table.campaignId, table.status),
  statusRetryIdx: index('idx_recipients_status_retry').on(table.status, table.nextRetryAt),
  sourceIdx: index('idx_recipients_source').on(table.recipientSource),
}));

// ============================================
// EMAIL MARKETING: JOB QUEUE (DB-BACKED)
// ============================================

export const emailJobs = sqliteTable('email_jobs', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  senderUserId: text('sender_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  status: text('status').notNull().default('queued'), // queued, processing, completed, failed, cancelled
  runAt: integer('run_at', { mode: 'timestamp' }).notNull(),

  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),

  lockedAt: integer('locked_at', { mode: 'timestamp' }),
  lockedBy: text('locked_by'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  lastError: text('last_error'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  statusRunIdx: index('email_jobs_status_run_idx').on(table.status, table.runAt),
  campaignIdx: index('email_jobs_campaign_idx').on(table.campaignId),
}));

export const emailJobItems = sqliteTable('email_job_items', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => emailJobs.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => campaignRecipients.id, { onDelete: 'cascade' }),

  status: text('status').notNull().default('pending'), // pending, sent, failed
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  jobIdx: index('email_job_items_job_idx').on(table.jobId),
  campaignIdx: index('email_job_items_campaign_idx').on(table.campaignId),
}));

// ============================================
// EMAIL MARKETING: TRACKING
// ============================================

export const emailTracking = sqliteTable('email_tracking', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => campaignRecipients.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // open, click
  linkUrl: text('link_url'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  campaignTypeIdx: index('tracking_campaign_type_idx').on(table.campaignId, table.type),
}));

// ============================================
// EMAIL MARKETING: DELIVERY EVENTS (New in migration 0007)
// ============================================

export const emailDeliveryEvents = sqliteTable('email_delivery_events', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => campaignRecipients.id, { onDelete: 'cascade' }),

  // Event Classification
  eventType: text('event_type').notNull(), // sent, delivered, bounce, complaint, unsubscribe, deferred
  eventCategory: text('event_category').notNull(), // success, failure, complaint, optout
  failureReason: text('failure_reason'), // invalid_syntax, dns_failure, hard_bounce, soft_bounce, etc.

  // Event Details
  smtpCode: integer('smtp_code'),
  smtpMessage: text('smtp_message'),
  diagnosticCode: text('diagnostic_code'),
  bounceType: text('bounce_type'), // hard, soft
  bounceSubtype: text('bounce_subtype'),

  // Retry Information
  attemptNumber: integer('attempt_number').default(1),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),
  retryEligible: integer('retry_eligible', { mode: 'boolean' }).default(false),

  // Metadata
  emailAddress: text('email_address').notNull(),
  domain: text('domain'),
  mxValid: integer('mx_valid', { mode: 'boolean' }),
  dnsCheckedAt: integer('dns_checked_at', { mode: 'timestamp' }),

  // Timestamps
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  campaignIdx: index('idx_delivery_events_campaign').on(table.campaignId),
  recipientIdx: index('idx_delivery_events_recipient').on(table.recipientId),
  typeIdx: index('idx_delivery_events_type').on(table.eventType),
  failureIdx: index('idx_delivery_events_failure_reason').on(table.failureReason),
  domainIdx: index('idx_delivery_events_domain').on(table.domain),
  occurredIdx: index('idx_delivery_events_occurred_at').on(table.occurredAt),
}));

// ============================================
// EMAIL MARKETING: SUPPRESSIONS (New in migration 0007)
// ============================================

export const emailSuppressions = sqliteTable('email_suppressions', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),

  // Suppression Type
  suppressionType: text('suppression_type').notNull(), // hard_bounce, complaint, unsubscribe, manual
  suppressionReason: text('suppression_reason'),

  // Source Information
  sourceCampaignId: text('source_campaign_id').references(() => emailCampaigns.id, { onDelete: 'set null' }),
  sourceEventId: text('source_event_id'),

  // Metadata
  bounceCount: integer('bounce_count').default(0),
  complaintCount: integer('complaint_count').default(0),

  // Timestamps
  suppressedAt: integer('suppressed_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
}, (table) => ({
  orgEmailIdx: uniqueIndex('idx_suppressions_org_email').on(table.orgId, table.email),
  typeIdx: index('idx_suppressions_type').on(table.suppressionType),
  expiresIdx: index('idx_suppressions_expires').on(table.expiresAt),
}));

// ============================================
// EMAIL MARKETING: VALIDATION CACHE (New in migration 0007)
// ============================================

export const emailValidationCache = sqliteTable('email_validation_cache', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  domain: text('domain').notNull(),

  // Validation Results
  syntaxValid: integer('syntax_valid', { mode: 'boolean' }).notNull(),
  mxValid: integer('mx_valid', { mode: 'boolean' }),
  mxRecords: text('mx_records', { mode: 'json' }).$type<string[]>(),
  smtpValid: integer('smtp_valid', { mode: 'boolean' }),

  // Metadata
  validationSource: text('validation_source'), // pre_send, dns_check, smtp_verify
  errorMessage: text('error_message'),

  // Timestamps
  validatedAt: integer('validated_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),

  // Statistics
  checkCount: integer('check_count').default(1),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  domainIdx: index('idx_validation_cache_domain').on(table.domain),
  expiresIdx: index('idx_validation_cache_expires').on(table.expiresAt),
}));

// ============================================
// EMAIL MARKETING: RETRY CONFIG (New in migration 0007)
// ============================================

export const emailRetryConfig = sqliteTable('email_retry_config', {
  id: text('id').primaryKey(),
  orgId: text('org_id').references(() => organizations.id, { onDelete: 'cascade' }),

  failureReason: text('failure_reason').notNull(),
  maxRetries: integer('max_retries').notNull().default(3),
  initialDelaySeconds: integer('initial_delay_seconds').notNull().default(300),
  backoffMultiplier: real('backoff_multiplier').notNull().default(2.0),
  maxDelaySeconds: integer('max_delay_seconds').notNull().default(86400),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// EMAIL MARKETING: SIGNATURES
// ============================================

export const emailSignatures = sqliteTable('email_signatures', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  content: text('content').notNull(), // HTML
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// EMAIL MARKETING: AUTOMATIONS
// ============================================

export const emailAutomations = sqliteTable('email_automations', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger').notNull(), // customer_created, tag_added, birthday, inactivity
  triggerConfig: text('trigger_config', { mode: 'json' }).$type<Record<string, unknown>>(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const automationSteps = sqliteTable('automation_steps', {
  id: text('id').primaryKey(),
  automationId: text('automation_id').notNull().references(() => emailAutomations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // send_email, wait, condition, add_tag, remove_tag
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// EMAIL MARKETING: UNSUBSCRIBES
// ============================================

export const unsubscribes = sqliteTable('unsubscribes', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  reason: text('reason'),
  campaignId: text('campaign_id').references(() => emailCampaigns.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgEmailIdx: index('unsubscribes_org_email_idx').on(table.orgId, table.email),
}));

// ============================================
// MAPS: SAVED LOCATIONS
// ============================================

export const savedLocations = sqliteTable('saved_locations', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  category: text('category'), // office, warehouse, competitor, other
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// MAPS: TERRITORIES
// ============================================

export const territories = sqliteTable('territories', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  geometry: text('geometry', { mode: 'json' }).$type<{
    type: 'Polygon' | 'Circle';
    coordinates: number[][] | { center: number[]; radius: number };
  }>(),
  assignedTo: text('assigned_to').references(() => users.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// MAPS: GEOCODE CACHE
// ============================================

export const geocodeCache = sqliteTable('geocode_cache', {
  id: text('id').primaryKey(),
  address: text('address').notNull().unique(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  formattedAddress: text('formatted_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// TASKS
// ============================================

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  assignedTo: text('assigned_to').references(() => users.id),
  status: text('status').notNull().default('todo'), // todo, in_progress, done
  priority: text('priority').notNull().default('medium'), // low, medium, high
  dueDate: integer('due_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  orgStatusIdx: index('tasks_org_status_idx').on(table.orgId, table.status),
  assignedIdx: index('tasks_assigned_idx').on(table.assignedTo),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
}));

// ============================================
// GOOGLE CALENDAR TOKENS
// ============================================

export const googleCalendarTokens = sqliteTable('google_calendar_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  calendarId: text('calendar_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// SYNC & NOTIFICATIONS
// ============================================

export const syncMetadata = sqliteTable('sync_metadata', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  tableName: text('table_name').notNull(),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }).notNull(),
  syncVersion: integer('sync_version').notNull().default(0),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // task_due, birthday, campaign_complete, etc.
  title: text('title').notNull(),
  message: text('message'),
  link: text('link'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.isRead),
}));

export const userPreferences = sqliteTable('user_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  notifications: text('notifications', { mode: 'json' }).$type<{
    email: boolean;
    push: boolean;
    birthdays: boolean;
    tasks: boolean;
    campaigns: boolean;
  }>().notNull(),
  theme: text('theme').notNull().default('dark'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('user_preferences_user_org_uidx').on(table.userId, table.orgId),
}));

// ============================================
// CUSTOMER IMAGES
// ============================================

export const customerImages = sqliteTable('customer_images', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// SEGMENTS (Saved Filters)
// ============================================

export const segments = sqliteTable('segments', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  filters: text('filters', { mode: 'json' }).$type<{
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    logic: 'and' | 'or';
  }>(),
  customerCount: integer('customer_count').default(0),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const segmentCustomers = sqliteTable('segment_customers', {
  id: text('id').primaryKey(),
  segmentId: text('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  segmentCustomerUidx: uniqueIndex('segment_customers_segment_customer_uidx').on(
    table.segmentId,
    table.customerId
  ),
  segmentIdx: index('segment_customers_segment_idx').on(table.segmentId),
  customerIdx: index('segment_customers_customer_idx').on(table.customerId),
}));

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  customers: many(customers),
  tags: many(tags),
  segments: many(segments),
  templates: many(emailTemplates),
  campaigns: many(emailCampaigns),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  notes: many(customerNotes),
  activities: many(customerActivities),
  tags: many(customerTags),
  segmentCustomers: many(segmentCustomers),
  tasks: many(tasks),
  images: many(customerImages),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tags.orgId],
    references: [organizations.id],
  }),
  customerTags: many(customerTags),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  tag: one(tags, {
    fields: [customerTags.tagId],
    references: [tags.id],
  }),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [segments.orgId],
    references: [organizations.id],
  }),
  members: many(segmentCustomers),
}));

export const segmentCustomersRelations = relations(segmentCustomers, ({ one }) => ({
  segment: one(segments, {
    fields: [segmentCustomers.segmentId],
    references: [segments.id],
  }),
  customer: one(customers, {
    fields: [segmentCustomers.customerId],
    references: [customers.id],
  }),
}));

// Export types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;
export type SegmentCustomer = typeof segmentCustomers.$inferSelect;
export type NewSegmentCustomer = typeof segmentCustomers.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailAsset = typeof emailAssets.$inferSelect;
export type NewEmailAsset = typeof emailAssets.$inferInsert;
export type CampaignAsset = typeof campaignAssets.$inferSelect;
export type NewCampaignAsset = typeof campaignAssets.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type NewCampaignRecipient = typeof campaignRecipients.$inferInsert;
export type EmailDeliveryEvent = typeof emailDeliveryEvents.$inferSelect;
export type NewEmailDeliveryEvent = typeof emailDeliveryEvents.$inferInsert;
export type EmailSuppression = typeof emailSuppressions.$inferSelect;
export type NewEmailSuppression = typeof emailSuppressions.$inferInsert;
export type EmailValidationCache = typeof emailValidationCache.$inferSelect;
export type NewEmailValidationCache = typeof emailValidationCache.$inferInsert;
export type EmailRetryConfig = typeof emailRetryConfig.$inferSelect;
export type NewEmailRetryConfig = typeof emailRetryConfig.$inferInsert;
