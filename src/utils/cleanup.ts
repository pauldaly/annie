import { IDisposable } from '../core/di-container.js';
import { ILogger } from '../core/logger.js';

/**
 * Comprehensive cleanup utilities for the Annie Framework
 */
export class CleanupManager implements IDisposable {
    private disposables: Set<IDisposable> = new Set();
    private eventListeners: Array<{
    element: Element | Window | Document;
    event: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }> = [];
    private intervals: Set<number> = new Set();
    private timeouts: Set<number> = new Set();
    private mutationObservers: Set<MutationObserver> = new Set();
    private intersectionObservers: Set<IntersectionObserver> = new Set();
    private resizeObservers: Set<ResizeObserver> = new Set();
    private abortControllers: Set<AbortController> = new Set();
    private mediaQueryLists: Set<MediaQueryList> = new Set();
    private logger: ILogger;
    private disposed: boolean = false;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
   * Register a disposable object for cleanup
   */
    register(disposable: IDisposable): void {
        if (this.disposed) {
            this.logger.warn('Cannot register disposable - CleanupManager is disposed');
            return;
        }
        this.disposables.add(disposable);
    }

    /**
   * Unregister a disposable object
   */
    unregister(disposable: IDisposable): boolean {
        return this.disposables.delete(disposable);
    }

