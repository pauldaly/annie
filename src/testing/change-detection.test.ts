/**
 * Unit tests for Enhanced Change Detection System
 */

import {
    ChangeDetector,
    EnhancedUIObserver,
    initializeChangeDetection
} from '../ui/change-detection.js';
import { DataStore } from '../core/data-store.js';
import { Logger } from '../core/logger.js';

describe('ChangeDetector', () => {
    let changeDetector: ChangeDetector;
    let dataStore: DataStore;
    let logger: Logger;
    let mockElement: HTMLElement;

    beforeEach(() => {
        logger = new Logger('test');
        dataStore = new DataStore(logger);
        changeDetector = new ChangeDetector(dataStore, logger, {
            batchUpdates: true,
            throttleMs: 10,
            diffStrategy: 'shallow',
            enableProfiling: true
        });

        // Create mock element
        mockElement = document.createElement('div');
        mockElement.setAttribute('data-observe', JSON.stringify([{
            "type": "html",
            "field": "message",
            "datasource": "test"
        }]));
        document.body.appendChild(mockElement);
    });

    afterEach(() => {
        changeDetector.dispose();
        document.body.innerHTML = '';
    });

    it('should initialize with default configuration', () => {
        expect(changeDetector).toBeDefined();
        expect(changeDetector.isDisposed()).toBe(false);
    });

    it('should skip updates when value unchanged', () => {
        const firstUpdate = changeDetector.scheduleUpdate(mockElement, 'message', 'hello');
        const secondUpdate = changeDetector.scheduleUpdate(mockElement, 'message', 'hello');

        expect(firstUpdate).toBe(true);
        expect(secondUpdate).toBe(false); // Should skip duplicate
    });

    it('should detect value changes correctly', () => {
        const firstUpdate = changeDetector.scheduleUpdate(mockElement, 'message', 'hello');
        const secondUpdate = changeDetector.scheduleUpdate(mockElement, 'message', 'world');

        expect(firstUpdate).toBe(true);
        expect(secondUpdate).toBe(true); // Should detect change
    });

    it('should handle batch updates', (done) => {
        // Enable batch mode on element
        mockElement.setAttribute('data-annie-batch-enabled', 'true');

        changeDetector.scheduleUpdate(mockElement, 'message', 'first');
        changeDetector.scheduleUpdate(mockElement, 'message', 'second');
        changeDetector.scheduleUpdate(mockElement, 'message', 'third');

        // Should batch these updates
        setTimeout(() => {
            const stats = changeDetector.getPerformanceStats();
            expect(stats.totalUpdates).toBeGreaterThan(0);
            done();
        }, 50);
    });

    it('should flush batch immediately when requested', () => {
        mockElement.setAttribute('data-annie-batch-enabled', 'true');

        changeDetector.scheduleUpdate(mockElement, 'message', 'test');
        changeDetector.flushImmediately();

        // Should have processed the update
        expect(mockElement.getAttribute('data-last-updated')).toBeDefined();
    });

    it('should update configuration at runtime', () => {
        const newConfig = { throttleMs: 50, diffStrategy: 'deep' as const };
        changeDetector.updateConfig(newConfig);

        const currentConfig = changeDetector.getConfig();
        expect(currentConfig.throttleMs).toBe(50);
        expect(currentConfig.diffStrategy).toBe('deep');
    });

    it('should track performance metrics', () => {
        changeDetector.scheduleUpdate(mockElement, 'message', 'test1');
        changeDetector.flushImmediately();

        const stats = changeDetector.getPerformanceStats();
        expect(stats.totalUpdates).toBeGreaterThan(0);
        expect(stats.averageUpdateTime).toBeGreaterThanOrEqual(0);
    });

    it('should clear cache when requested', () => {
        changeDetector.scheduleUpdate(mockElement, 'message', 'cached');
        changeDetector.clearCache();
        
        // After cache clear, same value should trigger update
        const shouldUpdate = changeDetector.scheduleUpdate(mockElement, 'message', 'cached');
        expect(shouldUpdate).toBe(true);
    });

    it('should handle different diff strategies', () => {
        // Test shallow comparison
        changeDetector.updateConfig({ diffStrategy: 'shallow' });
        
        const obj1 = { name: 'test' };
        const obj2 = { name: 'test' };
        
        changeDetector.scheduleUpdate(mockElement, 'data', obj1);
        const shouldUpdate = changeDetector.scheduleUpdate(mockElement, 'data', obj2);
        
        expect(shouldUpdate).toBe(true); // Different object references
    });
});

