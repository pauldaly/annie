import { ILogger } from './logger.js';
import { NotificationManager } from './notification-manager.js';

export interface ErrorInfo {
  error: Error;
  context: string;
  component?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  url: string;
  userAgent: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface ErrorBoundaryConfig {
  enableGlobalHandlers?: boolean;
  enableErrorReporting?: boolean;
  enableUserNotifications?: boolean;
  enableRecovery?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  reportingEndpoint?: string;
  fallbackUI?: HTMLElement | string;
  enableDebugMode?: boolean;
  excludeUrls?: string[];
  excludeErrors?: string[];
}

export interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: Error, context: string) => boolean;
  recover: (error: Error, context: string) => Promise<boolean> | boolean;
  priority: number;
}

export interface ComponentErrorBoundaryConfig {
  componentName: string;
  fallbackContent?: string | HTMLElement;
  enableRetry?: boolean;
  retryLimit?: number;
  onError?: (error: Error, info: ErrorInfo) => void;
  onRecover?: (error: Error, attempt: number) => void;
}

export class ErrorBoundary {
    private logger: ILogger;
    private notificationManager?: NotificationManager;
    private config: ErrorBoundaryConfig;
    private errorHistory: ErrorInfo[] = [];
    private recoveryStrategies: ErrorRecoveryStrategy[] = [];
    private componentBoundaries = new Map<string, ComponentErrorBoundaryConfig>();
    private retryAttempts = new Map<string, number>();
    private readonly maxHistorySize = 100;
  
    // Store event handler references for cleanup
    private unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        this.handleError(
            event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
            'unhandled-promise-rejection',
            { promise: event.promise }
        );
    