    /**
   * Add an event listener and track it for cleanup
   */
    addEventListener(
        element: Element | Window | Document,
        event: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void {
        if (this.disposed) {
            this.logger.warn('Cannot add event listener - CleanupManager is disposed');
            return;
        }

        element.addEventListener(event, listener, options);
        this.eventListeners.push({ element, event, listener, options });
    }

    /**
   * Remove a specific event listener
   */
    removeEventListener(
        element: Element | Window | Document,
        event: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): boolean {
        const index = this.eventListeners.findIndex(
            item => item.element === element && 
               item.event === event && 
               item.listener === listener
        );

        if (index !== -1) {
            element.removeEventListener(event, listener, options);
            this.eventListeners.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
   * Set an interval and track it for cleanup
   */
    setInterval(callback: () => void, delay?: number): number {
        if (this.disposed) {
            this.logger.warn('Cannot set interval - CleanupManager is disposed');
            return -1;
        }

        const id = window.setInterval(callback, delay);
        this.intervals.add(id);
        return id;
    }

    /**
   * Clear a specific interval
   */
    clearInterval(id: number): void {
        window.clearInterval(id);
        this.intervals.delete(id);
    }

    /**
   * Set a timeout and track it for cleanup
   */
    setTimeout(callback: () => void, delay?: number): number {
        if (this.disposed) {
            this.logger.warn('Cannot set timeout - CleanupManager is disposed');
            return -1;
        }

        const id = window.setTimeout(callback, delay);
        this.timeouts.add(id);
        return id;
    }

    /**
   * Clear a specific timeout
   */
    clearTimeout(id: number): void {
        window.clearTimeout(id);
        this.timeouts.delete(id);
    }

    /**
   * Create and track a MutationObserver
   */
    createMutationObserver(callback: MutationCallback): MutationObserver {
        if (this.disposed) {
            throw new Error('Cannot create MutationObserver - CleanupManager is disposed');
        }

        const observer = new MutationObserver(callback);
        this.mutationObservers.add(observer);
        return observer;
    }

    /**
   * Create and track an IntersectionObserver
   */
    createIntersectionObserver(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
    ): IntersectionObserver {
        if (this.disposed) {
            throw new Error('Cannot create IntersectionObserver - CleanupManager is disposed');
        }

        const observer = new IntersectionObserver(callback, options);
        this.intersectionObservers.add(observer);
        return observer;
    }

    /**
   * Create and track a ResizeObserver
   */
    createResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
        if (this.disposed) {
            throw new Error('Cannot create ResizeObserver - CleanupManager is disposed');
        }

        const observer = new ResizeObserver(callback);
        this.resizeObservers.add(observer);
        return observer;
    }

    /**
   * Create and track an AbortController
   */
    createAbortController(): AbortController {
        if (this.disposed) {
            throw new Error('Cannot create AbortController - CleanupManager is disposed');
        }

        const controller = new AbortController();
        this.abortControllers.add(controller);
        return controller;
    }

    /**
   * Track a MediaQueryList for cleanup
   */
    trackMediaQueryList(mediaQueryList: MediaQueryList): void {
        if (this.disposed) {
            this.logger.warn('Cannot track MediaQueryList - CleanupManager is disposed');
            return;
        }
        this.mediaQueryLists.add(mediaQueryList);
    }

    /**
   * Remove DOM elements and clean up their event listeners
   */
    removeElements(elements: NodeListOf<Element> | HTMLElement[]): void {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
      
            // Remove tracked event listeners for this element
            this.eventListeners = this.eventListeners.filter(item => {
                if (item.element === element) {
                    try {
                        element.removeEventListener(item.event, item.listener, item.options);
                    } catch (error) {
                        this.logger.warn(`Error removing event listener: ${error}`);
                    }
                    return false;
                }
                return true;
            });

            // Remove the element from DOM
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }

    /**
   * Clean up global window references
   */
    cleanupGlobalReferences(keys: string[]): void {
        keys.forEach(key => {
            try {
                delete (window as any)[key];
            } catch (error) {
                this.logger.warn(`Error cleaning up global reference ${key}: ${error}`);
            }
        });
    }

    /**
   * Get cleanup statistics
   */
    getCleanupStats(): {
    disposables: number;
    eventListeners: number;
    intervals: number;
    timeouts: number;
    mutationObservers: number;
    intersectionObservers: number;
    resizeObservers: number;
    abortControllers: number;
    mediaQueryLists: number;
    } {
        return {
            disposables: this.disposables.size,
            eventListeners: this.eventListeners.length,
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            mutationObservers: this.mutationObservers.size,
            intersectionObservers: this.intersectionObservers.size,
            resizeObservers: this.resizeObservers.size,
            abortControllers: this.abortControllers.size,
            mediaQueryLists: this.mediaQueryLists.size
        };
    }

    /**
   * Force garbage collection hint (if available)
   */
    requestGarbageCollection(): void {
    // Garbage collection hint for development/debugging
        if (typeof (window as any).gc === 'function') {
            try {
                (window as any).gc();
                this.logger.debug('Garbage collection requested');
            } catch (error) {
                this.logger.debug('Garbage collection not available');
            }
        }
    }

    /**
   * Dispose all tracked resources
   */
    dispose(): void {
        if (this.disposed) return;

        this.logger.info('Starting comprehensive cleanup...');
        const startTime = Date.now();

        // Dispose all registered disposables
        let disposableCount = 0;
        this.disposables.forEach(disposable => {
            try {
                disposable.dispose();
                disposableCount++;
            } catch (error) {
                this.logger.error(`Error disposing object: ${error}`);
            }
        });
        this.disposables.clear();

        // Remove all event listeners
        let listenerCount = 0;
        this.eventListeners.forEach(({ element, event, listener, options }) => {
            try {
                element.removeEventListener(event, listener, options);
                listenerCount++;
            } catch (error) {
                this.logger.warn(`Error removing event listener: ${error}`);
            }
        });
        this.eventListeners.length = 0;

        // Clear all intervals
        this.intervals.forEach(id => {
            try {
                window.clearInterval(id);
            } catch (error) {
                this.logger.warn(`Error clearing interval ${id}: ${error}`);
            }
        });
        this.intervals.clear();

        // Clear all timeouts
        this.timeouts.forEach(id => {
            try {
                window.clearTimeout(id);
            } catch (error) {
                this.logger.warn(`Error clearing timeout ${id}: ${error}`);
            }
        });
        this.timeouts.clear();

        // Disconnect all mutation observers
        this.mutationObservers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                this.logger.warn(`Error disconnecting MutationObserver: ${error}`);
            }
        });
        this.mutationObservers.clear();