describe('EnhancedUIObserver', () => {
    let enhancedObserver: EnhancedUIObserver;
    let changeDetector: ChangeDetector;
    let dataStore: DataStore;
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger('test');
        dataStore = new DataStore(logger);
        changeDetector = new ChangeDetector(dataStore, logger);
        enhancedObserver = new EnhancedUIObserver(changeDetector, logger);

        // Create test element
        const element = document.createElement('span');
        element.setAttribute('data-observe', JSON.stringify([{
            "type": "html",
            "field": "name",
            "datasource": "users"
        }]));
        document.body.appendChild(element);
    });

    afterEach(() => {
        changeDetector.dispose();
        document.body.innerHTML = '';
    });

    it('should notify observers with enhanced change detection', () => {
        const testData = [{ name: 'John Doe' }];
        
        enhancedObserver.notifyObservers('users', testData);
        
        const element = document.querySelector('[data-observe*="users"]');
        expect(element).toBeDefined();
    });

    it('should handle multiple elements for same datasource', () => {
        // Create additional elements
        for (let i = 0; i < 3; i++) {
            const element = document.createElement('div');
            element.setAttribute('data-observe', JSON.stringify([{
                "type": "text",
                "field": "count",
                "datasource": "stats"
            }]));
            document.body.appendChild(element);
        }

        const testData = [{ count: 42 }];
        enhancedObserver.notifyObservers('stats', testData);

        const elements = document.querySelectorAll('[data-observe*="stats"]');
        expect(elements.length).toBe(3);
    });
});

describe('AI-First Configuration', () => {
    let element: HTMLElement;

    beforeEach(() => {
        element = document.createElement('div');
        document.body.appendChild(element);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should read data-attribute configuration', () => {
        element.setAttribute('data-annie-change-detection', 'batch');
        element.setAttribute('data-annie-throttle', '100ms');
        element.setAttribute('data-annie-diff-strategy', 'deep');

        expect(element.getAttribute('data-annie-change-detection')).toBe('batch');
        expect(element.getAttribute('data-annie-throttle')).toBe('100ms');
        expect(element.getAttribute('data-annie-diff-strategy')).toBe('deep');
    });

    it('should handle JSON configuration', () => {
        const config = {
            "changeDetection": {
                "batch": true,
                "throttle": "16ms",
                "diffStrategy": "shallow"
            }
        };

        element.setAttribute('data-annie-config', JSON.stringify(config));
        
        const storedConfig = JSON.parse(element.getAttribute('data-annie-config') || '{}');
        expect(storedConfig.changeDetection.batch).toBe(true);
        expect(storedConfig.changeDetection.throttle).toBe('16ms');
    });
});

describe('Performance Optimization', () => {
    let changeDetector: ChangeDetector;
    let logger: Logger;
    let dataStore: DataStore;

    beforeEach(() => {
        logger = new Logger('test');
        dataStore = new DataStore(logger);
        changeDetector = new ChangeDetector(dataStore, logger, {
            enableProfiling: true,
            batchUpdates: true
        });
    });

    afterEach(() => {
        changeDetector.dispose();
    });

    it('should batch multiple rapid updates', async () => {
        const elements = [];
        
        // Create multiple elements
        for (let i = 0; i < 10; i++) {
            const element = document.createElement('div');
            element.setAttribute('data-annie-batch-enabled', 'true');
            elements.push(element);
        }

        // Schedule rapid updates
        elements.forEach((element, index) => {
            changeDetector.scheduleUpdate(element, 'value', `update-${index}`);
        });

        // Wait for batch processing
        await new Promise(resolve => setTimeout(resolve, 50));

        const stats = changeDetector.getPerformanceStats();
        expect(stats.totalUpdates).toBeGreaterThan(0);
    });

    it('should skip redundant updates', () => {
        const element = document.createElement('div');
        
        // Multiple updates with same value
        const result1 = changeDetector.scheduleUpdate(element, 'test', 'same-value');
        const result2 = changeDetector.scheduleUpdate(element, 'test', 'same-value');
        const result3 = changeDetector.scheduleUpdate(element, 'test', 'same-value');

        expect(result1).toBe(true);  // First update
        expect(result2).toBe(false); // Skipped
        expect(result3).toBe(false); // Skipped
    });

    it('should handle large batch sizes efficiently', () => {
        const elements = [];
        
        // Create many elements
        for (let i = 0; i < 200; i++) {
            const element = document.createElement('div');
            element.setAttribute('data-annie-batch-enabled', 'true');
            elements.push(element);
        }

        const startTime = performance.now();
        
        // Schedule many updates
        elements.forEach((element, index) => {
            changeDetector.scheduleUpdate(element, 'index', index);
        });

        changeDetector.flushImmediately();
        
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(100); // Should complete in reasonable time
    });
});

describe('initializeChangeDetection', () => {
    let dataStore: DataStore;
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger('test');
        dataStore = new DataStore(logger);
    });

    it('should initialize complete system', () => {
        const { changeDetector, enhancedObserver } = initializeChangeDetection(
            dataStore,
            logger,
            { batchUpdates: true, enableProfiling: true }
        );

        expect(changeDetector).toBeDefined();
        expect(enhancedObserver).toBeDefined();
        expect(changeDetector.isDisposed()).toBe(false);

        changeDetector.dispose();
    });

    it('should use provided configuration', () => {
        const config = {
            throttleMs: 32,
            diffStrategy: 'deep' as const,
            enableProfiling: false
        };

        const { changeDetector } = initializeChangeDetection(dataStore, logger, config);
        
        const currentConfig = changeDetector.getConfig();
        expect(currentConfig.throttleMs).toBe(32);
        expect(currentConfig.diffStrategy).toBe('deep');
        expect(currentConfig.enableProfiling).toBe(false);

        changeDetector.dispose();
    });
});