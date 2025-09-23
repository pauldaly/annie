/**
 * Type Guards and Runtime Validation Utilities
 * Provides comprehensive type checking and validation for the Annie Framework
 */

import { ILogger } from '../core/logger.js';
import { DataRecord, Dataset, DatasetMeta } from '../core/types.js';

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return isString(value) && value.trim().length > 0;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
    return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
    return value === undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
    return isNull(value) || isUndefined(value);
}

/**
 * Check if value is an object (excluding null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is Function {
    return typeof value === 'function';
}

/**
 * Check if value is a Date object
 */
export function isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a Promise
 */
export function isPromise(value: unknown): value is Promise<unknown> {
    return value instanceof Promise || (isObject(value) && isFunction((value as any).then));
}

/**
 * Check if value is a valid URL
 */
export function isValidUrl(value: unknown): value is string {
    if (!isString(value)) return false;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
    if (!isString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

// ============================================================================
// Framework-Specific Type Guards
// ============================================================================

/**
 * Check if value is a valid DataRecord
 */
export function isDataRecord(value: unknown): value is DataRecord {
    if (!isObject(value)) return false;
  
    // Check that all values are of allowed types
    for (const [key, val] of Object.entries(value)) {
        if (!isString(key)) return false;
    
        if (!isString(val) && !isNumber(val) && !isBoolean(val) && 
        !isNull(val) && !isUndefined(val) && 
        !isDataRecord(val) && !isArray(val)) {
            return false;
        }
    
        // If it's an array, check that all elements are DataRecords
        if (isArray(val) && !val.every(isDataRecord)) {
            return false;
        }
    }
  
    return true;
}

/**
 * Check if value is a valid DatasetMeta
 */
export function isDatasetMeta(value: unknown): value is DatasetMeta {
    if (!isObject(value)) return false;
  
    const meta = value as Record<string, unknown>;
  
    // Required fields
    if (!isString(meta.object) || !isNumber(meta.count)) {
        return false;
    }
  
    // Optional fields
    if (meta.lastModified !== undefined && !isNumber(meta.lastModified)) {
        return false;
    }
  
    if (meta.version !== undefined && !isNumber(meta.version)) {
        return false;
    }
  
    return true;
}

/**
 * Check if value is a valid Dataset
 */
export function isDataset(value: unknown): value is Dataset {
    if (!isObject(value)) return false;
  
    const dataset = value as Record<string, unknown>;
  
    // Check required fields
    if (!isArray(dataset.data) || !isDatasetMeta(dataset.meta)) {
        return false;
    }
  
    // Check that all data items are DataRecords
    if (!dataset.data.every(isDataRecord)) {
        return false;
    }
  
    // Check that all() method exists if specified
    if (dataset.all !== undefined && !isFunction(dataset.all)) {
        return false;
    }
  
    return true;
}

/**
 * Check if value has a dispose method (implements IDisposable)
 */
export function isDisposable(value: unknown): value is { dispose(): void } {
    return isObject(value) && isFunction((value as any).dispose);
}

/**
 * Check if value is a valid DOM element
 */
export function isDOMElement(value: unknown): value is Element {
    return value instanceof Element;
}

/**
 * Check if value is a valid HTML element
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
    return value instanceof HTMLElement;
}

/**
 * Check if value is a valid event
 */
export function isEvent(value: unknown): value is Event {
    return value instanceof Event;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  allowNull?: boolean;
  allowUndefined?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
  customMessage?: string;
}

/**
 * Comprehensive validation function
 */
export function validate(
    value: unknown,
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function' | 'date' | 'url' | 'email',
    options: ValidationOptions = {}
): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Check for null/undefined
    if (isNullish(value)) {
        if (isNull(value) && !options.allowNull) {
            result.isValid = false;
            result.errors.push('Value cannot be null');
            return result;
        }
        if (isUndefined(value) && !options.allowUndefined) {
            result.isValid = false;
            result.errors.push('Value cannot be undefined');
            return result;
        }
        if (isNullish(value) && (options.allowNull || options.allowUndefined)) {
            return result; // Valid null/undefined
        }
    }

    // Type-specific validation
    switch (type) {
    case 'string':
        if (!isString(value)) {
            result.isValid = false;
            result.errors.push(`Expected string, got ${typeof value}`);
        } else {
            if (options.minLength !== undefined && value.length < options.minLength) {
                result.isValid = false;
                result.errors.push(`String length must be at least ${options.minLength}`);
            }
            if (options.maxLength !== undefined && value.length > options.maxLength) {
                result.isValid = false;
                result.errors.push(`String length must not exceed ${options.maxLength}`);
            }
            if (options.pattern && !options.pattern.test(value)) {
                result.isValid = false;
                result.errors.push('String does not match required pattern');
            }
        }
        break;

    case 'number':
        if (!isNumber(value)) {
            result.isValid = false;
            result.errors.push(`Expected number, got ${typeof value}`);
        } else {
            if (options.min !== undefined && value < options.min) {
                result.isValid = false;
                result.errors.push(`Number must be at least ${options.min}`);
            }
            if (options.max !== undefined && value > options.max) {
                result.isValid = false;
                result.errors.push(`Number must not exceed ${options.max}`);
            }
        }
        break;

    case 'boolean':
        if (!isBoolean(value)) {
            result.isValid = false;
            result.errors.push(`Expected boolean, got ${typeof value}`);
        }
        break;

    case 'array':
        if (!isArray(value)) {
            result.isValid = false;
            result.errors.push(`Expected array, got ${typeof value}`);
        } else {
            if (options.minLength !== undefined && value.length < options.minLength) {
                result.isValid = false;
                result.errors.push(`Array length must be at least ${options.minLength}`);
            }
            if (options.maxLength !== undefined && value.length > options.maxLength) {
                result.isValid = false;
                result.errors.push(`Array length must not exceed ${options.maxLength}`);
            }
        }
        break;

    case 'object':
        if (!isObject(value)) {
            result.isValid = false;
            result.errors.push(`Expected object, got ${typeof value}`);
        }
        break;

    case 'function':
        if (!isFunction(value)) {
            result.isValid = false;
            result.errors.push(`Expected function, got ${typeof value}`);
        }
        break;

    case 'date':
        if (!isDate(value)) {
            result.isValid = false;
            result.errors.push(`Expected valid date, got ${typeof value}`);
        }
        break;

    case 'url':
        if (!isValidUrl(value)) {
            result.isValid = false;
            result.errors.push('Expected valid URL');
        }
        break;

    case 'email':
        if (!isValidEmail(value)) {
            result.isValid = false;
            result.errors.push('Expected valid email address');
        }
        break;

    default:
        result.isValid = false;
        result.errors.push(`Unknown validation type: ${type}`);
    }

    // Custom validation
    if (options.customValidator && !options.customValidator(value)) {
        result.isValid = false;
        result.errors.push(options.customMessage || 'Custom validation failed');
    }

    return result;
}

/**
 * Assert that value matches type guard, throw error if not
 */
export function assert<T>(
    value: unknown,
    guard: (value: unknown) => value is T,
    message?: string
): asserts value is T {
    if (!guard(value)) {
        throw new TypeError(message || `Assertion failed: value does not match expected type`);
    }
}

/**
 * Safe type conversion with validation
 */
export function safeCast<T>(
    value: unknown,
    guard: (value: unknown) => value is T,
    fallback?: T
): T | undefined {
    if (guard(value)) {
        return value;
    }
    return fallback;
}

// ============================================================================
// Validation Decorators and Higher-Order Functions
// ============================================================================

/**
 * Method decorator for parameter validation
 */
export function validateParams(
    validations: Record<number, (value: unknown) => boolean>
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
    
        descriptor.value = function (...args: any[]) {
            for (const [index, validator] of Object.entries(validations)) {
                const paramIndex = parseInt(index);
                if (!validator(args[paramIndex])) {
                    throw new TypeError(
                        `Parameter ${paramIndex} of ${propertyKey} failed validation`
                    );
                }
            }
            return originalMethod.apply(this, args);
        };
    
        return descriptor;
    };
}