        // Disconnect all intersection observers
        this.intersectionObservers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                this.logger.warn(`Error disconnecting IntersectionObserver: ${error}`);
            }
        });
        this.intersectionObservers.clear();

        // Disconnect all resize observers
        this.resizeObservers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                this.logger.warn(`Error disconnecting ResizeObserver: ${error}`);
            }
        });
        this.resizeObservers.clear();

        // Abort all controllers
        this.abortControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (error) {
                this.logger.warn(`Error aborting controller: ${error}`);
            }
        });
        this.abortControllers.clear();

        // Clear media query lists
        this.mediaQueryLists.clear();

        this.disposed = true;
    
        const endTime = Date.now();
        this.logger.info(`Cleanup completed in ${endTime - startTime}ms. Cleaned up ${disposableCount} disposables, ${listenerCount} event listeners`);
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}

/**
 * Memory leak detection utilities
 */
export class MemoryLeakDetector {
    private static instance: MemoryLeakDetector;
    private logger: ILogger;
    private initialMemory?: number;
    private checkInterval?: number;
    private memoryThreshold: number = 50 * 1024 * 1024; // 50MB

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    static getInstance(logger: ILogger): MemoryLeakDetector {
        if (!MemoryLeakDetector.instance) {
            MemoryLeakDetector.instance = new MemoryLeakDetector(logger);
        }
        return MemoryLeakDetector.instance;
    }

    startMonitoring(intervalMs: number = 30000): void {
        if (!('performance' in window) || !('memory' in (performance as any))) {
            this.logger.warn('Memory monitoring not available in this browser');
            return;
        }

        this.initialMemory = (performance as any).memory.usedJSHeapSize;
    
        this.checkInterval = window.setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);

        this.logger.info('Memory leak monitoring started');
    }

    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
        this.logger.info('Memory leak monitoring stopped');
    }

    private checkMemoryUsage(): void {
        if (!('performance' in window) || !('memory' in (performance as any))) {
            return;
        }

        const memory = (performance as any).memory;
        const currentUsage = memory.usedJSHeapSize;
        const memoryGrowth = this.initialMemory ? currentUsage - this.initialMemory : 0;

        if (memoryGrowth > this.memoryThreshold) {
            this.logger.warn(`Potential memory leak detected. Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        }

        this.logger.debug(`Memory usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB, Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    }

    getMemoryInfo(): any {
        if (!('performance' in window) || !('memory' in (performance as any))) {
            return null;
        }

        return (performance as any).memory;
    }
}

/**
 * Resource cleanup helpers
 */
export const CleanupHelpers = {
    /**
   * Clean up all data attributes from elements
   */
    cleanupDataAttributes(elements: NodeListOf<Element> | HTMLElement[], prefix?: string): void {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const attributes = Array.from(element.attributes);
      
            attributes.forEach(attr => {
                if (attr.name.startsWith('data-' + (prefix || ''))) {
                    element.removeAttribute(attr.name);
                }
            });
        }
    },

    /**
   * Clean up all CSS classes from elements
   */
    cleanupCssClasses(elements: NodeListOf<Element> | HTMLElement[], classPrefix?: string): void {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
      
            if (classPrefix) {
                const classes = Array.from(element.classList);
                classes.forEach(cls => {
                    if (cls.startsWith(classPrefix)) {
                        element.classList.remove(cls);
                    }
                });
            } else {
                element.className = '';
            }
        }
    },

    /**
   * Clean up local storage entries
   */
    cleanupLocalStorage(keyPrefix?: string): void {
        if (typeof localStorage === 'undefined') return;

        if (keyPrefix) {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(keyPrefix)) {
                    localStorage.removeItem(key);
                }
            });
        } else {
            localStorage.clear();
        }
    },

    /**
   * Clean up session storage entries
   */
    cleanupSessionStorage(keyPrefix?: string): void {
        if (typeof sessionStorage === 'undefined') return;

        if (keyPrefix) {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(keyPrefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        } else {
            sessionStorage.clear();
        }
    },

    /**
   * Force cleanup of detached DOM nodes
   */
    cleanupDetachedNodes(): void {
    // Force garbage collection of detached nodes
        if (typeof (window as any).gc === 'function') {
            try {
                (window as any).gc();
            } catch (error) {
                // Ignore - gc() not available
            }
        }
    }
};
