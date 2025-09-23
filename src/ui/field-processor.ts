import { DataStore } from '../core/data-store.js';
import { ILogger } from '../core/logger.js';
import { IDisposable } from '../core/di-container.js';
import { Observable } from '../core/observable.js';

export interface FieldProcessorConfig {
    source: string;           // Source field selector or name
    target?: string;          // Target field/dataset name  
    operation: FieldOperation; // What to do with the value
    dataset?: string;         // Dataset to store sanitized values
    triggerEvent?: string;    // Event to listen for (default: 'blur')
}

export type FieldOperation = 
    | 'copyto-upper'     // Copy to target in uppercase
    | 'copyto-lower'     // Copy to target in lowercase
    | 'sanitize-phone'   // Sanitize phone number
    | 'sanitize-email'   // Sanitize email
    | 'sanitize-alpha'   // Remove non-alphabetic chars
    | 'sanitize-numeric' // Remove non-numeric chars
    | 'format-currency'  // Format as currency
    | 'format-date';     // Format as date

export class FieldProcessor implements IDisposable {
    private dataStore: DataStore;
    private logger: ILogger;
    private subscriptions: Array<{ unsubscribe: () => void }> = [];
    private disposed: boolean = false;
    private mutationObserver?: MutationObserver;
    private processedElements: WeakSet<HTMLElement> = new WeakSet();

    constructor(dataStore: DataStore, logger: ILogger) {
        this.dataStore = dataStore;
        this.logger = logger;
    }

    initialize(): void {
        this.scanAndInitializeFieldProcessors();
        this.setupMutationObserver();
        this.logger.info('Field processor initialized with dynamic content monitoring');
    }

    private scanAndInitializeFieldProcessors(): void {
        // Find all elements with field processing attributes
        const processors = document.querySelectorAll('[data-copyto-upper], [data-copyto-lower], [data-sanitize], [data-format]');
        
        this.logger.debug(`Found ${processors.length} elements with field processing attributes`);

        for (let i = 0; i < processors.length; i++) {
            const element = processors[i] as HTMLElement;
            
            if (this.processedElements.has(element)) {
                continue;
            }

            this.initializeFieldProcessor(element);
            this.processedElements.add(element);
        }
    }

