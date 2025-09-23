import { Observable } from '../core/observable.js';
import { DataStore } from '../core/data-store.js';
import { ApiClient } from '../core/api-client.js';
import { ILogger } from '../core/logger.js';
import { IDisposable } from '../core/di-container.js';
import { TriggerConfig } from '../core/types.js';
import { 
    sortList, 
    getElementValue, 
    dataAttributeManager, 
    DataAttributeCategories,
    queryByDataRole,
    setDataState,
    getDataState
} from '../utils/helpers.js';

export class TriggerHandler implements IDisposable {
    private dataStore: DataStore;
    private apiClient: ApiClient;
    private logger: ILogger;
    private subscriptions: Array<{ unsubscribe: () => void }> = [];
    private disposed: boolean = false;
    private mutationObserver?: MutationObserver;
    private initializedElements: WeakSet<HTMLElement> = new WeakSet();

    constructor(dataStore: DataStore, apiClient: ApiClient, logger: ILogger) {
        this.dataStore = dataStore;
        this.apiClient = apiClient;
        this.logger = logger;
    }

    initializeTriggers(): void {
        // Initialize existing triggers
        this.scanAndInitializeTriggers();
        
        // Set up MutationObserver to watch for dynamically added triggers
        this.setupMutationObserver();
        
        this.logger.info(`Trigger handler initialized with dynamic content monitoring`);
    }

    private scanAndInitializeTriggers(): void {
        const triggers = document.querySelectorAll("[data-trigger]");
        
        this.logger.debug(`Found ${triggers.length} elements with data-trigger attribute`);
    
        for (let i = 0; i < triggers.length; i++) {
            const trigger = triggers[i] as HTMLElement;
            
            // Skip if already initialized
            if (this.initializedElements.has(trigger)) {
                this.logger.debug(`Skipping already initialized trigger: ${trigger.tagName}`);
                continue;
            }
            
            this.logger.debug(`Initializing trigger ${i + 1}/${triggers.length}: ${trigger.tagName}${trigger.id ? '#' + trigger.id : ''}${trigger.className ? '.' + trigger.className.split(' ').join('.') : ''}`);
      
            // Mark trigger elements with framework data attributes
            dataAttributeManager.setAttribute(trigger, DataAttributeCategories.FRAMEWORK, 'trigger-element');
            dataAttributeManager.setAttribute(trigger, DataAttributeCategories.STATE, 'initialized', 'false');
      
            this.initializeTrigger(trigger);
      
            // Mark as initialized
            dataAttributeManager.setAttribute(trigger, DataAttributeCategories.STATE, 'initialized', 'true');
            this.initializedElements.add(trigger);
        }
        
        this.logger.info(`Successfully initialized ${triggers.length} trigger elements`);
    }

