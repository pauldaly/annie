/**
 * Example usage of Annie Framework Error Boundaries
 * This file demonstrates how to implement proper error handling in applications using Annie Framework
 */

import { AnnieFramework } from '../annie';
import { ErrorBoundary, withErrorBoundary, errorBoundaryDecorator } from '../core/error-boundary.js';
import { Logger } from '../core/logger.js';

// Example 1: Basic Error Boundary Setup
export class MyApplication {
    private annie: AnnieFramework;
    private errorBoundary: ErrorBoundary;

    constructor() {
        this.annie = new AnnieFramework({
            apiConfig: {
                baseUrl: '/api'
            },
            errorBoundaryConfig: {
                enableGlobalHandlers: true,
                enableErrorReporting: true,
                enableUserNotifications: true,
                enableRecovery: true,
                maxRetries: 3,
                retryDelay: 1000,
                reportingEndpoint: '/api/errors',
                enableDebugMode: true // Set directly instead of using process.env
            }
        });

        // Initialize and access the framework's components
        this.annie.initialize();
        this.errorBoundary = this.annie.getErrorBoundary();
        this.setupCustomErrorHandling();
    }

    private setupCustomErrorHandling(): void {
    // Add custom recovery strategies
        this.errorBoundary.addRecoveryStrategy({
            name: 'user-session-recovery',
            condition: (error) => error.message.includes('authentication') || error.message.includes('unauthorized'),
            recover: async () => {
                // Attempt to refresh user session
                try {
                    await fetch('/api/auth/refresh', { method: 'POST' });
                    return true;
                } catch {
                    // Redirect to login if refresh fails
                    window.location.href = '/login';
                    return false;
                }
            },
            priority: 1
        });

        // Add database connection recovery
        this.errorBoundary.addRecoveryStrategy({
            name: 'database-retry',
            condition: (error) => error.message.includes('database') || error.message.includes('connection'),
            recover: async () => {
                // Wait longer for database issues
                await new Promise(resolve => setTimeout(resolve, 5000));
                return true;
            },
            priority: 2
        });
    }

