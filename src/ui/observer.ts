import { DataObserver } from '../core/observable.js';
import { DataStore } from '../core/data-store.js';
import { ILogger } from '../core/logger.js';
import { IDisposable } from '../core/di-container.js';

export interface ObserveConfig {
  datasource: string;
  type: string;
  value?: string;
  src?: string;
  field?: string;
  prepend?: string;
  append?: string;
}

export class UIObserver implements IDisposable {
    private dataObserver: DataObserver;
    private dataStore: DataStore;
    private logger: ILogger;
    private disposed: boolean = false;

    constructor(dataStore: DataStore, logger: ILogger) {
        this.dataStore = dataStore;
        this.dataObserver = new DataObserver();
        this.logger = logger;
    }

    initializeObservers(): void {
        const elements = document.querySelectorAll('[data-observe]');
    
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            this.initializeElementObserver(element as HTMLElement);
        }
    }

    private initializeElementObserver(element: HTMLElement): void {
        const observeAttr = element.getAttribute('data-observe');
        if (!observeAttr) {
            return;
        }

        try {
            const observeConfigs = JSON.parse(observeAttr);
            const configs = Array.isArray(observeConfigs) ? observeConfigs : [observeConfigs];
      
            for (let config of configs) {
                this.setupObserver(element, config);
            }
        } catch (error) {
            this.logger.error(`Failed to parse observe config: ${error}`);
        }
    }

    private setupObserver(element: HTMLElement, config: ObserveConfig): void {
        const datasource = config.datasource || 'store';
        const normalizedDatasource = datasource.replace(/-/g, "_");

        this.dataObserver.addObserver(normalizedDatasource, (data: any[]) => {
            this.updateElement(element, config, data);
        });

        // Initial mount
        this.mountElement(element, config);
    }

    private mountElement(element: HTMLElement, config: ObserveConfig): void {
        const datasource = config.datasource || 'store';
        const normalizedDatasource = datasource.replace(/-/g, "_");
        const dataset = this.dataStore.getDataset(normalizedDatasource);

        if (dataset && dataset.data.length > 0) {
            this.updateElement(element, config, dataset.data);
        }
    }

    private updateElement(element: HTMLElement, config: ObserveConfig, data: any[]): void {
        const store = config.src || 'store';
    
        switch (config.type) {
        case 'html':
            this.updateHTML(element, config, data, store);
            break;
        case 'value':
            this.updateValue(element, config, data, store);
            break;
        case 'text':
            this.updateText(element, config, data, store);
            break;
        case 'class':
            this.updateClass(element, config, data, store);
            break;
        case 'attribute':
            this.updateAttribute(element, config, data, store);
            break;
        case 'visibility':
            this.updateVisibility(element, config, data, store);
            break;
        case 'list':
            this.updateList(element, config, data, store);
            break;
        default:
            this.logger.warn(`Unknown observe type: ${config.type}`);
        }
    }

    private applyPrependAppend(value: string, config: ObserveConfig): string {
        let result = value;
        
        if (config.prepend && result) {
            result = config.prepend + result;
        }
        if (config.append && result) {
            result = result + config.append;
        }
        
        return result;
    }

    private updateHTML(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field) {
            this.logger.warn('HTML observe config missing field');
            return;
        }

        const value = this.getFieldValue(data, config.field, store);
        if (value !== undefined) {
            const processedValue = this.applyPrependAppend(String(value), config);
            element.innerHTML = processedValue;
            element.setAttribute('data-bound-field', config.field);
        }
    }

    private updateValue(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field) {
            this.logger.warn('Value observe config missing field');
            return;
        }

        const value = this.getFieldValue(data, config.field, store);
        if (value !== undefined && (element instanceof HTMLInputElement || 
        element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
            const processedValue = this.applyPrependAppend(String(value), config);
            element.value = processedValue;
            element.setAttribute('data-bound-field', config.field);
        }
    }

    private updateText(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field) {
            this.logger.warn('Text observe config missing field');
            return;
        }

        const value = this.getFieldValue(data, config.field, store);
        if (value !== undefined) {
            const processedValue = this.applyPrependAppend(String(value), config);
            element.textContent = processedValue;
            element.setAttribute('data-bound-field', config.field);
        }
    }

    private updateClass(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field || !config.value) {
            this.logger.warn('Class observe config missing field or value');
            return;
        }

        const fieldValue = this.getFieldValue(data, config.field, store);
        const shouldHaveClass = fieldValue === config.value;
    
        // Use data attributes instead of classes for better maintainability
        if (shouldHaveClass) {
            element.setAttribute(`data-${config.value}`, 'true');
        } else {
            element.removeAttribute(`data-${config.value}`);
        }
    }

    private updateAttribute(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field || !config.value) {
            this.logger.warn('Attribute observe config missing field or value');
            return;
        }

        const fieldValue = this.getFieldValue(data, config.field, store);
        let attributeValue = String(fieldValue || '');
        
        // Apply prepend and append from config
        attributeValue = this.applyPrependAppend(attributeValue, config);
        
        // Fallback: Check for legacy data-prepend attribute
        if (!config.prepend && !config.append) {
            const dataPrepend = element.getAttribute('data-prepend');
            if (dataPrepend && attributeValue) {
                attributeValue = dataPrepend + attributeValue;
            }
        }
        
        element.setAttribute(config.value, attributeValue);
    }

    private updateVisibility(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field) {
            this.logger.warn('Visibility observe config missing field');
            return;
        }

        const fieldValue = this.getFieldValue(data, config.field, store);
        const isVisible = Boolean(fieldValue);
    
        element.style.display = isVisible ? 'block' : 'none';
    }

    private updateList(element: HTMLElement, config: ObserveConfig, data: any[], store: string): void {
        if (!config.field) {
            this.logger.warn('List observe config missing field');
            return;
        }

        // Clear existing list items using modern API
        element.replaceChildren();
    
        if (Array.isArray(data)) {
            const listItems = data.map(item => {
                const listItem = document.createElement('li');
                const fieldValue = config.field && typeof item === 'object' && item !== null ? (item as any)[config.field] : item;
                listItem.textContent = String(fieldValue || item);
                listItem.setAttribute('data-value', String(fieldValue || item));
                return listItem;
            });
            element.append(...listItems);
        }
    }

    private getFieldValue(data: any[], field: string, store: string): any {
        if (!data || data.length === 0) {
            return undefined;
        }

        // Handle different data structures
        if (data.length === 1 && typeof data[0] === 'object') {
            // Single object (like store data)
            return data[0][field];
        } else if (Array.isArray(data)) {
            // Array of data
            return data.map(item => item[field]);
        }

        return undefined;
    }

    // Public API for notifying observers
    notifyObservers(datasource: string): void {
        const dataset = this.dataStore.getDataset(datasource);
        if (dataset) {
            this.dataObserver.notifyObservers(datasource, dataset.data);
        }
    }

    // Add observer programmatically
    addObserver(datasource: string, callback: (data: any[]) => void): void {
        this.dataObserver.addObserver(datasource, callback);
    }

    // Remove observer
    removeObserver(datasource: string, callback: (data: any[]) => void): void {
        this.dataObserver.removeObserver(datasource, callback);
    }

    // Remove all observers for a datasource
    removeAllObservers(datasource?: string): void {
        this.dataObserver.removeAllObservers(datasource);
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing UIObserver');
    
        // Clear all observers
        this.dataObserver.clear();
    
        this.disposed = true;
    
        this.logger.debug('UIObserver disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}
