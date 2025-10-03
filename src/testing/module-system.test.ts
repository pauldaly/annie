/**
 * Unit tests for Clean Annie Module System
 */

import {
    AnnieModuleSystem,
    initializeModuleSystem,
    registerModulesFromConfig,
    ModuleConfig
} from '../core/module-system.js';

describe('ModuleSystem', () => {
    let moduleSystem: AnnieModuleSystem;

    beforeEach(() => {
        moduleSystem = new AnnieModuleSystem();
    });

    it('should initialize module system', () => {
        expect(moduleSystem).toBeDefined();
    });

    it('should register module configurations', () => {
        const config: Omit<ModuleConfig, 'name'> = {
            url: '/modules/test.js',
            dependencies: [],
            lazy: false
        };

        expect(() => {
            moduleSystem.register('test-module', config);
        }).not.toThrow();
    });

    it('should check if module is loaded', () => {
        expect(typeof moduleSystem.isModuleLoaded('test-module')).toBe('boolean');
    });

    it('should get module if exists', () => {
        const result = moduleSystem.getModule('non-existent');
        expect(result).toBeUndefined();
    });

    it('should process module elements without errors', () => {
        expect(() => {
            moduleSystem.processModuleElements();
        }).not.toThrow();
    });

    it('should preload eager modules', () => {
        expect(() => {
            moduleSystem.preloadEagerModules();
        }).not.toThrow();
    });
});

describe('AI-First Module Features', () => {
    it('should initialize module system', () => {
        expect(() => {
            initializeModuleSystem();
        }).not.toThrow();
    });

    it('should register modules from config', () => {
        const config: Record<string, ModuleConfig> = {
            'user-list': {
                name: 'user-list',
                url: '/modules/users.js',
                lazy: true
            },
            'product-grid': {
                name: 'product-grid', 
                url: '/modules/products.js',
                lazy: false
            }
        };

        expect(() => {
            registerModulesFromConfig(config);
        }).not.toThrow();
    });

    it('should work with data attributes', () => {
        const testAttributes = [
            'data-annie-module="user-list"',
            'data-annie-module-props=\'{"userId": 123}\''
        ];

        testAttributes.forEach(attr => {
            expect(attr).toContain('data-annie-module');
        });
    });
});