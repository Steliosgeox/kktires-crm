/**
 * Greek Data Validation Utilities
 * 
 * Provides validation functions for Greek-specific data:
 * - AFM (ΑΦΜ) - Greek Tax ID with checksum validation
 * - Phone numbers (Greek format)
 * - Postal codes (Greek 5-digit format)
 */

import { z } from 'zod';

// ============================================
// AFM (Greek Tax ID) Validation
// ============================================

/**
 * AFM (ΑΦΜ) is the Greek Tax Identification Number
 * 
 * Format: 9 digits
 * The last digit is a checksum calculated from the first 8 digits
 * 
 * Algorithm:
 * 1. Multiply each of the first 8 digits by 2^(8-position)
 * 2. Sum all products
 * 3. Calculate remainder mod 11
 * 4. If remainder is 10, use 0 as check digit
 * 5. Compare with the 9th digit
 */

/**
 * Validates the AFM checksum
 * @param afm - 9-digit AFM string
 * @returns true if checksum is valid
 */
export function validateAFMChecksum(afm: string): boolean {
    if (!afm || !/^\d{9}$/.test(afm)) {
        return false;
    }

    const digits = afm.split('').map(Number);

    // Calculate weighted sum
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += digits[i] * Math.pow(2, 8 - i);
    }

    // Calculate remainder
    const remainder = sum % 11;

    // Check digit is remainder, or 0 if remainder is 10
    const checkDigit = remainder === 10 ? 0 : remainder;

    return checkDigit === digits[8];
}

/**
 * Validates AFM format (9 digits)
 * @param afm - AFM string to validate
 * @returns true if format is valid
 */
export function isValidAFMFormat(afm: string): boolean {
    if (!afm || typeof afm !== 'string') return false;

    const trimmed = afm.trim();

    // Must be exactly 9 digits
    return /^\d{9}$/.test(trimmed);
}

/**
 * Comprehensive AFM validation
 * @param afm - AFM string to validate
 * @returns true if format and checksum are valid
 */
export function isValidAFM(afm: string): boolean {
    if (!isValidAFMFormat(afm)) return false;

    return validateAFMChecksum(afm.trim());
}

/**
 * Normalizes AFM by removing any whitespace
 * @param afm - AFM string
 * @returns Normalized AFM
 */
export function normalizeAFM(afm: string): string {
    if (!afm || typeof afm !== 'string') return '';

    return afm.trim().replace(/\s/g, '');
}

/**
 * AFM validation result
 */
export interface AFMValidationResult {
    valid: boolean;
    afm: string;
    normalized: string;
    error?: string;
}

/**
 * Comprehensive AFM validation with detailed result
 * @param afm - AFM string to validate
 * @returns Validation result object
 */
export function validateAFM(afm: string): AFMValidationResult {
    const normalized = normalizeAFM(afm);

    if (!normalized) {
        return {
            valid: true, // Empty is valid (optional field)
            afm,
            normalized: '',
        };
    }

    if (normalized.length !== 9) {
        return {
            valid: false,
            afm,
            normalized,
            error: 'AFM must be exactly 9 digits',
        };
    }

    if (!/^\d{9}$/.test(normalized)) {
        return {
            valid: false,
            afm,
            normalized,
            error: 'AFM must contain only digits',
        };
    }

    if (!validateAFMChecksum(normalized)) {
        return {
            valid: false,
            afm,
            normalized,
            error: 'Invalid AFM checksum',
        };
    }

    return {
        valid: true,
        afm,
        normalized,
    };
}

// ============================================
// Greek Phone Number Validation
// ============================================

/**
 * Greek Phone Number Formats:
 * 
 * Mobile: 69X XXX XXXX (10 digits, starts with 69)
 * Landline Athens: 210 XXX XXXX (10 digits)
 * Landline Thessaloniki: 2310 XXX XXXX (10 digits)
 * Other landlines: 2XXX XXX XXXX (10 digits, starts with 2)
 * Toll-free: 800 XXX XXXX (9 digits)
 * International: +30 XX XXX XXXXX (12-13 characters with +30)
 */

