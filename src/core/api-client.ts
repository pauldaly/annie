import { ILogger } from './logger.js';
import { DataStore } from './data-store.js';
import { ApiRequest, ApiResponse } from './types.js';
import { dataAttributeManager, DataAttributeCategories } from '../utils/helpers.js';
import { IDisposable } from './di-container.js';
import { 
    isString, 
    isNumber, 
    isObject, 
    isValidUrl,
    ValidationManager,
    ValidationResult,
    validate,
    validateParams
} from '../utils/type-guards.js';

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
}

export interface QueryObject {
  query: {
    name: string;
    datasets: { dataset: string }[];
  };
}

export class ApiClient implements IDisposable {
    private baseUrl: string;
    private timeout: number;
    private logger: ILogger;
    private dataStore: DataStore;
    private xhr: XMLHttpRequest | null = null;
    private processing: boolean = false;
    private disposed: boolean = false;
    private activeRequests: Set<XMLHttpRequest> = new Set();
    private validationManager: ValidationManager;

    constructor(config: ApiConfig, dataStore: DataStore, logger: ILogger) {
    // Validate constructor parameters
        this.logger = logger;
        this.validateConfig(config);
    
        this.baseUrl = config.baseUrl;
        this.timeout = config.timeout || 30000;
        this.dataStore = dataStore;
        this.validationManager = new ValidationManager(logger);
    }

    private validateConfig(config: ApiConfig): void {
        const baseUrlValidation = validate(config.baseUrl, 'string', { minLength: 1 });
    
        if (!baseUrlValidation.isValid) {
            throw new Error(`Invalid API config: ${baseUrlValidation.errors.join(', ')}`);
        }
    
        // Basic URL validation
        if (!isValidUrl(config.baseUrl)) {
            this.logger.debug(`Base URL is not a full URL, treating as relative path: ${config.baseUrl}`);
        }
    
        if (config.timeout !== undefined) {
            const timeoutValidation = validate(config.timeout, 'number', { min: 1000, max: 300000 });
            if (!timeoutValidation.isValid) {
                this.logger.warn(`Invalid timeout value: ${timeoutValidation.errors.join(', ')}`);
            }
        }
    }

    isProcessing(): boolean {
        return this.processing;
    }

    async call(apiObject: unknown): Promise<unknown> {
        if (this.disposed) {
            throw new Error('ApiClient has been disposed');
        }
    
        this.logger.debug(`API call initiated with object: ${JSON.stringify(apiObject)}`);
    
        // Validate API object
        if (!this.validateApiObject(apiObject)) {
            throw new Error('Invalid API object provided');
        }

        return new Promise((resolve, reject) => {
            this.processing = true;
      
            try {
                const requestData = this.buildRequestData(apiObject);
                const url = this.getUrl(apiObject);
                const method = this.getMethod(apiObject);

                this.logger.debug(`API call details - URL: ${url}, Method: ${method}, Data: ${requestData}`);

                // Validate URL before making request
                if (!url || !isString(url)) {
                    throw new Error('Invalid URL generated from API object');
                }

                this.xhr = new XMLHttpRequest();
                this.activeRequests.add(this.xhr);
        
                this.xhr.open(method, url, true);
                this.xhr.setRequestHeader('Content-Type', 'application/json');
                
                // Debug logging
                this.logger.debug(`API Call - URL: ${url}, Method: ${method}, Data: ${requestData}`);
        
                this.xhr.addEventListener('load', () => {
                    this.processing = false;
                    this.activeRequests.delete(this.xhr!);
                    if (this.xhr!.status === 200) {
                        this.handleSuccess(this.xhr!.responseText, apiObject, resolve, reject);
                    } else {
                        this.handleError(`HTTP ${this.xhr!.status}`, reject);
                    }
                });

                this.xhr.addEventListener('error', () => {
                    this.processing = false;
                    this.activeRequests.delete(this.xhr!);
                    this.handleError('Network error', reject);
                });

                this.xhr.addEventListener('timeout', () => {
                    this.processing = false;
                    this.activeRequests.delete(this.xhr!);
                    this.handleError('Request timeout', reject);
                });

                this.xhr.addEventListener('abort', () => {
                    this.processing = false;
                    this.activeRequests.delete(this.xhr!);
                    reject(new Error('Request aborted'));
                });

                this.xhr.timeout = this.timeout;
                this.xhr.send(requestData);
        
            } catch (error) {
                this.processing = false;
                if (this.xhr) {
                    this.activeRequests.delete(this.xhr);
                }
                reject(error);
            }
        });
    }