        // Prevent default browser error handling
        event.preventDefault();
    };

    private globalErrorHandler = (event: ErrorEvent) => {
        const error = event.error || new Error(event.message);
        this.handleError(error, 'uncaught-javascript-error', {
            filename: event.filename,
            lineNumber: event.lineno,
            columnNumber: event.colno
        });
    };

    private resourceErrorHandler = (event: Event) => {
        if (event.target !== window) {
            const target = event.target as HTMLElement;
            const error = new Error(`Resource loading failed: ${target.tagName}`);
            this.handleError(error, 'resource-loading-error', {
                tagName: target.tagName,
                src: (target as any).src || (target as any).href,
                id: target.id,
                className: target.className
            });
        }
    };

    private signalRErrorHandler = (event: any) => {
        this.handleError(
            new Error(event.detail.message || 'SignalR error'),
            'signalr-error',
            event.detail
        );
    };

    constructor(
        logger: ILogger, 
        config: ErrorBoundaryConfig = {},
        notificationManager?: NotificationManager
    ) {
        this.logger = logger;
        this.config = {
            enableGlobalHandlers: true,
            enableErrorReporting: true,
            enableUserNotifications: true,
            enableRecovery: true,
            maxRetries: 3,
            retryDelay: 1000,
            enableDebugMode: false,
            excludeUrls: [],
            excludeErrors: [],
            ...config
        };
        this.notificationManager = notificationManager;

        this.initializeGlobalHandlers();
        this.setupDefaultRecoveryStrategies();
    }

    private initializeGlobalHandlers(): void {
        if (!this.config.enableGlobalHandlers) return;

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);

        // Handle uncaught JavaScript errors
        window.addEventListener('error', this.globalErrorHandler);

        // Handle resource loading errors
        window.addEventListener('error', this.resourceErrorHandler, true);

        // Handle SignalR connection errors (if available)
        this.setupSignalRErrorHandling();
    }

    private setupSignalRErrorHandling(): void {
    // Listen for SignalR errors through custom events
        window.addEventListener('signalr-error', this.signalRErrorHandler);
    }

    private setupDefaultRecoveryStrategies(): void {
    // Network error recovery
        this.addRecoveryStrategy({
            name: 'network-retry',
            condition: (error) => error.message.includes('network') || error.message.includes('fetch'),
            recover: async (error, context) => {
                await this.delay(this.config.retryDelay!);
                return navigator.onLine;
            },
            priority: 1
        });

        // API timeout recovery
        this.addRecoveryStrategy({
            name: 'api-timeout-retry',
            condition: (error) => error.message.includes('timeout') || error.message.includes('abort'),
            recover: async () => {
                await this.delay(this.config.retryDelay! * 2);
                return true;
            },
            priority: 2
        });

        // DOM manipulation errors
        this.addRecoveryStrategy({
            name: 'dom-retry',
            condition: (error) => error.message.includes('Element') || error.message.includes('DOM'),
            recover: () => {
                // Wait for next frame and try again
                return new Promise(resolve => {
                    requestAnimationFrame(() => resolve(true));
                });
            },
            priority: 3
        });

        // Generic fallback recovery
        this.addRecoveryStrategy({
            name: 'fallback-recovery',
            condition: () => true,
            recover: (error, context) => {
                this.logger.warn(`Fallback recovery for ${context}: ${error.message}`);
                return false; // Can't recover, but logged
            },
            priority: 10
        });
    }

    public async handleError(
        error: Error, 
        context: string, 
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            // Skip excluded errors and URLs
            if (this.shouldExcludeError(error, context)) {
                return;
            }

            const errorInfo = this.createErrorInfo(error, context, metadata);
            this.addToHistory(errorInfo);

            // Log the error
            this.logError(errorInfo);

            // Attempt recovery if enabled
            if (this.config.enableRecovery) {
                const recovered = await this.attemptRecovery(error, context);
                if (recovered) {
                    this.logger.info(`Successfully recovered from error in ${context}`);
                    return;
                }
            }

            // Report error if enabled
            if (this.config.enableErrorReporting) {
                await this.reportError(errorInfo);
            }

            // Show user notification if enabled
            if (this.config.enableUserNotifications) {
                this.notifyUser(errorInfo);
            }

        } catch (handlingError) {
            // Fallback error handling - don't let error handling fail
            console.error('Error in error boundary:', handlingError);
            console.error('Original error:', error);
        }
    }

    public wrapAsync<T>(
        asyncFn: () => Promise<T>,
        context: string,
        metadata?: Record<string, any>
    ): Promise<T> {
        return asyncFn().catch(async (error) => {
            await this.handleError(error, context, metadata);
            throw error; // Re-throw after handling
        });
    }

    public wrapSync<T>(
        syncFn: () => T,
        context: string,
        metadata?: Record<string, any>
    ): T | undefined {
        try {
            return syncFn();
        } catch (error) {
            this.handleError(error as Error, context, metadata);
            return undefined;
        }
    }

    public wrapComponent(
        element: HTMLElement,
        config: ComponentErrorBoundaryConfig
    ): void {
        const componentId = `${config.componentName}-${Date.now()}`;
        this.componentBoundaries.set(componentId, config);

        // Store original content for recovery
        const originalContent = element.innerHTML;

        // Wrap all event listeners
        this.wrapElementEventListeners(element, componentId);

        // Monitor for errors in the component
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.wrapElementEventListeners(node as HTMLElement, componentId);
                        }
                    });
                }
            });
        });

        observer.observe(element, {
            childList: true,
            subtree: true
        });

        // Add error recovery function to element
        (element as any).recoverFromError = () => {
            this.recoverComponent(element, config, originalContent);
        };
    }

    private wrapElementEventListeners(element: HTMLElement, componentId: string): void {
        const config = this.componentBoundaries.get(componentId);
        if (!config) return;

        // Override addEventListener to wrap handlers
        const originalAddEventListener = element.addEventListener;
        element.addEventListener = function(
            type: string, 
            listener: EventListenerOrEventListenerObject, 
            options?: boolean | AddEventListenerOptions
        ) {
            const wrappedListener = (event: Event) => {
                try {
                    if (typeof listener === 'function') {
                        listener(event);
                    } else {
                        listener.handleEvent(event);
                    }
                } catch (error) {
                    const errorBoundary = (window as any).annie?.errorBoundary;
                    if (errorBoundary) {
                        errorBoundary.handleComponentError(
                            error, 
                            config.componentName, 
                            { eventType: type, elementId: element.id }
                        );
                    }
                }
            };

            originalAddEventListener.call(this, type, wrappedListener, options);
        };
    }

    public async handleComponentError(
        error: Error,
        componentName: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const context = `component-${componentName}`;
        const config = Array.from(this.componentBoundaries.values())
            .find(c => c.componentName === componentName);

        // Call component's custom error handler
        if (config?.onError) {
            config.onError(error, this.createErrorInfo(error, context, metadata));
        }

        // Attempt component recovery
        if (config?.enableRetry) {
            const retryKey = `${componentName}-retry`;
            const attempts = this.retryAttempts.get(retryKey) || 0;
      
            if (attempts < (config.retryLimit || this.config.maxRetries!)) {
                this.retryAttempts.set(retryKey, attempts + 1);
        
                if (config.onRecover) {
                    config.onRecover(error, attempts + 1);
                }
        
                // Wait and retry
                await this.delay(this.config.retryDelay! * (attempts + 1));
                return;
            }
        }

        // Handle normally if component recovery fails
        await this.handleError(error, context, metadata);
    }

    private async attemptRecovery(error: Error, context: string): Promise<boolean> {
        const retryKey = `${context}-retry`;
        const attempts = this.retryAttempts.get(retryKey) || 0;

        if (attempts >= this.config.maxRetries!) {
            this.logger.warn(`Max retry attempts reached for ${context}`);
            return false;
        }

        // Find applicable recovery strategies
        const strategies = this.recoveryStrategies
            .filter(strategy => strategy.condition(error, context))
            .sort((a, b) => a.priority - b.priority);

        for (const strategy of strategies) {
            try {
                this.logger.info(`Attempting recovery with strategy: ${strategy.name}`);
                const recovered = await strategy.recover(error, context);
        
                if (recovered) {
                    this.retryAttempts.delete(retryKey); // Reset on success
                    this.logger.info(`Recovery successful with strategy: ${strategy.name}`);
                    return true;
                }
            } catch (recoveryError) {
                this.logger.warn(`Recovery strategy ${strategy.name} failed: ${recoveryError}`);
            }
        }

        // Increment retry count
        this.retryAttempts.set(retryKey, attempts + 1);
        return false;
    }

    private recoverComponent(
        element: HTMLElement, 
        config: ComponentErrorBoundaryConfig, 
        originalContent: string
    ): void {
        if (config.fallbackContent) {
            if (typeof config.fallbackContent === 'string') {
                element.innerHTML = config.fallbackContent;
            } else {
                element.replaceChildren(config.fallbackContent);
            }
        } else {
            element.innerHTML = originalContent;
        }
    }

    private createErrorInfo(
        error: Error, 
        context: string, 
        metadata?: Record<string, any>
    ): ErrorInfo {
        return {
            error,
            context,
            component: metadata?.component,
            timestamp: Date.now(),
            userId: metadata?.userId,
            sessionId: metadata?.sessionId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            stack: error.stack,
            metadata
        };
    }

    private addToHistory(errorInfo: ErrorInfo): void {
        this.errorHistory.unshift(errorInfo);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    private logError(errorInfo: ErrorInfo): void {
        const logMessage = `Error in ${errorInfo.context}: ${errorInfo.error.message}`;
    
        if (this.config.enableDebugMode) {
            const debugInfo = {
                error: errorInfo.error.message,
                stack: errorInfo.stack,
                metadata: errorInfo.metadata,
                url: errorInfo.url,
                timestamp: new Date(errorInfo.timestamp).toISOString()
            };
            this.logger.error(`${logMessage} - Debug Info: ${JSON.stringify(debugInfo)}`);
        } else {
            this.logger.error(logMessage);
        }
    }

    private async reportError(errorInfo: ErrorInfo): Promise<void> {
        if (!this.config.reportingEndpoint) return;

        try {
            await fetch(this.config.reportingEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...errorInfo,
                    error: {
                        message: errorInfo.error.message,
                        name: errorInfo.error.name,
                        stack: errorInfo.error.stack
                    }
                })
            });
        } catch (reportingError) {
            this.logger.warn(`Failed to report error: ${reportingError}`);
        }
    }

    private notifyUser(errorInfo: ErrorInfo): void {
        if (this.notificationManager) {
            this.notificationManager.sendNotification({
                type: 'alert',
                title: 'Something went wrong',
                message: 'We encountered an unexpected error. Please try again.',
                priority: 'high',
                data: {
                    context: errorInfo.context,
                    timestamp: errorInfo.timestamp
                }
            }).catch(err => {
                this.logger.warn(`Failed to send error notification: ${err}`);
            });
        } else {
            // Fallback to console if notification manager not available
            console.warn('Error occurred:', errorInfo.error.message);
        }
    }

    private shouldExcludeError(error: Error, context: string): boolean {
        const errorMessage = error.message.toLowerCase();
    
        // Check excluded errors
        for (const excludePattern of this.config.excludeErrors!) {
            if (errorMessage.includes(excludePattern.toLowerCase())) {
                return true;
            }
        }

        // Check excluded URLs
        const currentUrl = window.location.href.toLowerCase();
        for (const excludeUrl of this.config.excludeUrls!) {
            if (currentUrl.includes(excludeUrl.toLowerCase())) {
                return true;
            }
        }

        return false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    public addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
        this.recoveryStrategies.push(strategy);
        this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
    }

    public removeRecoveryStrategy(name: string): void {
        this.recoveryStrategies = this.recoveryStrategies
            .filter(strategy => strategy.name !== name);
    }

    public getErrorHistory(): ErrorInfo[] {
        return [...this.errorHistory];
    }

    public clearErrorHistory(): void {
        this.errorHistory = [];
        this.retryAttempts.clear();
    }

    public getRetryAttempts(): Map<string, number> {
        return new Map(this.retryAttempts);
    }

    public setNotificationManager(notificationManager: NotificationManager): void {
        this.notificationManager = notificationManager;
    }

    public dispose(): void {
    // Clean up global handlers
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
        window.removeEventListener('error', this.globalErrorHandler);
        window.removeEventListener('error', this.resourceErrorHandler, true);
        window.removeEventListener('signalr-error', this.signalRErrorHandler);
    
        // Clear data
        this.clearErrorHistory();
        this.componentBoundaries.clear();
        this.recoveryStrategies = [];
    }
}

// Utility functions for error boundary decorators
export function withErrorBoundary<T extends (...args: any[]) => any>(
    fn: T,
    context: string,
    errorBoundary: ErrorBoundary
): T {
    return ((...args: any[]) => {
        try {
            const result = fn(...args);
            if (result instanceof Promise) {
                return result.catch((error) => {
                    errorBoundary.handleError(error, context);
                    throw error;
                });
            }
            return result;
        } catch (error) {
            errorBoundary.handleError(error as Error, context);
            throw error;
        }
    }) as T;
}

export function errorBoundaryDecorator(context: string) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<T>
    ) {
        const originalMethod = descriptor.value!;
    
        descriptor.value = function(this: any, ...args: any[]) {
            const errorBoundary = this.errorBoundary || (window as any).annie?.errorBoundary;
            if (errorBoundary) {
                return errorBoundary.wrapSync(() => originalMethod.apply(this, args), context);
            }
            return originalMethod.apply(this, args);
        } as T;
    
        return descriptor;
    };
}