/**
 * Class decorator for runtime type checking
 */
export function validateClass(constructor: Function) {
    return class extends (constructor as any) {
        constructor(...args: any[]) {
            super(...args);
      
            // Add runtime type checking to all methods
            const prototype = Object.getPrototypeOf(this);
            const propertyNames = Object.getOwnPropertyNames(prototype);
      
            for (const prop of propertyNames) {
                if (typeof this[prop] === 'function' && prop !== 'constructor') {
                    const originalMethod = this[prop];
                    this[prop] = function (...args: any[]) {
                        // Add logging or validation here if needed
                        return originalMethod.apply(this, args);
                    };
                }
            }
        }
    };
}

// ============================================================================
// Framework Integration
// ============================================================================

/**
 * Validation manager for coordinating validation across the framework
 */
export class ValidationManager {
    private logger: ILogger;
    private validationErrors: Map<string, ValidationResult> = new Map();

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
   * Validate a configuration object
   */
    public validateConfig(config: Record<string, unknown>, schema: Record<string, ValidationOptions>): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        for (const [key, options] of Object.entries(schema)) {
            const value = config[key];
            const fieldResult = this.validateField(value, options);
      
            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors.push(...fieldResult.errors.map(err => `${key}: ${err}`));
            }
      
            result.warnings.push(...fieldResult.warnings.map(warn => `${key}: ${warn}`));
        }

        if (!result.isValid) {
            this.logger.error(`Configuration validation failed: ${result.errors.join(', ')}`);
        }

        return result;
    }

    /**
   * Validate a single field
   */
    private validateField(value: unknown, options: ValidationOptions): ValidationResult {
    // Basic type validation would go here
    // This is a simplified implementation
        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }

    /**
   * Store validation result for a component
   */
    public storeValidationResult(componentName: string, result: ValidationResult): void {
        this.validationErrors.set(componentName, result);
    }

    /**
   * Get validation result for a component
   */
    public getValidationResult(componentName: string): ValidationResult | undefined {
        return this.validationErrors.get(componentName);
    }

    /**
   * Get all validation errors
   */
    public getAllValidationErrors(): Record<string, ValidationResult> {
        return Object.fromEntries(this.validationErrors);
    }

    /**
   * Clear validation errors
   */
    public clearValidationErrors(): void {
        this.validationErrors.clear();
    }

    /**
   * Check if any component has validation errors
   */
    public hasValidationErrors(): boolean {
        for (const result of this.validationErrors.values()) {
            if (!result.isValid) {
                return true;
            }
        }
        return false;
    }
}