/** Greek phone number patterns */
export const GREEK_PHONE_PATTERNS = {
    /** Mobile numbers starting with 69 */
    mobile: /^(\+30)?69[0-9]{8}$/,
    /** Landline numbers starting with 2 */
    landline: /^(\+30)?2[0-9]{9}$/,
    /** Toll-free numbers starting with 800 */
    tollFree: /^(\+30)?800[0-9]{6}$/,
    /** Any valid Greek number */
    any: /^(\+30)?(69[0-9]{8}|2[0-9]{9}|800[0-9]{6})$/,
} as const;

/**
 * Removes all non-digit characters except leading +
 * @param phone - Phone number string
 * @returns Cleaned phone number
 */
export function cleanPhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';

    // Keep + only if it's at the start
    const hasPlus = phone.trim().startsWith('+');
    const digits = phone.replace(/[^\d]/g, '');

    return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalizes a Greek phone number to international format
 * @param phone - Phone number string
 * @returns Normalized phone number with +30 prefix
 */
export function normalizeGreekPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';

    const cleaned = cleanPhoneNumber(phone);

    // Already has +30 prefix
    if (cleaned.startsWith('+30')) {
        return cleaned;
    }

    // Has 30 prefix without +
    if (cleaned.startsWith('30') && cleaned.length > 10) {
        return `+${cleaned}`;
    }

    // Greek number without country code
    if (GREEK_PHONE_PATTERNS.any.test(cleaned)) {
        return `+30${cleaned}`;
    }

    // 10-digit Greek number
    if (/^(69|2)[0-9]{8,9}$/.test(cleaned)) {
        return `+30${cleaned}`;
    }

    return cleaned;
}

/**
 * Validates Greek phone number format
 * @param phone - Phone number string
 * @returns true if valid Greek phone format
 */
export function isValidGreekPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;

    const normalized = normalizeGreekPhone(phone);

    // Check against patterns (without +30 for pattern matching)
    const withoutCountryCode = normalized.replace(/^\+30/, '');

    return GREEK_PHONE_PATTERNS.any.test(withoutCountryCode);
}

/**
 * Determines the type of Greek phone number
 * @param phone - Phone number string
 * @returns Phone type or null if invalid
 */
export function getGreekPhoneType(phone: string): 'mobile' | 'landline' | 'tollFree' | null {
    if (!isValidGreekPhone(phone)) return null;

    const normalized = normalizeGreekPhone(phone);
    const withoutCountryCode = normalized.replace(/^\+30/, '');

    if (GREEK_PHONE_PATTERNS.mobile.test(withoutCountryCode)) {
        return 'mobile';
    }

    if (GREEK_PHONE_PATTERNS.tollFree.test(withoutCountryCode)) {
        return 'tollFree';
    }

    if (GREEK_PHONE_PATTERNS.landline.test(withoutCountryCode)) {
        return 'landline';
    }

    return null;
}

/**
 * Phone validation result
 */
export interface PhoneValidationResult {
    valid: boolean;
    phone: string;
    normalized: string;
    type: 'mobile' | 'landline' | 'tollFree' | null;
    error?: string;
}

/**
 * Comprehensive phone validation with detailed result
 * @param phone - Phone number string
 * @returns Validation result object
 */
export function validateGreekPhone(phone: string): PhoneValidationResult {
    const normalized = normalizeGreekPhone(phone);

    if (!phone || phone.trim() === '') {
        return {
            valid: true, // Empty is valid (optional field)
            phone,
            normalized: '',
            type: null,
        };
    }

    if (!isValidGreekPhone(phone)) {
        return {
            valid: false,
            phone,
            normalized,
            type: null,
            error: 'Invalid Greek phone number format',
        };
    }

    return {
        valid: true,
        phone,
        normalized,
        type: getGreekPhoneType(phone),
    };
}

// ============================================
// Greek Postal Code Validation
// ============================================

/**
 * Greek Postal Codes (Ταχυδρομικός Κώδικας - ΤΚ)
 * 
 * Format: 5 digits
 * Range: 10000 - 99999
 * 
 * Common prefixes:
 * - 10xxx: Athens area
 * - 11xxx: Athens center
 * - 12xxx: Athens suburbs
 * - 13xxx: Athens suburbs
 * - 15xxx: Athens northern suburbs
 * - 16xxx: Athens southern suburbs
 * - 17xxx: Athens western suburbs
 * - 18xxx: Athens eastern suburbs
 * - 19xxx: Athens port areas
 * - 23xxx: Thessaloniki area
 * - 24xxx: Thessaloniki suburbs
 * - 54xxx: Thessaloniki center
 * - 55xxx: Thessaloniki suburbs
 * - 56xxx: Thessaloniki western suburbs
 * - 57xxx: Thessaloniki eastern suburbs
 */

