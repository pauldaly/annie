/**
 * Enhanced Change Detection System for Annie Framework
 * Optimizes data-observe updates with smart diffing and batch processing
 */

import { ILogger } from '../core/logger.js';
import { DataStore } from '../core/data-store.js';
import { IDisposable } from '../core/di-container.js';

export interface ChangeDetectionConfig {
    batchUpdates: boolean;
    throttleMs: number;
    diffStrategy: 'shallow' | 'deep' | 'none';
    enableProfiling: boolean;
    maxBatchSize: number;
}

export interface ElementUpdate {
    element: HTMLElement;
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
}

export interface PerformanceMetrics {
    datasource: string;
    elementCount: number;
    duration: number;
    changedElements: number;
    skippedElements: number;
    batchSize: number;
    timestamp: number;
}

/**
 * Smart Change Detection Engine
 * Enhances existing data-observe with performance optimizations
 */
export class ChangeDetector implements IDisposable {
    private pendingUpdates = new Map<HTMLElement, ElementUpdate>();
    private batchTimer: number | null = null;
    private config: ChangeDetectionConfig;
    private logger: ILogger;
    private dataStore: DataStore;
    private disposed: boolean = false;
    private performanceMetrics: PerformanceMetrics[] = [];
    private elementValueCache = new WeakMap<HTMLElement, any>();

    constructor(dataStore: DataStore, logger: ILogger, config: Partial<ChangeDetectionConfig> = {}) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.config = {
            batchUpdates: true,
            throttleMs: 16, // 60fps
            diffStrategy: 'shallow',
            enableProfiling: true,
            maxBatchSize: 100,
            ...config
        };

