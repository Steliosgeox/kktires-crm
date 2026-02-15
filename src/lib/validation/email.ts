/**
 * Email Validation Utilities
 * 
 * Provides email validation functions for both application-layer and
 * pre-send validation for email campaigns.
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

/** Maximum email length per RFC 5321 */
export const MAX_EMAIL_LENGTH = 254;

/** Maximum local part length per RFC 5321 */
export const MAX_LOCAL_PART_LENGTH = 64;

/** Minimum email length (a@b.c) */
export const MIN_EMAIL_LENGTH = 5;

// ============================================
// Regular Expressions
// ============================================

/**
 * Basic email validation regex
 * Checks for: local@domain.tld format
 */
export const EMAIL_BASIC_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stricter email validation regex
 * More closely follows RFC 5322
 */
export const EMAIL_STRICT_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Common typo domains for suggestions
 */
const COMMON_TYPO_DOMAINS: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmail.cmo': 'gmail.com',
    'gmail.cim': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmail.grr': 'gmail.com',
    'gmail.gr': 'gmail.com',
    'gmali.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmal.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outloo.com': 'outlook.com',
    'outlok.com': 'outlook.com',
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validates email syntax (basic check)
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmailSyntax(email: string): boolean {
    if (!email || typeof email !== 'string') return false;

    const trimmed = email.trim();

    // Length checks
    if (trimmed.length < MIN_EMAIL_LENGTH || trimmed.length > MAX_EMAIL_LENGTH) {
        return false;
    }

    // Basic format check
    if (!EMAIL_BASIC_REGEX.test(trimmed)) {
        return false;
    }

    // Check for consecutive dots
    if (trimmed.includes('..')) {
        return false;
    }

    // Split and validate parts
    const [localPart, domain] = trimmed.split('@');

    if (!localPart || !domain) return false;

    // Local part length
    if (localPart.length > MAX_LOCAL_PART_LENGTH) {
        return false;
    }

    // Domain must have at least one dot
    if (!domain.includes('.')) {
        return false;
    }

    // Domain parts validation
    const domainParts = domain.split('.');
    if (domainParts.some(part => part.length === 0)) {
        return false;
    }

    // TLD must be at least 2 characters
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
        return false;
    }

    return true;
}

/**
 * Validates email syntax with strict rules
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmailStrict(email: string): boolean {
    if (!isValidEmailSyntax(email)) return false;

    const trimmed = email.trim().toLowerCase();

    return EMAIL_STRICT_REGEX.test(trimmed);
}

/**
 * Normalizes an email address
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes common typos (optional)
 * 
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';

    return email.trim().toLowerCase();
}

/**
 * Extracts the domain from an email address
 * @param email - Email address
 * @returns Domain part or null if invalid
 */
export function extractDomain(email: string): string | null {
    if (!email || typeof email !== 'string') return null;

    const normalized = normalizeEmail(email);
    const match = normalized.match(/@([^@]+)$/);

    return match ? match[1] : null;
}

/**
 * Extracts the local part from an email address
 * @param email - Email address
 * @returns Local part or null if invalid
 */
export function extractLocalPart(email: string): string | null {
    if (!email || typeof email !== 'string') return null;

    const normalized = normalizeEmail(email);
    const match = normalized.match(/^([^@]+)@/);

    return match ? match[1] : null;
}

/**
 * Suggests a correction for common email typos
 * @param email - Email address to check
 * @returns Corrected email or null if no correction available
 */
export function suggestEmailCorrection(email: string): string | null {
    const domain = extractDomain(email);
    if (!domain) return null;

    const correctedDomain = COMMON_TYPO_DOMAINS[domain];
    if (correctedDomain) {
        const localPart = extractLocalPart(email);
        return localPart ? `${localPart}@${correctedDomain}` : null;
    }

    return null;
}

/**
 * Validates email and returns detailed result
 */
export interface EmailValidationResult {
    valid: boolean;
    email: string;
    normalized: string;
    domain: string | null;
    localPart: string | null;
    error?: string;
    suggestion?: string;
}