    private setupMutationObserver(): void {
        if (!window.MutationObserver) {
            this.logger.warn('MutationObserver not supported - dynamic triggers will need manual initialization');
            return;
        }

        this.mutationObserver = new MutationObserver((mutations) => {
            let foundNewTriggers = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check added nodes
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            
                            // Check if the added element has data-trigger
                            if (element.hasAttribute && element.hasAttribute('data-trigger')) {
                                this.logger.debug(`Detected new trigger element: ${element.tagName}`);
                                this.initializeTrigger(element as HTMLElement);
                                this.initializedElements.add(element as HTMLElement);
                                foundNewTriggers = true;
                            }
                            
                            // Check descendants for data-trigger
                            const childTriggers = element.querySelectorAll && element.querySelectorAll('[data-trigger]');
                            if (childTriggers) {
                                for (const childTrigger of Array.from(childTriggers)) {
                                    if (!this.initializedElements.has(childTrigger as HTMLElement)) {
                                        this.logger.debug(`Detected new child trigger element: ${childTrigger.tagName}`);
                                        this.initializeTrigger(childTrigger as HTMLElement);
                                        this.initializedElements.add(childTrigger as HTMLElement);
                                        foundNewTriggers = true;
                                    }
                                }
                            }
                        }
                    }
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'data-trigger') {
                    // Handle dynamic addition/modification of data-trigger attribute
                    const element = mutation.target as HTMLElement;
                    if (!this.initializedElements.has(element) && element.hasAttribute('data-trigger')) {
                        this.logger.debug(`Detected data-trigger attribute added to: ${element.tagName}`);
                        this.initializeTrigger(element);
                        this.initializedElements.add(element);
                        foundNewTriggers = true;
                    }
                }
            }
            
            if (foundNewTriggers) {
                this.logger.debug('Completed processing new trigger elements');
            }
        });

        // Start observing
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-trigger']
        });
        
        this.logger.debug('MutationObserver setup complete - monitoring for dynamic triggers');
    }

    // Public method to manually re-scan for triggers (useful for complex scenarios)
    public reinitializeTriggers(): void {
        this.logger.debug('Manual trigger re-initialization requested');
        this.scanAndInitializeTriggers();
    }

    private initializeTrigger(trigger: HTMLElement): void {
        const triggerJson = trigger.getAttribute("data-trigger");
        if (!triggerJson) {
            this.logger.warn("Trigger element missing data-trigger attribute");
            return;
        }

        this.logger.debug(`Parsing trigger config: ${triggerJson}`);

        try {
            const config = JSON.parse(triggerJson);
            this.logger.debug(`Parsed trigger config: ${JSON.stringify(config)}`);
            
            const triggers = Array.isArray(config.triggers) ? config.triggers : [config];
            this.logger.debug(`Processing ${triggers.length} trigger configurations`);
      
            for (let i = 0; i < triggers.length; i++) {
                const triggerConfig = triggers[i];
                this.logger.debug(`Setting up trigger ${i + 1}: type=${triggerConfig.type}`);
                this.setupTrigger(trigger, triggerConfig, config.datasource || "store");
            }
        } catch (error) {
            this.logger.error(`Failed to parse trigger config: ${error}`);
        }
    }

    private setupTrigger(element: HTMLElement, config: TriggerConfig, datasource: string): void {
        switch (config.type) {
        case "change":
            this.setupChangeTrigger(element, datasource);
            break;
        case "click":
            this.setupClickTrigger(element, config);
            break;
        case "api":
            this.setupApiTrigger(element, config);
            break;
        case "undo":
            this.setupUndoTrigger(element);
            break;
        case "redo":
            this.setupRedoTrigger(element);
            break;
        case "keyup":
            this.setupKeyupTrigger(element, datasource);
            break;
        case "crud":
            this.setupCrudTrigger(element, config);
            break;
        case "list-selector":
            this.setupListSelectorTrigger(element, config);
            break;
        default:
            this.logger.warn(`Unknown trigger type: ${config.type}`);
        }
    }

    private setupChangeTrigger(element: HTMLElement, datasource: string): void {
        if (this.disposed) return;

        const changeObservable = Observable.fromEvent(element, "change");
    
        const subscription = changeObservable.subscribe({
            next: () => {
                const inputElement = element as HTMLInputElement;
                if (!inputElement.name) {
                    this.logger.warn("Change trigger element missing name attribute");
                    return;
                }

                const value = getElementValue(inputElement);
                this.dataStore.updateField(datasource, 0, inputElement.name, value);
        
                this.logger.debug(`Updated ${datasource}.${inputElement.name} = ${value}`);
            },
            error: (e: Error) => {
                this.logger.error(`Change trigger error: ${e}`);
            },
            complete: () => {
                // Change complete
            }
        });

        this.subscriptions.push(subscription);
    }

    private setupClickTrigger(element: HTMLElement, config: TriggerConfig): void {
        if (this.disposed) return;

        this.logger.debug(`Setting up click trigger for element with method=${config.method}, action=${config.action}, query=${config.query}`);

        const clickObservable = Observable.fromEvent(element, "click");
    
        const subscription = clickObservable.subscribe({
            next: () => {
                this.logger.debug(`Click trigger fired! Config: ${JSON.stringify(config)}`);
                
                // Execute callbefore callback if present
                if (config.callbefore) {
                    this.logger.debug(`Executing callbefore callback: ${config.callbefore.function}`);
                    this.executeCallback(config.callbefore.function, config.callbefore.params);
                }

                // Handle navigation if action is specified
                if (config.action) {
                    this.logger.debug(`Navigating to: ${config.action}`);
                    
                    // Check if it's an external URL
                    if (config.action.startsWith('http://') || config.action.startsWith('https://')) {
                        // External URL - navigate via window.location
                        window.location.href = config.action;
                    } else {
                        // Internal path - submit as POST form with language code and parameters
                        this.submitNavigationForm(config, element);
                    }
                } else if (config.query) {
                    this.logger.warn(`Click trigger has query but no action - this might be intended for API trigger instead`);
                } else {
                    this.logger.debug(`Click trigger fired with no action - callback-only trigger`);
                }
            },
            error: (e: Error) => {
                this.logger.error(`Click trigger error: ${e}`);
            },
            complete: () => {
                // Click complete
            }
        });

        this.subscriptions.push(subscription);
    }

    private setupApiTrigger(element: HTMLElement, config: TriggerConfig): void {
        const apiObservable = Observable.fromEvent(element, "click");
    
        apiObservable.subscribe({
            next: () => {
                const apiObject = {
                    type: "event",
                    object: [{ 
                        ...config,
                        element: element 
                    }]
                };

                if (config.callbefore) {
                    this.executeCallbackWithPromise(
                        config.callbefore.function, 
                        config.callbefore.params
                    ).then(() => {
                        this.apiClient.call(apiObject);
                    }).catch((error) => {
                        this.logger.error(`API trigger callbefore failed: ${error}`);
                    });
                } else {
                    this.apiClient.call(apiObject);
                }
            },
            error: (e: Error) => {
                this.logger.error(`API trigger error: ${e}`);
            },
            complete: () => {
                // API trigger complete
            }
        });
    }

    private setupUndoTrigger(element: HTMLElement): void {
        const undoObservable = Observable.fromEvent(element, "click");
    
        undoObservable.subscribe({
            next: () => {
                const success = this.dataStore.undo();
                if (success) {
                    this.logger.debug("Undo operation successful");
                } else {
                    this.logger.debug("No undo operation available");
                }
            },
            error: (e: any) => {
                this.logger.error(`Undo trigger error: ${e}`);
            },
            complete: () => {
                // Undo complete
            }
        });
    }

    private setupRedoTrigger(element: HTMLElement): void {
        const redoObservable = Observable.fromEvent(element, "click");
    
        redoObservable.subscribe({
            next: () => {
                const success = this.dataStore.redo();
                if (success) {
                    this.logger.debug("Redo operation successful");
                } else {
                    this.logger.debug("No redo operation available");
                }
            },
            error: (e: any) => {
                this.logger.error(`Redo trigger error: ${e}`);
            },
            complete: () => {
                // Redo complete
            }
        });
    }

    private setupKeyupTrigger(element: HTMLElement, datasource: string): void {
        const keyupObservable = Observable.fromEvent(element, "keyup");
    
        keyupObservable.subscribe({
            next: (event: Event) => {
                const inputElement = element as HTMLInputElement;
                const value = getElementValue(inputElement);
        
                // For keyup, we might want to just notify observers without updating history
                this.logger.debug(`Keyup: ${datasource}.${inputElement.name} = ${value}`);
            },
            error: (e: any) => {
                this.logger.error(`Keyup trigger error: ${e}`);
            },
            complete: () => {
                // Keyup complete
            }
        });
    }

    private setupCrudTrigger(element: HTMLElement, config: TriggerConfig): void {
        const crudObservable = Observable.fromEvent(element, "click");
    
        crudObservable.subscribe({
            next: () => {
                this.logger.debug("CRUD trigger activated");
                // TODO: Implement CRUD operations
            },
            error: (e: any) => {
                this.logger.error(`CRUD trigger error: ${e}`);
            },
            complete: () => {
                // CRUD complete
            }
        });
    }

    private setupListSelectorTrigger(element: HTMLElement, config: TriggerConfig): void {
        if (!config.element_to_id && !config.dataTarget) {
            this.logger.warn("List selector trigger missing element_to_id or dataTarget");
            return;
        }

        // Try data attribute target first, then fallback to ID
        let target: HTMLElement | null = null;
    
        if (config.dataTarget) {
            const elements = dataAttributeManager.getElements(DataAttributeCategories.COMPONENT, config.dataTarget);
            target = elements.length > 0 ? elements[0] : null;
        }
    
        if (!target && config.element_to_id) {
            target = document.getElementById(config.element_to_id);
        }
    
        if (!target) {
            this.logger.warn(`List selector target not found: ${config.dataTarget || config.element_to_id}`);
            return;
        }

        // Mark elements with their roles
        dataAttributeManager.setAttribute(element, DataAttributeCategories.ROLE, 'list-selector-source');
        dataAttributeManager.setAttribute(target, DataAttributeCategories.ROLE, 'list-selector-target');

        element.addEventListener("click", (e) => {
            if (e.target && (e.target as Element).nodeName.toLowerCase() === "li") {
                const listItem = e.target as HTMLElement;
        
                // Mark the item as moved
                dataAttributeManager.setAttribute(listItem, DataAttributeCategories.STATE, 'moved', 'true');
                dataAttributeManager.setAttribute(listItem, DataAttributeCategories.DATA, 'moved-timestamp', Date.now().toString());
        
        target!.appendChild(listItem);
        sortList(element);
        sortList(target!);
        
        // Update state
        setDataState(element, 'last-action', 'item-moved');
        setDataState(target!, 'last-update', Date.now().toString());
            }
        });
    }

    private buildCalendarData(config: TriggerConfig): Record<string, unknown> {
        const calendarData: Record<string, unknown> = {};
    
        if (config.params) {
            for (let param of config.params) {
                // Add static parameters
                if (param && typeof param === 'object' && 'key' in param && 'value' in param) {
                    const typedParam = param as { key: string; value: unknown };
                    calendarData[typedParam.key] = typedParam.value;
                }
            }
        }

        if (config.dataobjects) {
            for (let datasetName of config.dataobjects) {
                const dataset = this.dataStore.getDataset(datasetName);
                if (dataset) {
                    calendarData[datasetName] = dataset.data;
                }
            }
        }

        return calendarData;
    }

    private executeCallback(functionName: string, params: unknown[] = []): void {
        if (typeof (window as any)[functionName] === "function") {
            try {
                (window as any)[functionName](...params);
            } catch (error) {
                this.logger.error(`Callback execution failed: ${error}`);
            }
        } else {
            this.logger.error(`Callback function not found: ${functionName}`);
        }
    }

    private executeCallbackWithPromise(functionName: string, params: unknown[] = []): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (typeof (window as any)[functionName] === "function") {
                try {
                    const result = (window as any)[functionName](...params);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`Callback function not found: ${functionName}`));
            }
        });
    }

    private submitNavigationForm(config: TriggerConfig, element: HTMLElement): void {
        try {
            // Get current language code from URL path (e.g., /en/staff-overview)
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/').filter(part => part.length > 0);
            const langCode = pathParts.length > 0 && pathParts[0].length === 2 ? pathParts[0] : 'en';
            
            // Ensure action starts with language code
            let targetUrl = config.action;
            if (targetUrl?.startsWith('/') && !targetUrl.startsWith(`/${langCode}/`)) {
                targetUrl = `/${langCode}${targetUrl}`;
            }

            this.logger.debug(`Creating form for navigation: ${targetUrl} with method: ${config.method || 'POST'}`);

            // Create a form element
            const form = document.createElement('form');
            form.method = config.method || 'POST';
            form.action = targetUrl || '';
            form.style.display = 'none';

            // Extract parameters from trigger config and element
            const params = this.extractNavigationParams(config, element);
            
            // Add each parameter as a hidden input
            Object.entries(params).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
                this.logger.debug(`Added form param: ${key} = ${value}`);
            });

            // Add to document, submit, then remove
            document.body.appendChild(form);
            this.logger.debug(`Submitting form to: ${form.action} with ${form.children.length} parameters`);
            form.submit();
            document.body.removeChild(form);

        } catch (error) {
            this.logger.error(`Error creating navigation form: ${error}`);
            // Fallback to simple navigation
            window.location.href = config.action || '';
        }
    }

    private extractNavigationParams(config: TriggerConfig, element: HTMLElement): Record<string, string> {
        const params: Record<string, string> = {};

        try {
            // Handle params array from trigger config
            if (config.params && Array.isArray(config.params)) {
                for (const param of config.params) {
                    if (typeof param === 'object' && param !== null) {
                        // Merge parameter objects (like {accountguid: "123"})
                        Object.assign(params, param);
                        this.logger.debug(`Added trigger param: ${JSON.stringify(param)}`);
                    }
                }
            }

            // Extract data attributes from element (data-accountguid, etc.)
            const attributes = element.attributes;
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                if (attr.name.startsWith('data-') && !attr.name.startsWith('data-trigger') && !attr.name.startsWith('data-observe')) {
                    const paramName = attr.name.substring(5); // Remove 'data-' prefix
                    params[paramName] = attr.value;
                    this.logger.debug(`Added data attribute param: ${paramName} = ${attr.value}`);
                }
            }

        } catch (error) {
            this.logger.error(`Error extracting navigation params: ${error}`);
        }

        return params;
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing TriggerHandler');
    
        // Disconnect MutationObserver
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
            this.logger.debug('MutationObserver disconnected');
        }
    
        // Unsubscribe from all observables
        this.subscriptions.forEach(subscription => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(`Error unsubscribing from trigger handler: ${error}`);
            }
        });
    
        this.subscriptions.length = 0; // Clear array
        this.disposed = true;
    
        this.logger.debug('TriggerHandler disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}