    private validateApiObject(apiObject: unknown): boolean {
    // Basic validation - should be an object or string
        if (!isObject(apiObject) && !isString(apiObject)) {
            this.logger.error('API object must be an object or string');
            return false;
        }

        // If it's an object, validate it has required properties
        if (isObject(apiObject)) {
            // Allow empty objects for simple GET requests
            return true;
        }

        // If it's a string, it should be non-empty
        if (isString(apiObject)) {
            return apiObject.trim().length > 0;
        }

        return false;
    }

    private buildRequestData(apiObject: unknown): string {
        const requestData: any = {};
    
        // Add store data (filter out problematic parameters)
        const storeData = this.dataStore.getDataset('store');
        if (storeData && storeData.data[0]) {
            const filteredStoreData = this.filterStoreData(storeData.data[0]);
            Object.assign(requestData, filteredStoreData);
        }

        // Extract parameters from trigger config (for row-specific data like accountguid)
        this.extractTriggerParams(apiObject, requestData);

        // Build queries object
        const queries = this.buildQueries(apiObject);
        if (queries.length > 0) {
            requestData.queries = queries;
        }

        this.logger.debug(`Request data being sent: ${JSON.stringify(requestData)}`);
        return JSON.stringify(requestData);
    }

    private filterStoreData(storeData: any): any {
        const filtered = { ...storeData };
        
        // Remove parameters that might cause server issues
        const problematicKeys = ['culture', 'locale', 'lang', 'language'];
        
        for (const key of problematicKeys) {
            if (filtered[key] === null || filtered[key] === 'NULL' || filtered[key] === undefined || filtered[key] === '') {
                this.logger.debug(`Filtering out problematic parameter: ${key} = ${filtered[key]}`);
                delete filtered[key];
            }
        }
        
        return filtered;
    }

    private extractTriggerParams(apiObject: unknown, requestData: any): void {
        // Check if this is an event-based API call with trigger config
        if (typeof apiObject === 'object' && apiObject && 
            'object' in apiObject && Array.isArray(apiObject.object) && 
            apiObject.object[0]) {
            
            const triggerConfig = apiObject.object[0];
            
            // Handle params array - for row-specific parameters like accountguid
            if (triggerConfig.params && Array.isArray(triggerConfig.params)) {
                for (const param of triggerConfig.params) {
                    if (typeof param === 'object' && param !== null) {
                        // Merge parameter objects (like {accountguid: "123"})
                        Object.assign(requestData, param);
                        this.logger.debug(`Added trigger params: ${JSON.stringify(param)}`);
                    }
                }
            }

            // Handle form data if form array is specified
            if (triggerConfig.form && Array.isArray(triggerConfig.form)) {
                for (const formId of triggerConfig.form) {
                    const formElement = document.getElementById(formId) as HTMLFormElement;
                    if (formElement) {
                        const formData = new FormData(formElement);
                        // Use forEach instead of entries() for better compatibility
                        formData.forEach((value, key) => {
                            requestData[key] = value;
                        });
                        this.logger.debug(`Added form data from ${formId}`);
                    }
                }
            }

            // Extract data attributes from the element (legacy support)
            if (triggerConfig.element && triggerConfig.element instanceof HTMLElement) {
                this.extractElementDataAttributes(triggerConfig.element, requestData);
            }
        }
    }