    private setupMutationObserver(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            
                            // Check if the added element has field processing attributes
                            if (this.hasFieldProcessingAttributes(element)) {
                                this.logger.debug(`Detected field processor attribute added to: ${element.tagName}`);
                                this.initializeFieldProcessor(element);
                                this.processedElements.add(element);
                            }

                            // Check descendants
                            const descendants = element.querySelectorAll('[data-copyto-upper], [data-copyto-lower], [data-sanitize], [data-format]');
                            descendants.forEach((desc) => {
                                const descElement = desc as HTMLElement;
                                if (!this.processedElements.has(descElement)) {
                                    this.initializeFieldProcessor(descElement);
                                    this.processedElements.add(descElement);
                                }
                            });
                        }
                    });
                }
            });
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private hasFieldProcessingAttributes(element: HTMLElement): boolean {
        return element.hasAttribute('data-copyto-upper') ||
               element.hasAttribute('data-copyto-lower') ||
               element.hasAttribute('data-sanitize') ||
               element.hasAttribute('data-format');
    }

    private initializeFieldProcessor(element: HTMLElement): void {
        if (this.disposed) return;

        // Extract configurations from data attributes
        const configs: FieldProcessorConfig[] = [];

        // Get element name for form elements
        const elementName = (element as HTMLInputElement).name || element.id || 'unknown';

        // Handle copyto-upper
        const copyToUpper = element.getAttribute('data-copyto-upper');
        if (copyToUpper) {
            configs.push({
                source: elementName,
                target: copyToUpper,
                operation: 'copyto-upper'
            });
        }

        // Handle copyto-lower
        const copyToLower = element.getAttribute('data-copyto-lower');
        if (copyToLower) {
            configs.push({
                source: elementName,
                target: copyToLower,
                operation: 'copyto-lower'
            });
        }

        // Handle sanitize
        const sanitizeConfig = element.getAttribute('data-sanitize');
        if (sanitizeConfig) {
            try {
                const config = JSON.parse(sanitizeConfig);
                configs.push({
                    source: elementName,
                    operation: config.type || 'sanitize-phone',
                    dataset: config.dataset || 'sanitized',
                    target: config.target
                });
            } catch {
                // Simple sanitize attribute
                configs.push({
                    source: elementName,
                    operation: 'sanitize-phone',
                    dataset: 'sanitized'
                });
            }
        }

        // Handle format
        const formatConfig = element.getAttribute('data-format');
        if (formatConfig) {
            configs.push({
                source: elementName,
                operation: formatConfig as FieldOperation,
                dataset: 'formatted'
            });
        }

        // Set up event listeners for each configuration
        configs.forEach(config => {
            this.setupFieldProcessor(element, config);
        });
    }

    private setupFieldProcessor(element: HTMLElement, config: FieldProcessorConfig): void {
        const eventType = config.triggerEvent || 'blur';
        
        this.logger.debug(`Setting up field processor: ${config.operation} on ${eventType} for element ${element.tagName}`);

        const observable = Observable.fromEvent(element, eventType);
        
        const subscription = observable.subscribe({
            next: (event: Event) => {
                const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                const value = target.value;
                
                this.logger.debug(`Processing field: ${config.operation} with value: "${value}"`);
                
                this.processField(value, config, element);
            },
            error: (error: Error) => {
                this.logger.error(`Field processor error: ${error}`);
            },
            complete: () => {
                // Field processing complete
            }
        });

        this.subscriptions.push(subscription);
    }

    private processField(value: string, config: FieldProcessorConfig, sourceElement: HTMLElement): void {
        let processedValue: string;

        // Apply the operation
        switch (config.operation) {
            case 'copyto-upper':
                processedValue = value.toUpperCase();
                break;
            
            case 'copyto-lower':
                processedValue = value.toLowerCase();
                break;
            
            case 'sanitize-phone':
                processedValue = this.sanitizePhone(value);
                break;
            
            case 'sanitize-email':
                processedValue = this.sanitizeEmail(value);
                break;
            
            case 'sanitize-alpha':
                processedValue = value.replace(/[^a-zA-Z\s]/g, '');
                break;
            
            case 'sanitize-numeric':
                processedValue = value.replace(/[^0-9]/g, '');
                break;
            
            case 'format-currency':
                processedValue = this.formatCurrency(value);
                break;
            
            case 'format-date':
                processedValue = this.formatDate(value);
                break;
            
            default:
                processedValue = value;
        }

        this.logger.debug(`Processed "${value}" -> "${processedValue}" using ${config.operation}`);

        // Handle the result based on configuration
        if (config.target) {
            // Copy to target field
            this.copyToTarget(processedValue, config.target);
        }

        if (config.dataset) {
            // Store in dataset
            this.storeInDataset(processedValue, config, sourceElement);
        }
    }

    private copyToTarget(value: string, target: string): void {
        // Try different target selection strategies
        let targetElement = document.getElementById(`formfield_${target}`) ||
                           document.getElementById(target) ||
                           document.querySelector(`[name="${target}"]`) ||
                           document.querySelector(`input[data-field="${target}"]`);

        if (targetElement) {
            if (targetElement instanceof HTMLInputElement || 
                targetElement instanceof HTMLTextAreaElement) {
                targetElement.value = value;
                this.logger.debug(`Copied value "${value}" to target field: ${target}`);
            }
        } else {
            // Create hidden field if it doesn't exist (legacy behavior)
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.id = `formfield_${target}`;
            hiddenField.name = target;
            hiddenField.value = value;
            document.body.appendChild(hiddenField);
            this.logger.debug(`Created hidden field "${target}" with value "${value}"`);
        }
    }

    private storeInDataset(value: string, config: FieldProcessorConfig, sourceElement: HTMLElement): void {
        const fieldName = config.target || (sourceElement as HTMLInputElement).name || sourceElement.id || 'unknown';
        const datasetName = config.dataset || 'processed_fields';

        // Get or create dataset
        let dataset = this.dataStore.getDataset(datasetName);
        if (!dataset) {
            this.dataStore.setDataset(datasetName, [{}]);
            dataset = this.dataStore.getDataset(datasetName);
        }

        // Store both original and processed values
        const originalFieldName = `${fieldName}_original`;
        const processedFieldName = `${fieldName}_${config.operation.replace('-', '_')}`;

        const originalValue = (sourceElement as HTMLInputElement).value || '';
        this.dataStore.updateField(datasetName, 0, originalFieldName, originalValue);
        this.dataStore.updateField(datasetName, 0, processedFieldName, value);

        this.logger.debug(`Stored in dataset "${datasetName}": ${originalFieldName}="${originalValue}", ${processedFieldName}="${value}"`);
    }

    // Sanitization methods
    private sanitizePhone(value: string): string {
        // Remove all non-numeric characters
        const numbers = value.replace(/[^0-9]/g, '');
        
        // Format as (XXX) XXX-XXXX for US phone numbers
        if (numbers.length === 10) {
            return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
        } else if (numbers.length === 11 && numbers.startsWith('1')) {
            return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7)}`;
        }
        
        return numbers; // Return just numbers if format doesn't match
    }

    private sanitizeEmail(value: string): string {
        // Basic email sanitization - remove spaces and convert to lowercase
        return value.trim().toLowerCase();
    }

    private formatCurrency(value: string): string {
        // Remove non-numeric characters except decimal point
        const numbers = value.replace(/[^0-9.]/g, '');
        const num = parseFloat(numbers);
        
        if (isNaN(num)) return '';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    }

    private formatDate(value: string): string {
        // Try to parse and format date
        const date = new Date(value);
        
        if (isNaN(date.getTime())) {
            return value; // Return original if can't parse
        }
        
        return date.toLocaleDateString('en-US');
    }

    // Public method to manually reinitialize field processors
    reinitializeFieldProcessors(): void {
        this.scanAndInitializeFieldProcessors();
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing FieldProcessor');

        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }

        // Unsubscribe from all observables
        this.subscriptions.forEach(subscription => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(`Error unsubscribing from field processor: ${error}`);
            }
        });

        this.subscriptions.length = 0;
        this.disposed = true;

        this.logger.debug('FieldProcessor disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}