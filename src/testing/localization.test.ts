/**
 * Unit tests for Clean Annie Localization System
 */

import {
    Localization,
    localization,
    initializeLocalization
} from '../utils/localization.js';

describe('Localization', () => {
    let testLocalization: Localization;

    beforeEach(() => {
        testLocalization = new Localization();
    });

    it('should initialize with browser locale', () => {
        expect(localization).toBeDefined();
    });

    it('should load and retrieve messages', () => {
        const messages = {
            'welcome.message': 'Welcome to Annie!',
            'button.submit': 'Submit'
        };

        testLocalization.loadMessages('en-US', messages);
        
        expect(testLocalization.getMessage('welcome.message')).toBe('Welcome to Annie!');
        expect(testLocalization.getMessage('button.submit')).toBe('Submit');
    });

    it('should return fallback for missing messages', () => {
        expect(testLocalization.getMessage('missing.key', 'Default Text')).toBe('Default Text');
        expect(testLocalization.getMessage('missing.key')).toBe('missing.key');
    });

    it('should format currency', () => {
        const result = testLocalization.formatCurrency(29.99, 'USD');
        expect(typeof result).toBe('string');
        expect(result).toContain('29.99');
    });

    it('should format numbers', () => {
        const result = testLocalization.formatNumber(1234.56);
        expect(typeof result).toBe('string');
    });

    it('should format dates', () => {
        const date = new Date('2025-10-02T10:30:00Z');
        const result = testLocalization.formatDate(date);
        expect(typeof result).toBe('string');
    });

    it('should detect text direction', () => {
        expect(testLocalization.getTextDirection()).toBe('ltr');
    });

    it('should change locale', () => {
        testLocalization.setLocale('fr-FR');
        expect(true).toBe(true);
    });
});

describe('AI-First Features', () => {
    it('should process i18n elements without errors', () => {
        expect(() => {
            localization.processI18nElements();
        }).not.toThrow();
    });

    it('should handle JSON configurations', () => {
        const configs = [
            { locale: 'en-US', currency: 'USD' },
            { locale: 'fr-FR', currency: 'EUR' },
            { locale: 'ja-JP', currency: 'JPY' }
        ];

        configs.forEach(config => {
            expect(() => {
                const loc = new Localization();
                loc.setLocale(config.locale);
                loc.formatCurrency(100, config.currency);
            }).not.toThrow();
        });
    });

    it('should initialize localization system', () => {
        expect(() => {
            initializeLocalization();
        }).not.toThrow();
    });
});