    private extractElementDataAttributes(element: HTMLElement, requestData: any): void {
        // Extract all data-* attributes except framework-specific ones
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            if (attr.name.startsWith('data-') && 
                !attr.name.startsWith('data-trigger') &&
                !attr.name.startsWith('data-observe') &&
                !attr.name.startsWith('data-route') &&
                !attr.name.startsWith('data-role') &&
                !attr.name.startsWith('data-component') &&
                !attr.name.startsWith('data-action') &&
                !attr.name.startsWith('data-state')) {
                
                // Convert data-accountguid to accountguid
                const paramName = attr.name.substring(5); // Remove 'data-' prefix
                requestData[paramName] = attr.value;
                this.logger.debug(`Added element data attribute: ${paramName} = ${attr.value}`);
            }
        }
    }

    private buildQueries(apiObject: unknown): QueryObject[] {
        const queries: QueryObject[] = [];

        if (typeof apiObject === "string") {
            // Handle string-based API calls (load, remote, lazyload)
            const datasetsInitObj = (window as any)._datasetsinit;
            
            // Check if it's a category key (load, remote, lazyload)
            if (datasetsInitObj && datasetsInitObj[apiObject]) {
                for (let ds of datasetsInitObj[apiObject]) {
                    if (typeof ds === "string") {
                        queries.push({
                            query: { name: ds, datasets: [{ dataset: ds }] }
                        });
                    } else if (typeof ds === "object") {
                        if (ds.dataset) {
                            queries.push({
                                query: { name: ds.query, datasets: [{ dataset: ds.dataset }] }
                            });
                        } else if (ds.datasets) {
                            const datasets = ds.datasets.map((name: string) => ({ dataset: name }));
                            queries.push({
                                query: { name: ds.query, datasets }
                            });
                        }
                    }
                }
            } else {
                // Handle individual dataset name
                queries.push({
                    query: { name: apiObject, datasets: [{ dataset: apiObject }] }
                });
            }
        } else if (typeof apiObject === "object" && apiObject && 'object' in apiObject && Array.isArray(apiObject.object) && apiObject.object[0]?.query) {
            // Handle object-based API calls
            for (let ds of apiObject.object[0].query) {
                if (typeof ds === "string") {
                    queries.push({
                        query: { name: ds, datasets: [{ dataset: ds }] }
                    });
                } else if (typeof ds === "object") {
                    if (ds.dataset) {
                        queries.push({
                            query: { name: ds.name, datasets: [{ dataset: ds.dataset }] }
                        });
                    } else if (ds.datasets) {
                        const datasets = ds.datasets.map((name: string) => ({ dataset: name }));
                        queries.push({
                            query: { name: ds.name, datasets }
                        });
                    }
                }
            }
        }

        return queries;
    }

    private getUrl(apiObject: unknown): string {
        // Check for trigger config with action property
        if (typeof apiObject === 'object' && apiObject && 
            'object' in apiObject && Array.isArray(apiObject.object) && 
            apiObject.object[0]?.action) {
            
            const action = apiObject.object[0].action;
            // If action starts with http/https, use it as-is, otherwise prepend baseUrl
            if (action.startsWith('http://') || action.startsWith('https://')) {
                return action;
            } else {
                return action.startsWith('/') ? action : `${this.baseUrl}/${action}`;
            }
        }

        // Check for remote URL
        if (typeof apiObject === "string" && apiObject === "remote") {
            const datasetsInitObj = (window as any)._datasetsinit;
            if (datasetsInitObj?.remote) {
                for (let ds of datasetsInitObj.remote) {
                    if (ds.url) {
                        return ds.url;
                    }
                }
            }
        }
        return this.baseUrl;
    }

    private getMethod(apiObject: unknown): string {
        // Check for trigger config with method property
        if (typeof apiObject === 'object' && apiObject && 
            'object' in apiObject && Array.isArray(apiObject.object) && 
            apiObject.object[0]?.method) {
            
            return apiObject.object[0].method.toUpperCase();
        }

        if (typeof apiObject === "string" && apiObject === "remote") {
            const datasetsInitObj = (window as any)._datasets_init_obj;
            if (datasetsInitObj?.remote) {
                for (let ds of datasetsInitObj.remote) {
                    if (ds.method) {
                        return ds.method;
                    }
                }
            }
        }
        return "POST";
    }

    private handleSuccess(responseText: string, apiObject: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void): void {
        if (responseText.length === 0) {
            this.executeCallback(apiObject);
            resolve("done");
            return;
        }

        try {
            const jsonObj = JSON.parse(responseText);
            this.logger.debug(`API Response received: ${JSON.stringify(jsonObj)}`);
            this.processResponseWithDataAttributes(jsonObj, apiObject);
            this.executeCallback(apiObject);
            resolve("done");
        } catch (error) {
            this.logger.error(`Failed to parse response: ${error}`);
            this.handleParseError(responseText, apiObject, resolve, reject);
        }
    }

    private processResponse(jsonObj: unknown, apiObject: unknown): void {
        this.logger.debug(`Processing response structure: ${Array.isArray(jsonObj) ? 'Array' : typeof jsonObj}`);
        
        // Handle array response (e.g., from APIs like Hacker News)
        if (Array.isArray(jsonObj)) {
            this.logger.debug(`Processing array response with ${jsonObj.length} items`);
            const remoteDataset = this.getRemoteDatasetName(apiObject);
            if (remoteDataset) {
                this.logger.debug(`Storing array response in dataset: ${remoteDataset}`);
                this.dataStore.setDataset(remoteDataset, jsonObj, {
                    object: "false",
                    count: jsonObj.length
                });
                this.logger.debug(`Dataset ${remoteDataset} stored in DataStore`);
            }
            return;
        }

        // Handle standard response with root object
        if (jsonObj && typeof jsonObj === 'object' && 'root' in jsonObj) {
            this.logger.debug(`Processing structured response with root property`);
            const typedJsonObj = jsonObj as { root: Record<string, unknown>[] };
            for (let obj of typedJsonObj.root) {
                const datasetName = Object.keys(obj)[0];
                const data = obj[datasetName];
                const normalizedName = datasetName.replace(/-/g, "_");
                
                this.logger.debug(`Found dataset: ${datasetName} (normalized: ${normalizedName})`);
        
                if (Array.isArray(data)) {
                    this.logger.debug(`Storing dataset ${normalizedName} with ${data.length} items`);
                    this.dataStore.setDataset(normalizedName, data, {
                        object: "false", 
                        count: data.length
                    });
                    this.logger.debug(`Dataset ${normalizedName} stored in DataStore`);
                } else {
                    this.logger.warn(`Dataset ${datasetName} data is not an array: ${JSON.stringify(data)}`);
                }
            }
        }
        // Handle response with data property (new format)
        else if (jsonObj && typeof jsonObj === 'object' && 'data' in jsonObj) {
            this.logger.debug(`Processing structured response with data property`);
            const typedJsonObj = jsonObj as { data: Record<string, unknown> };
            
            for (let [datasetName, data] of Object.entries(typedJsonObj.data)) {
                const normalizedName = datasetName.replace(/-/g, "_");
                
                this.logger.debug(`Found dataset: ${datasetName} (normalized: ${normalizedName})`);
        
                if (Array.isArray(data)) {
                    this.logger.debug(`Storing dataset ${normalizedName} with ${data.length} items`);
                    this.dataStore.setDataset(normalizedName, data, {
                        object: "false", 
                        count: data.length
                    });
                    this.logger.debug(`Dataset ${normalizedName} stored in DataStore`);
                } else {
                    this.logger.warn(`Dataset ${datasetName} data is not an array: ${JSON.stringify(data)}`);
                }
            }
        } else {
            this.logger.warn(`Unexpected response structure - not array and no root property: ${JSON.stringify(jsonObj)}`);
        }
    }

    private getRemoteDatasetName(apiObject: any): string | null {
        if (typeof apiObject === "string" && apiObject === "remote") {
            const datasetsInitObj = (window as any)._datasets_init_obj;
            if (datasetsInitObj?.remote) {
                for (let ds of datasetsInitObj.remote) {
                    if (ds.dataset) {
                        return ds.dataset;
                    }
                }
            }
        }
        return null;
    }

    private handleParseError(responseText: string, apiObject: any, resolve: Function, reject: Function): void {
        try {
            const cleanAttempt = '{"root":[' + responseText.replace(/}{/g, "},{") + "]}";
            const cleanObj = JSON.parse(cleanAttempt);
            const jsonObj = cleanObj["root"][cleanObj["root"].length - 1];
      
            this.processResponse(jsonObj, apiObject);
            this.executeCallback(apiObject);
            resolve("done");
        } catch (error) {
            this.logger.error(`Failed to clean and parse response: ${error}`);
            reject(error);
        }
    }

    private executeCallback(apiObject: any): void {
        const callback = this.getCallback(apiObject);
        if (callback && typeof (window as any)[callback] === "function") {
            try {
                (window as any)[callback](apiObject);
            } catch (error) {
                this.logger.error(`Callback execution failed: ${error}`);
            }
        }
    }

    private getCallback(apiObject: any): string | null {
        if (typeof apiObject === "object" && apiObject.object && apiObject.object[0]?.callback) {
            return apiObject.object[0].callback;
        }
        return null;
    }

    private handleError(message: string, reject: Function): void {
        this.logger.error(`API call failed: ${message}`);
        reject(new Error(message));
    }

    private objToFormData(obj: Record<string, unknown>, formData?: FormData, prefix?: string): FormData {
        formData = formData || new FormData();
    
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                const formKey = prefix ? `${prefix}[${key}]` : key;
                const value = obj[key];
        
                if (value === null || value === undefined) {
                    formData.append(formKey, '');
                } else if (typeof value === 'object' && !(value instanceof File)) {
                    this.objToFormData(value as Record<string, unknown>, formData, formKey);
                } else {
                    formData.append(formKey, String(value));
                }
            }
        }
    
        return formData;
    }

    cancel(): void {
        if (this.xhr) {
            this.xhr.abort();
            this.activeRequests.delete(this.xhr);
            this.processing = false;
        }
    }

    cancelAll(): void {
        this.activeRequests.forEach(xhr => {
            try {
                xhr.abort();
            } catch (error) {
                this.logger.warn(`Error aborting request: ${error}`);
            }
        });
        this.activeRequests.clear();
        this.processing = false;
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing ApiClient');
    
        // Cancel all active requests
        this.cancelAll();
    
        // Clear references
        this.xhr = null;
        this.disposed = true;
    
        this.logger.debug('ApiClient disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }

    // Data attribute management for API responses
    private markApiGeneratedContent(elements: HTMLElement[], apiContext: string): void {
        elements.forEach(element => {
            dataAttributeManager.setAttribute(element, DataAttributeCategories.FRAMEWORK, 'api-generated');
            dataAttributeManager.setAttribute(element, DataAttributeCategories.DATA, 'api-context', apiContext);
            dataAttributeManager.setAttribute(element, DataAttributeCategories.DATA, 'api-timestamp', Date.now().toString());
        });
    }

    private findApiTargetElement(apiObject: unknown): HTMLElement | null {
    // Look for data attribute targets first, then fall back to ID
        const targetConfig = this.getTargetConfig(apiObject);
        if (!targetConfig) return null;

        // Try data attribute selector first
        if (targetConfig.dataTarget) {
            const elements = dataAttributeManager.getElements(DataAttributeCategories.COMPONENT, targetConfig.dataTarget);
            if (elements.length > 0) return elements[0];
        }

        // Fallback to ID selector
        if (targetConfig.id) {
            return document.getElementById(targetConfig.id);
        }

        return null;
    }

    private getTargetConfig(apiObject: unknown): { dataTarget?: string; id?: string } | null {
        if (typeof apiObject === 'object' && apiObject && 'object' in apiObject && Array.isArray(apiObject.object)) {
            const config = apiObject.object[0];
            return {
                dataTarget: config?.dataTarget,
                id: config?.element_to_id
            };
        }
        return null;
    }

    // Enhanced response processing with data attribute support
    private processResponseWithDataAttributes(jsonObj: unknown, apiObject: unknown): void {
        this.processResponse(jsonObj, apiObject);
    
        // Mark any dynamically generated content
        const targetElement = this.findApiTargetElement(apiObject);
        if (targetElement) {
            const apiContext = this.getApiContext(apiObject);
            this.markApiGeneratedContent([targetElement], apiContext);
      
            // Mark child elements as well
            const childElements = Array.from(targetElement.querySelectorAll('*')) as HTMLElement[];
            this.markApiGeneratedContent(childElements, apiContext);
        }
    }

    private getApiContext(apiObject: unknown): string {
        if (typeof apiObject === 'string') {
            return apiObject;
        }
    
        if (typeof apiObject === 'object' && apiObject && 'object' in apiObject) {
            return 'object-api';
        }
    
        return 'unknown-api';
    }
}
