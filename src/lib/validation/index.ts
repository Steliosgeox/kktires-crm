/**
 * Validation Utilities Index
 * 
 * Central export point for all validation utilities
 */

// Email validation
export {
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
    type EmailValidationResult,
    type BulkValidationResult,
} from './email';

// Greek data validation
export {
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
    type AFMValidationResult,
    type PhoneValidationResult,
    type PostalCodeValidationResult,
    type GreekDataValidationResult,
} from './greek';