/**
 * Comprehensive email validation with detailed result
 * @param email - Email address to validate
 * @returns Validation result object
 */
export function validateEmail(email: string): EmailValidationResult {
    const normalized = normalizeEmail(email);
    const domain = extractDomain(email);
    const localPart = extractLocalPart(email);

    if (!email || email.trim() === '') {
        return {
            valid: false,
            email,
            normalized,
            domain,
            localPart,
            error: 'Email is required',
        };
    }

    if (!isValidEmailSyntax(email)) {
        const suggestion = suggestEmailCorrection(email);

        return {
            valid: false,
            email,
            normalized,
            domain,
            localPart,
            error: 'Invalid email format',
            suggestion: suggestion || undefined,
        };
    }

    return {
        valid: true,
        email,
        normalized,
        domain,
        localPart,
    };
}

// ============================================
// Zod Schemas
// ============================================

/**
 * Basic email schema for form validation
 */
export const emailSchema = z.string()
    .trim()
    .transform(email => email.toLowerCase())
    .refine(email => email === '' || isValidEmailSyntax(email), {
        message: 'Invalid email format',
    })
    .refine(email => email === '' || email.length <= MAX_EMAIL_LENGTH, {
        message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    });

/**
 * Strict email schema with all validations
 */
export const strictEmailSchema = z.string()
    .trim()
    .transform(email => email.toLowerCase())
    .refine(email => email === '' || isValidEmailStrict(email), {
        message: 'Invalid email format',
    })
    .refine(email => email === '' || email.length <= MAX_EMAIL_LENGTH, {
        message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    });

/**
 * Required email schema (non-nullable)
 */
export const requiredEmailSchema = z.string()
    .trim()
    .min(1, 'Email is required')
    .transform(email => email.toLowerCase())
    .refine(email => isValidEmailSyntax(email), {
        message: 'Invalid email format',
    })
    .refine(email => email.length <= MAX_EMAIL_LENGTH, {
        message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    });

/**
 * Optional email schema (nullable)
 */
export const optionalEmailSchema = z.string()
    .trim()
    .transform(email => email.toLowerCase())
    .refine(email => email === '' || isValidEmailSyntax(email), {
        message: 'Invalid email format',
    })
    .optional()
    .nullable();

// ============================================
// Bulk Validation
// ============================================

/**
 * Result of bulk email validation
 */
export interface BulkValidationResult {
    valid: string[];
    invalid: Array<{ email: string; error: string; suggestion?: string }>;
    duplicates: string[];
}

/**
 * Validates a list of email addresses
 * @param emails - Array of email addresses
 * @param options - Validation options
 * @returns Bulk validation result
 */
export function validateEmails(
    emails: string[],
    options: { checkDuplicates?: boolean } = {}
): BulkValidationResult {
    const { checkDuplicates = true } = options;

    const valid: string[] = [];
    const invalid: Array<{ email: string; error: string; suggestion?: string }> = [];
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const email of emails) {
        const result = validateEmail(email);

        if (!result.valid) {
            invalid.push({
                email: email.trim(),
                error: result.error || 'Invalid email',
                suggestion: result.suggestion,
            });
            continue;
        }

        if (checkDuplicates) {
            if (seen.has(result.normalized)) {
                duplicates.push(result.normalized);
                continue;
            }
            seen.add(result.normalized);
        }

        valid.push(result.normalized);
    }

    return { valid, invalid, duplicates };
}

// ============================================
// Export all
// ============================================

const emailValidation = {
    isValidEmailSyntax,
    isValidEmailStrict,
    normalizeEmail,
    extractDomain,
    extractLocalPart,
    suggestEmailCorrection,
    validateEmail,
    validateEmails,
    emailSchema,
    strictEmailSchema,
    requiredEmailSchema,
    optionalEmailSchema,
    MAX_EMAIL_LENGTH,
    MAX_LOCAL_PART_LENGTH,
    MIN_EMAIL_LENGTH,
};

export default emailValidation;