/** Minimum valid Greek postal code */
export const MIN_POSTAL_CODE = 10000;

/** Maximum valid Greek postal code */
export const MAX_POSTAL_CODE = 99999;

/**
 * Validates Greek postal code format
 * @param postalCode - Postal code string
 * @returns true if valid format
 */
export function isValidGreekPostalCode(postalCode: string): boolean {
    if (!postalCode || typeof postalCode !== 'string') return false;

    const trimmed = postalCode.trim();

    // Must be exactly 5 digits
    if (!/^\d{5}$/.test(trimmed)) {
        return false;
    }

    const code = parseInt(trimmed, 10);

    return code >= MIN_POSTAL_CODE && code <= MAX_POSTAL_CODE;
}

/**
 * Normalizes postal code by removing whitespace
 * @param postalCode - Postal code string
 * @returns Normalized postal code
 */
export function normalizePostalCode(postalCode: string): string {
    if (!postalCode || typeof postalCode !== 'string') return '';

    return postalCode.trim().replace(/\s/g, '');
}

/**
 * Gets the region for a postal code (simplified)
 * @param postalCode - Postal code string
 * @returns Region name or null
 */
export function getPostalCodeRegion(postalCode: string): string | null {
    if (!isValidGreekPostalCode(postalCode)) return null;

    const prefix = parseInt(postalCode.trim().substring(0, 2), 10);

    // Simplified region mapping
    if (prefix >= 10 && prefix <= 19) {
        return 'Αττική';
    }

    if (prefix >= 23 && prefix <= 24) {
        return 'Θεσσαλονίκη';
    }

    if (prefix >= 54 && prefix <= 57) {
        return 'Θεσσαλονίκη';
    }

    if (prefix >= 31 && prefix <= 34) {
        return 'Κρήτη';
    }

    if (prefix >= 38 && prefix <= 39) {
        return 'Θεσσαλία';
    }

    if (prefix >= 40 && prefix <= 44) {
        return 'Μακεδονία';
    }

    if (prefix >= 49 && prefix <= 50) {
        return 'Ήπειρος';
    }

    if (prefix >= 62 && prefix <= 64) {
        return 'Νησιά Αιγαίου';
    }

    if (prefix >= 70 && prefix <= 73) {
        return 'Κεντρική Μακεδονία';
    }

    if (prefix >= 80 && prefix <= 85) {
        return 'Ανατολική Μακεδονία & Θράκη';
    }

    return null;
}

/**
 * Postal code validation result
 */
export interface PostalCodeValidationResult {
    valid: boolean;
    postalCode: string;
    normalized: string;
    region: string | null;
    error?: string;
}

/**
 * Comprehensive postal code validation with detailed result
 * @param postalCode - Postal code string
 * @returns Validation result object
 */
export function validateGreekPostalCode(postalCode: string): PostalCodeValidationResult {
    const normalized = normalizePostalCode(postalCode);

    if (!normalized) {
        return {
            valid: true, // Empty is valid (optional field)
            postalCode,
            normalized: '',
            region: null,
        };
    }

    if (normalized.length !== 5) {
        return {
            valid: false,
            postalCode,
            normalized,
            region: null,
            error: 'Greek postal code must be exactly 5 digits',
        };
    }

    if (!/^\d{5}$/.test(normalized)) {
        return {
            valid: false,
            postalCode,
            normalized,
            region: null,
            error: 'Postal code must contain only digits',
        };
    }

    const code = parseInt(normalized, 10);

    if (code < MIN_POSTAL_CODE || code > MAX_POSTAL_CODE) {
        return {
            valid: false,
            postalCode,
            normalized,
            region: null,
            error: `Postal code must be between ${MIN_POSTAL_CODE} and ${MAX_POSTAL_CODE}`,
        };
    }

    return {
        valid: true,
        postalCode,
        normalized,
        region: getPostalCodeRegion(normalized),
    };
}

