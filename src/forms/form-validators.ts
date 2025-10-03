/**
 * Form Validation Utilities
 * Provides common validation functions and patterns for Annie forms
 */

import { ValidationResult } from '../utils/type-guards.js';
import { FormField, ReactiveForm } from './reactive-form.js';

export class FormValidators {
  /**
   * Required field validator
   */
  static required(message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      const isValid = value != null && value !== '' && value !== false;
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} is required`],
        warnings: []
      };
    };
  }

  /**
   * Email format validator
   */
  static email(message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(value);
      
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} must be a valid email address`],
        warnings: []
      };
    };
  }

  /**
   * URL format validator
   */
  static url(message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      try {
        new URL(value);
        return { isValid: true, errors: [], warnings: [] };
      } catch {
        return {
          isValid: false,
          errors: [message || `${field.label || field.name} must be a valid URL`],
          warnings: []
        };
      }
    };
  }

  /**
   * Minimum length validator
   */
  static minLength(min: number, message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const isValid = value.length >= min;
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} must be at least ${min} characters long`],
        warnings: []
      };
    };
  }

  /**
   * Maximum length validator
   */
  static maxLength(max: number, message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const isValid = value.length <= max;
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} must be no more than ${max} characters long`],
        warnings: []
      };
    };
  }

  /**
   * Numeric range validator
   */
  static range(min: number, max: number, message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (value == null || value === '') return { isValid: true, errors: [], warnings: [] };
      
      const num = Number(value);
      const isValid = !isNaN(num) && num >= min && num <= max;
      
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} must be between ${min} and ${max}`],
        warnings: []
      };
    };
  }

  /**
   * Pattern (regex) validator
   */
  static pattern(pattern: RegExp, message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const isValid = pattern.test(value);
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} format is invalid`],
        warnings: []
      };
    };
  }

  /**
   * Phone number validator (US format)
   */
  static phoneUS(message?: string) {
    const phoneRegex = /^[\+]?[(]?[\+]?\d{3}[)]?[-\s\.]?\d{3}[-\s\.]?\d{4,6}$/;
    return FormValidators.pattern(phoneRegex, message || 'Please enter a valid phone number');
  }

  /**
   * Credit card number validator (basic Luhn algorithm)
   */
  static creditCard(message?: string) {
    return (value: any, field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      // Remove spaces and dashes
      const cleaned = value.replace(/[\s-]/g, '');
      
      // Check if all digits and reasonable length
      if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
        return {
          isValid: false,
          errors: [message || `${field.label || field.name} must be a valid credit card number`],
          warnings: []
        };
      }

      // Simple Luhn algorithm check
      let sum = 0;
      let isEven = false;
      
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        
        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit = digit % 10 + 1;
          }
        }
        
        sum += digit;
        isEven = !isEven;
      }
      
      const isValid = sum % 10 === 0;
      return {
        isValid,
        errors: isValid ? [] : [message || `${field.label || field.name} must be a valid credit card number`],
        warnings: []
      };
    };
  }

  /**
   * Modern password strength validator based on NIST SP 800-63B guidelines
   * Emphasizes length over complexity, following Bill Burr's updated recommendations
   * Length is the primary security factor - complexity requirements train users to create
   * passwords that are hard to remember for humans but easy to guess for computers
   */
  static passwordStrength(options: {
    minLength?: number;
    maxLength?: number;
    checkCommonPasswords?: boolean;
    apiEndpoint?: string;
    allowLegacyComplexity?: boolean;
  } = {}, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (value: any, _field: FormField): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const {
        minLength = 12, // NIST recommends minimum 8, but 12+ is much better
        maxLength = 128, // NIST maximum to prevent DoS
        checkCommonPasswords = true,
        allowLegacyComplexity = false
      } = options;
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Length is the primary security factor
      if (value.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
      }
      
      if (value.length > maxLength) {
        errors.push(`Password cannot exceed ${maxLength} characters`);
      }
      
      // Check for obvious weak patterns
      if (/^(.)\1+$/.test(value)) {
        errors.push('Password cannot be all the same character');
      }
      
      // Check for keyboard patterns and common weak passwords
      const weakPatterns = [
        /qwerty|asdfgh|zxcvbn/i,
        /123456|654321|111111|000000/,
        /password|welcome|admin|login|user|guest/i,
        /^(.{1,3})\1{2,}$/i // Repeated short patterns like "abcabc"
      ];
      
      for (const pattern of weakPatterns) {
        if (pattern.test(value)) {
          errors.push('Password contains common patterns that are easy to guess');
          break;
        }
      }
      
      // Check against most common passwords (basic client-side list)
      if (checkCommonPasswords) {
        const commonPasswords = [
          'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
          'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
          'master', 'hello', 'login', 'welcome123', 'admin123', 'root',
          'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql', 'user',
          'administrator', 'oracle', 'ftp', 'pi', 'puppet', 'ansible',
          'ec2-user', 'vagrant', 'azureuser', 'demo', 'web', 'www',
          'changeme', 'default', 'temp', 'temporary', '12345', '1234',
          'superman', 'batman', 'football', 'baseball', 'princess'
        ];
        
        if (commonPasswords.includes(value.toLowerCase())) {
          errors.push('This password is too common and easily guessed');
        }
      }
      
      // Provide positive feedback for good length
      if (value.length >= 20) {
        // Excellent length - no warning needed
      } else if (value.length >= 16) {
        warnings.push('Excellent length! This provides strong security');
      } else if (value.length >= 12) {
        warnings.push('Good length! Consider 16+ characters for maximum security');
      }
      
      // Check character diversity (informational, not required)
      const hasLower = /[a-z]/.test(value);
      const hasUpper = /[A-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'<>?/~`]/.test(value);
      const hasSpace = /\s/.test(value);
      
      const diversityCount = [hasLower, hasUpper, hasNumber, hasSymbol, hasSpace].filter(Boolean).length;
      
      // Only suggest diversity if password is reasonably long
      if (value.length >= 12 && diversityCount === 1) {
        warnings.push('Consider mixing different types of characters for added security');
      }
      
      // Legacy complexity mode (for backwards compatibility only)
      if (allowLegacyComplexity && value.length >= 8 && value.length < 12) {
        warnings.push('Legacy mode: For passwords under 12 characters, complexity requirements apply');
        if (diversityCount < 3) {
          errors.push('Legacy mode requires at least 3 character types (uppercase, lowercase, numbers, symbols)');
        }
      }
      
      // Check for personal information patterns (basic)
      if (/\b(name|email|user|admin|birth|date|year|month|day|123|abc)\b/i.test(value)) {
        warnings.push('Avoid using predictable words or sequences');
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? (message ? [message] : errors) : [],
        warnings
      };
    };
  }

  /**
   * Advanced password security check with API integration
   * Checks against known compromised passwords using k-anonymity (like Have I Been Pwned)
   * This is the proper way to check passwords against breach databases
   */
  static async checkPasswordCompromised(password: string, options: {
    apiEndpoint?: string;
    timeout?: number;
  } = {}): Promise<{
    isCompromised: boolean;
    breachCount?: number;
    error?: string;
  }> {
    if (!password || password.length < 4) {
      return { isCompromised: false };
    }

    const { apiEndpoint, timeout = 5000 } = options;

    try {
      // Use k-anonymity: hash password and only send first 5 characters
      // This protects the full password from being sent over the network
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);
      
      // Use custom endpoint or fallback to Have I Been Pwned API
      const endpoint = apiEndpoint || `https://api.pwnedpasswords.com/range/${prefix}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'Annie-Forms-API/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { 
          isCompromised: false, 
          error: `API check failed: ${response.status}` 
        };
      }
      
      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        const [hashSuffix, count] = line.trim().split(':');
        if (hashSuffix === suffix) {
          return {
            isCompromised: true,
            breachCount: parseInt(count, 10)
          };
        }
      }
      
      return { isCompromised: false };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { 
          isCompromised: false, 
          error: 'Request timeout - could not check password database' 
        };
      }
      
      return { 
        isCompromised: false, 
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Complete async password validator with compromise checking
   * This is the recommended validator for production use
   */
  static advancedPasswordValidator(options: {
    minLength?: number;
    maxLength?: number;
    checkCommonPasswords?: boolean;
    checkCompromised?: boolean;
    apiEndpoint?: string;
    apiTimeout?: number;
    allowLegacyComplexity?: boolean;
  } = {}) {
    return async (value: any, field: FormField): Promise<ValidationResult> => {
      // First run basic validation synchronously
      const basicValidator = FormValidators.passwordStrength({
        minLength: options.minLength,
        maxLength: options.maxLength,
        checkCommonPasswords: options.checkCommonPasswords,
        allowLegacyComplexity: options.allowLegacyComplexity
      });
      const basicResult = basicValidator(value, field);
      
      if (!basicResult.isValid || !value || !options.checkCompromised) {
        return basicResult;
      }
      
      // Then check for compromised passwords if enabled and online
      if (value.length >= 4) {
        try {
          const compromiseCheck = await FormValidators.checkPasswordCompromised(value, {
            apiEndpoint: options.apiEndpoint,
            timeout: options.apiTimeout
          });
          
          if (compromiseCheck.isCompromised) {
            const count = compromiseCheck.breachCount || 0;
            if (count > 100) {
              basicResult.errors.push(
                `This password has been found in ${count.toLocaleString()} data breaches - please choose a different one`
              );
            } else {
              basicResult.errors.push(
                'This password has been found in data breaches - please choose a different one'
              );
            }
            basicResult.isValid = false;
          } else if (compromiseCheck.error) {
            basicResult.warnings.push(
              'Unable to verify password against breach databases (offline check only)'
            );
          }
        } catch {
          basicResult.warnings.push(
            'Could not verify password security online - using offline checks only'
          );
        }
      }
      
      return basicResult;
    };
  }

  /**
   * Confirm password validator
   */
  static confirmPassword(passwordFieldName: string, message?: string) {
    return (value: any, field: FormField, form: ReactiveForm): ValidationResult => {
      if (!value) return { isValid: true, errors: [], warnings: [] };
      
      const passwordValue = form.getValue(passwordFieldName);
      const isValid = value === passwordValue;
      
      return {
        isValid,
        errors: isValid ? [] : [message || 'Passwords do not match'],
        warnings: []
      };
    };
  }

  /**
   * File type validator
   */
  static fileType(allowedTypes: string[], message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (value: any, _field: FormField): ValidationResult => {
      if (!value || !(value instanceof FileList) || value.length === 0) {
        return { isValid: true, errors: [], warnings: [] };
      }
      
      const errors: string[] = [];
      
      Array.from(value).forEach((file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type.toLowerCase();
        
        const isValidType = allowedTypes.some(type => 
          type.toLowerCase() === extension ||
          type.toLowerCase() === mimeType ||
          (type.includes('*') && mimeType.startsWith(type.replace('*', '')))
        );
        
        if (!isValidType) {
          errors.push(`${file.name} is not an allowed file type`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? [message || `Allowed file types: ${allowedTypes.join(', ')}`] : [],
        warnings: []
      };
    };
  }

  /**
   * File size validator
   */
  static fileSize(maxSizeBytes: number, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (value: any, _field: FormField): ValidationResult => {
      if (!value || !(value instanceof FileList) || value.length === 0) {
        return { isValid: true, errors: [], warnings: [] };
      }
      
      const errors: string[] = [];
      const maxSizeMB = maxSizeBytes / (1024 * 1024);
      
      Array.from(value).forEach((file: File) => {
        if (file.size > maxSizeBytes) {
          errors.push(`${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? [message || `Maximum file size: ${maxSizeMB}MB`] : [],
        warnings: []
      };
    };
  }

  /**
   * Custom async validator
   */
  static async(
    validator: (value: any, field: FormField, form: ReactiveForm) => Promise<ValidationResult>
  ) {
    return validator;
  }

  /**
   * Compose multiple validators
   */
  static compose(validators: Array<(value: any, field: FormField, form: ReactiveForm) => ValidationResult>) {
    return (value: any, field: FormField, form: ReactiveForm): ValidationResult => {
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      let allValid = true;
      
      validators.forEach(validator => {
        const result = validator(value, field, form);
        if (!result.isValid) {
          allValid = false;
        }
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      });
      
      return {
        isValid: allValid,
        errors: allErrors,
        warnings: allWarnings
      };
    };
  }
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneUS: /^[\+]?[(]?[\+]?\d{3}[)]?[-\s\.]?\d{3}[-\s\.]?\d{4,6}$/,
  zipCodeUS: /^\d{5}(-\d{4})?$/,
  socialSecurityNumber: /^\d{3}-?\d{2}-?\d{4}$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
};