    // Example 2: Using Error Boundary with Async Functions
    public async loadUserData(userId: string): Promise<any> {
        return this.errorBoundary.wrapAsync(
            async () => {
                const response = await fetch(`/api/users/${userId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load user data: ${response.statusText}`);
                }
                return response.json();
            },
            'user-data-loading',
            { userId, operation: 'loadUserData' }
        );
    }

    // Example 3: Using Error Boundary with Sync Functions
    public processUserInput(input: string): any {
        return this.errorBoundary.wrapSync(
            () => {
                if (!input || input.trim().length === 0) {
                    throw new Error('Invalid input: empty string');
                }
        
                // Process the input
                const processed = JSON.parse(input);
                return processed;
            },
            'user-input-processing',
            { inputLength: input?.length, operation: 'processUserInput' }
        );
    }

  // Example 4: Using Error Boundary Decorator
  @errorBoundaryDecorator('form-submission')
    public async submitForm(formData: FormData): Promise<void> {
        const response = await fetch('/api/submit', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Form submission failed: ${response.statusText}`);
        }
    }

  // Example 5: Component Error Boundary
  public setupComponentErrorBoundary(): void {
      const formElement = document.getElementById('user-form') as HTMLElement;
      if (formElement) {
          this.errorBoundary.wrapComponent(formElement, {
              componentName: 'user-form',
              enableRetry: true,
              retryLimit: 2,
              fallbackContent: `
          <div class="error-fallback">
            <h3>Form temporarily unavailable</h3>
            <p>Please refresh the page to try again.</p>
            <button onclick="window.location.reload()">Refresh Page</button>
          </div>
        `,
              onError: (error, info) => {
                  console.log('Form error detected:', error.message);
                  // Send telemetry or analytics
                  this.sendErrorTelemetry(error, info);
              },
              onRecover: (error, attempt) => {
                  console.log(`Form recovery attempt ${attempt} for error: ${error.message}`);
              }
          });
      }
  }

  // Example 6: Manual Error Reporting
  public async reportCriticalError(error: Error, context: string): Promise<void> {
      await this.errorBoundary.handleError(error, context, {
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
          component: 'critical-operation',
          severity: 'critical'
      });
  }

  // Example 7: Error History and Analytics
  public getErrorAnalytics(): any {
      const errorHistory = this.errorBoundary.getErrorHistory();
      const retryAttempts = this.errorBoundary.getRetryAttempts();

      return {
          totalErrors: errorHistory.length,
          recentErrors: errorHistory.slice(0, 10),
          errorsByContext: this.groupErrorsByContext(errorHistory),
          retryStats: Array.from(retryAttempts.entries()),
          errorTrends: this.calculateErrorTrends(errorHistory)
      };
  }

  // Example 8: Error Boundary with Validation
  public validateAndProcessData(data: any): any {
      return this.errorBoundary.wrapSync(
          () => {
              // Validation
              if (!data) {
                  throw new Error('Data is required');
              }

              if (typeof data !== 'object') {
                  throw new Error('Data must be an object');
              }

              if (!data.id) {
                  throw new Error('Data must have an ID');
              }

              // Processing with potential errors
              const processed = this.complexDataProcessing(data);
        
              if (!this.validateProcessedData(processed)) {
                  throw new Error('Data processing validation failed');
              }

              return processed;
          },
          'data-validation-processing',
          { 
              dataId: data?.id, 
              dataType: typeof data,
              operation: 'validateAndProcessData'
          }
      );
  }

  // Helper methods
  private complexDataProcessing(data: any): any {
      // Simulate complex processing that might fail
      if (Math.random() < 0.1) { // 10% chance of failure for demo
          throw new Error('Random processing error');
      }
    
      return {
          ...data,
          processed: true,
          timestamp: Date.now()
      };
  }

  private validateProcessedData(data: any): boolean {
      return data && data.processed && data.timestamp;
  }

  private getCurrentUserId(): string {
      // Get current user ID from your authentication system
      return 'user-123';
  }

  private getSessionId(): string {
      // Get session ID from your session management
      return 'session-456';
  }

  private sendErrorTelemetry(error: Error, info: any): void {
      // Send error telemetry to your analytics service
      console.log('Sending error telemetry:', { error: error.message, info });
  }

  private groupErrorsByContext(errors: any[]): Record<string, number> {
      return errors.reduce((acc, error) => {
          acc[error.context] = (acc[error.context] || 0) + 1;
          return acc;
      }, {});
  }

  private calculateErrorTrends(errors: any[]): any {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      return {
          lastHour: errors.filter(e => now - e.timestamp < oneHour).length,
          lastDay: errors.filter(e => now - e.timestamp < oneDay).length,
          total: errors.length
      };
  }
}

// Example 9: Standalone Error Boundary Usage
export class StandaloneErrorBoundary {
    private errorBoundary: ErrorBoundary;

    constructor() {
    // Create error boundary without full Annie framework
        const logger = Logger.create('info');
        this.errorBoundary = new ErrorBoundary(
            logger,
            {
                enableGlobalHandlers: true,
                enableErrorReporting: false,
                enableUserNotifications: false,
                enableRecovery: true,
                maxRetries: 2
            }
        );
    }

    public wrapRiskyOperation<T>(operation: () => T, context: string): T | undefined {
        return this.errorBoundary.wrapSync(operation, context);
    }

    public async wrapRiskyAsyncOperation<T>(operation: () => Promise<T>, context: string): Promise<T> {
        return this.errorBoundary.wrapAsync(operation, context);
    }
}

// Example 10: Higher-Order Component Pattern
export function withErrorBoundaryComponent<T extends (...args: any[]) => any>(
    component: T,
    contextName: string
): T {
    return withErrorBoundary(component, contextName, (window as any).annie?.errorBoundary) as T;
}

// Example usage:
// const SafeComponent = withErrorBoundaryComponent(MyComponent, 'my-component');

// Example 11: Error Boundary Middleware for API Calls
export class APIErrorBoundaryMiddleware {
    private errorBoundary: ErrorBoundary;

    constructor(errorBoundary: ErrorBoundary) {
        this.errorBoundary = errorBoundary;
    }

    public async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
        return this.errorBoundary.wrapAsync(
            async () => {
                const response = await fetch(url, options);
        
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
        
                return response;
            },
            'api-request',
            { url, method: options.method || 'GET' }
        );
    }
}

// Usage example in your application:
/*
const app = new MyApplication();

// Load user data with error boundary protection
app.loadUserData('123').then(userData => {
  console.log('User data loaded:', userData);
}).catch(error => {
  console.log('Error handled by error boundary:', error.message);
});

// Setup component error boundaries
app.setupComponentErrorBoundary();

// Get error analytics
const analytics = app.getErrorAnalytics();
console.log('Error Analytics:', analytics);
*/
