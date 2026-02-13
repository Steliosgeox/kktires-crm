import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

import { customers, emailTemplates, tags } from '@/lib/db/schema';

const hexColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);

export const customerInsertSchema = createInsertSchema(customers, {
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).nullish(),
  company: z.string().trim().max(160).nullish(),
  email: z.string().trim().email().max(254).nullish(),
  phone: z.string().trim().max(64).nullish(),
  mobile: z.string().trim().max(64).nullish(),
  street: z.string().trim().max(255).nullish(),
  city: z.string().trim().max(120).nullish(),
  postalCode: z.string().trim().max(32).nullish(),
  country: z.string().trim().max(80).nullish(),
  afm: z.string().trim().max(64).nullish(),
  doy: z.string().trim().max(120).nullish(),
  notes: z.string().max(10_000).nullish(),
});

export const customerCreateRequestSchema = customerInsertSchema
  .omit({
    id: true,
    orgId: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    latitude: true,
    longitude: true,
    geocodedAt: true,
    emailSecondary: true,
    phoneSecondary: true,
    fax: true,
    website: true,
    state: true,
    title: true,
    avatar: true,
    leadSource: true,
    leadScore: true,
    lifecycleStage: true,
    currency: true,
    paymentTerms: true,
    creditLimit: true,
    birthday: true,
    lastContactDate: true,
    nextFollowUpDate: true,
    unsubscribed: true,
  })
  .extend({
    category: z
      .enum(['retail', 'wholesale', 'fleet', 'garage', 'vip', 'premium', 'standard', 'basic'])
      .optional(),
    revenue: z.number().finite().nonnegative().max(1_000_000_000).optional(),
    isVip: z.boolean().optional(),
  });

export const tagInsertSchema = createInsertSchema(tags, {
  name: z.string().trim().min(1).max(80),
  color: hexColorSchema,
  description: z.string().trim().max(400).nullish(),
});

export const tagCreateRequestSchema = tagInsertSchema.omit({
  id: true,
  orgId: true,
  createdAt: true,
});

export const templateInsertSchema = createInsertSchema(emailTemplates, {
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().max(300),
  content: z.string().max(500_000),
  category: z.string().trim().max(80).nullish(),
});

export const templateCreateRequestSchema = templateInsertSchema.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  isDefault: true,
  thumbnail: true,
});