// ============================================
// Zod Schemas
// ============================================

/**
 * AFM schema for form validation
 */
export const afmSchema = z.string()
    .trim()
    .transform(afm => afm.replace(/\s/g, ''))
    .refine(afm => afm === '' || isValidAFMFormat(afm), {
        message: 'AFM must be exactly 9 digits',
    })
    .refine(afm => afm === '' || validateAFMChecksum(afm), {
        message: 'Invalid AFM checksum',
    })
    .optional()
    .nullable();

/**
 * Required AFM schema
 */
export const requiredAFMSchema = z.string()
    .trim()
    .min(1, 'AFM is required')
    .transform(afm => afm.replace(/\s/g, ''))
    .refine(isValidAFMFormat, {
        message: 'AFM must be exactly 9 digits',
    })
    .refine(validateAFMChecksum, {
        message: 'Invalid AFM checksum',
    });

/**
 * Greek phone schema for form validation
 */
export const greekPhoneSchema = z.string()
    .trim()
    .transform(phone => normalizeGreekPhone(phone))
    .refine(phone => phone === '' || isValidGreekPhone(phone), {
        message: 'Invalid Greek phone number format',
    })
    .optional()
    .nullable();

/**
 * Required Greek phone schema
 */
export const requiredGreekPhoneSchema = z.string()
    .trim()
    .min(1, 'Phone number is required')
    .transform(phone => normalizeGreekPhone(phone))
    .refine(isValidGreekPhone, {
        message: 'Invalid Greek phone number format',
    });

/**
 * Greek postal code schema for form validation
 */
export const greekPostalCodeSchema = z.string()
    .trim()
    .transform(code => code.replace(/\s/g, ''))
    .refine(code => code === '' || isValidGreekPostalCode(code), {
        message: 'Greek postal code must be 5 digits (10000-99999)',
    })
    .optional()
    .nullable();

/**
 * Required Greek postal code schema
 */
export const requiredGreekPostalCodeSchema = z.string()
    .trim()
    .min(1, 'Postal code is required')
    .transform(code => code.replace(/\s/g, ''))
    .refine(isValidGreekPostalCode, {
        message: 'Greek postal code must be 5 digits (10000-99999)',
    });

// ============================================
// Combined Validation
// ============================================

/**
 * Validates all Greek-specific fields for a customer
 */
export interface GreekDataValidationResult {
    afm: AFMValidationResult;
    phone: PhoneValidationResult;
    mobile: PhoneValidationResult;
    postalCode: PostalCodeValidationResult;
    valid: boolean;
}

/**
 * Validates all Greek-specific customer data
 * @param data - Object containing Greek data fields
 * @returns Combined validation result
 */
export function validateGreekData(data: {
    afm?: string | null;
    phone?: string | null;
    mobile?: string | null;
    postalCode?: string | null;
}): GreekDataValidationResult {
    const afm = validateAFM(data.afm || '');
    const phone = validateGreekPhone(data.phone || '');
    const mobile = validateGreekPhone(data.mobile || '');
    const postalCode = validateGreekPostalCode(data.postalCode || '');

    const valid = afm.valid && phone.valid && mobile.valid && postalCode.valid;

    return {
        afm,
        phone,
        mobile,
        postalCode,
        valid,
    };
}

// ============================================
// Export all
// ============================================

const greekValidation = {
    // AFM
    validateAFMChecksum,
    isValidAFMFormat,
    isValidAFM,
    normalizeAFM,
    validateAFM,
    afmSchema,
    requiredAFMSchema,

    // Phone
    cleanPhoneNumber,
    normalizeGreekPhone,
    isValidGreekPhone,
    getGreekPhoneType,
    validateGreekPhone,
    greekPhoneSchema,
    requiredGreekPhoneSchema,
    GREEK_PHONE_PATTERNS,

    // Postal Code
    isValidGreekPostalCode,
    normalizePostalCode,
    getPostalCodeRegion,
    validateGreekPostalCode,
    greekPostalCodeSchema,
    requiredGreekPostalCodeSchema,
    MIN_POSTAL_CODE,
    MAX_POSTAL_CODE,

    // Combined
    validateGreekData,
};

export default greekValidation;