        this.initializeChangeDetection();
    }

    /**
     * Initialize change detection on data-observe elements
     */
    private initializeChangeDetection(): void {
        const elements = document.querySelectorAll('[data-observe]');
        
        elements.forEach(element => {
            this.setupElementChangeDetection(element as HTMLElement);
        });

        this.logger.debug(`Change detection initialized for ${elements.length} elements`);
    }

    /**
     * Setup change detection configuration for individual elements
     */
    private setupElementChangeDetection(element: HTMLElement): void {
        // Read element-specific configuration
        const batchMode = element.getAttribute('data-annie-change-detection') === 'batch';
        const throttleAttr = element.getAttribute('data-annie-throttle');
        const diffAttr = element.getAttribute('data-annie-diff-strategy');

        // Store element configuration
        if (batchMode) element.setAttribute('data-annie-batch-enabled', 'true');
        if (throttleAttr) element.setAttribute('data-annie-throttle-ms', throttleAttr);
        if (diffAttr) element.setAttribute('data-annie-diff-mode', diffAttr);
    }

    /**
     * Schedule an element update with smart diffing
     */
    scheduleUpdate(element: HTMLElement, field: string, newValue: any): boolean {
        if (this.disposed) return false;
        
        // Smart diffing - check if value actually changed
        const oldValue = this.elementValueCache.get(element);
        const hasChanged = this.hasValueChanged(oldValue, newValue, element);

        if (!hasChanged && this.config.diffStrategy !== 'none') {
            this.logger.debug(`Skipping update for ${field} - value unchanged`);
            return false;
        }

        // Create update record
        const update: ElementUpdate = {
            element,
            field,
            oldValue,
            newValue,
            timestamp: Date.now()
        };

        // Store new value in cache
        this.elementValueCache.set(element, newValue);

        // Check if element prefers batch updates
        const prefersBatch = element.getAttribute('data-annie-batch-enabled') === 'true' || this.config.batchUpdates;

        if (prefersBatch) {
            this.addToBatch(update);
        } else {
            this.executeUpdate(update);
        }

        return true;
    }

    /**
     * Smart value comparison based on diff strategy
     */
    private hasValueChanged(oldValue: any, newValue: any, element: HTMLElement): boolean {
        const strategy = element.getAttribute('data-annie-diff-mode') || this.config.diffStrategy;

        switch (strategy) {
            case 'none':
                return true; // Always update

            case 'shallow':
                return oldValue !== newValue;

            case 'deep':
                return !this.deepEqual(oldValue, newValue);

            default:
                return oldValue !== newValue;
        }
    }

    /**
     * Deep equality check for complex objects
     */
    private deepEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;

        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.deepEqual(a[key], b[key])) return false;
            }
            
            return true;
        }

        return false;
    }

    /**
     * Add update to batch queue
     */
    private addToBatch(update: ElementUpdate): void {
        this.pendingUpdates.set(update.element, update);

        // Check throttling
        const throttleMs = parseInt(update.element.getAttribute('data-annie-throttle-ms') || '') || this.config.throttleMs;

        if (this.batchTimer === null) {
            this.batchTimer = window.setTimeout(() => {
                this.flushBatch();
            }, throttleMs);
        }

        // Force flush if batch gets too large
        if (this.pendingUpdates.size >= this.config.maxBatchSize) {
            this.flushBatch();
        }
    }

    /**
     * Execute all pending batch updates
     */
    private flushBatch(): void {
        if (this.pendingUpdates.size === 0) return;

        const startTime = performance.now();
        const updates = Array.from(this.pendingUpdates.values());
        const updatedElements: HTMLElement[] = [];

        this.logger.debug(`Flushing batch of ${updates.length} updates`);

        // Process all updates in the batch
        updates.forEach(update => {
            this.executeUpdate(update);
            updatedElements.push(update.element);
        });

        const duration = performance.now() - startTime;

        // Record performance metrics
        if (this.config.enableProfiling) {
            this.recordPerformanceMetrics({
                datasource: 'batch',
                elementCount: updatedElements.length,
                duration,
                changedElements: updatedElements.length,
                skippedElements: 0,
                batchSize: updates.length,
                timestamp: Date.now()
            });
        }

        // Clear batch
        this.pendingUpdates.clear();
        this.batchTimer = null;

        this.logger.debug(`Batch update completed in ${duration.toFixed(2)}ms`);
    }

    /**
     * Execute a single update
     */
    private executeUpdate(update: ElementUpdate): void {
        try {
            const { element, newValue } = update;

            // Apply the update to the element
            this.applyValueToElement(element, newValue);

            // Mark element as updated
            element.setAttribute('data-last-updated', update.timestamp.toString());

        } catch (error) {
            this.logger.error(`Failed to update element: ${error}`);
        }
    }

    /**
     * Apply new value to DOM element based on data-observe configuration
     */
    private applyValueToElement(element: HTMLElement, value: any): void {
        const observeAttr = element.getAttribute('data-observe');
        if (!observeAttr) return;

        try {
            const observeConfigs = JSON.parse(observeAttr);
            const configs = Array.isArray(observeConfigs) ? observeConfigs : [observeConfigs];

            configs.forEach(config => {
                switch (config.type) {
                    case 'html':
                        element.innerHTML = String(value || '');
                        break;
                    case 'text':
                        element.textContent = String(value || '');
                        break;
                    case 'value':
                        if (element instanceof HTMLInputElement || 
                            element instanceof HTMLSelectElement || 
                            element instanceof HTMLTextAreaElement) {
                            element.value = String(value || '');
                        }
                        break;
                    case 'attribute':
                        if (config.value) {
                            element.setAttribute(config.value, String(value || ''));
                        }
                        break;
                    case 'class':
                        const shouldHaveClass = value === config.value;
                        if (shouldHaveClass) {
                            element.setAttribute(`data-${config.value}`, 'true');
                        } else {
                            element.removeAttribute(`data-${config.value}`);
                        }
                        break;
                    case 'visibility':
                        element.style.display = value ? 'block' : 'none';
                        break;
                }
            });
        } catch (error) {
            this.logger.error(`Failed to parse observe config: ${error}`);
        }
    }

    /**
     * Record performance metrics
     */
    private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
        this.performanceMetrics.push(metrics);

        // Keep only last 100 metrics
        if (this.performanceMetrics.length > 100) {
            this.performanceMetrics = this.performanceMetrics.slice(-100);
        }

        // Log slow updates
        if (metrics.duration > 16) { // Slower than 60fps
            this.logger.warn(`Slow change detection: ${metrics.duration.toFixed(2)}ms for ${metrics.elementCount} elements`);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        averageUpdateTime: number;
        totalUpdates: number;
        slowUpdates: number;
        averageBatchSize: number;
    } {
        if (this.performanceMetrics.length === 0) {
            return {
                averageUpdateTime: 0,
                totalUpdates: 0,
                slowUpdates: 0,
                averageBatchSize: 0
            };
        }

        const totalTime = this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);
        const slowUpdates = this.performanceMetrics.filter(metric => metric.duration > 16).length;
        const totalBatchSize = this.performanceMetrics.reduce((sum, metric) => sum + metric.batchSize, 0);

        return {
            averageUpdateTime: totalTime / this.performanceMetrics.length,
            totalUpdates: this.performanceMetrics.length,
            slowUpdates,
            averageBatchSize: totalBatchSize / this.performanceMetrics.length
        };
    }

    /**
     * Force immediate flush of all pending updates
     */
    flushImmediately(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        this.flushBatch();
    }

    /**
     * Update configuration at runtime
     */
    updateConfig(newConfig: Partial<ChangeDetectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.debug('Change detection configuration updated');
    }

    /**
     * Get current configuration
     */
    getConfig(): ChangeDetectionConfig {
        return { ...this.config };
    }

    /**
     * Clear all cached values (force next update)
     */
    clearCache(): void {
        this.elementValueCache = new WeakMap();
        this.logger.debug('Change detection cache cleared');
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing ChangeDetector');

        // Clear pending updates
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.pendingUpdates.clear();
        this.performanceMetrics.length = 0;
        this.elementValueCache = new WeakMap();

        this.disposed = true;
        this.logger.debug('ChangeDetector disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}

/**
 * Enhanced UI Observer with Change Detection
 * Integrates with existing Annie data-observe system
 */
export class EnhancedUIObserver {
    private changeDetector: ChangeDetector;
    private logger: ILogger;

    constructor(changeDetector: ChangeDetector, logger: ILogger) {
        this.changeDetector = changeDetector;
        this.logger = logger;
    }

    /**
     * Enhanced notify observers with change detection
     */
    notifyObservers(datasource: string, data: any[]): void {
        const startTime = performance.now();
        const elements = document.querySelectorAll(`[data-observe*="${datasource}"]`);
        let updatedCount = 0;
        let skippedCount = 0;

        elements.forEach(element => {
            const observeAttr = element.getAttribute('data-observe');
            if (!observeAttr) return;

            try {
                const observeConfigs = JSON.parse(observeAttr);
                const configs = Array.isArray(observeConfigs) ? observeConfigs : [observeConfigs];

                configs.forEach(config => {
                    if (config.datasource === datasource) {
                        const fieldValue = this.extractFieldValue(data, config.field);
                        const wasUpdated = this.changeDetector.scheduleUpdate(
                            element as HTMLElement, 
                            config.field, 
                            fieldValue
                        );

                        if (wasUpdated) {
                            updatedCount++;
                            
                            // Trigger data change animation if element has animation attributes
                            if ((window as any).annie?.getAnimations && element.hasAttribute('data-annie-animate')) {
                                const animations = (window as any).annie.getAnimations();
                                if (animations) {
                                    animations.triggerDataChangeAnimation(element as HTMLElement);
                                }
                            }
                        } else {
                            skippedCount++;
                        }
                    }
                });
            } catch (error) {
                this.logger.error(`Failed to process element for datasource ${datasource}: ${error}`);
            }
        });

        const duration = performance.now() - startTime;

        this.logger.debug(
            `Enhanced observer update: ${updatedCount} updated, ${skippedCount} skipped in ${duration.toFixed(2)}ms`
        );
    }

    /**
     * Extract field value from data array
     */
    private extractFieldValue(data: any[], field: string): any {
        if (!data || data.length === 0) return undefined;

        // Handle different data structures
        if (data.length === 1 && typeof data[0] === 'object') {
            return data[0][field];
        } else if (Array.isArray(data)) {
            return data.map(item => item[field]);
        }

        return undefined;
    }
}

/**
 * Initialize enhanced change detection system
 */
export function initializeChangeDetection(
    dataStore: DataStore, 
    logger: ILogger, 
    config?: Partial<ChangeDetectionConfig>
): { changeDetector: ChangeDetector; enhancedObserver: EnhancedUIObserver } {
    
    const changeDetector = new ChangeDetector(dataStore, logger, config);
    const enhancedObserver = new EnhancedUIObserver(changeDetector, logger);

    logger.info('Enhanced change detection system initialized');

    return { changeDetector, enhancedObserver };
}