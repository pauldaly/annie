/**
 * Utility functions used throughout the application
 */

export function generateRandomClass(): string {
    return Math.random().toString(36).slice(2);
}

export function GUID(separator: string = '~'): string {
    const d = new Date().getTime();
    const uuid = 'xxxxxxxx~xxxx~4xxx~yxxx~xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        const d_floor = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid.replace(/~/g, separator);
}

export function pad(str: string | number, max: number): string {
    const strVal = str.toString();
    return strVal.length < max ? pad("0" + strVal, max) : strVal;
}

export function padMax(str: string | number, max: number, padstr: string): string {
    const strVal = str.toString();
    return strVal.length < max ? padMax(padstr + strVal, max, padstr) : strVal;
}

export function padAppend(str: string, padlen: number, padstr: string): string {
    return str.padStart(str.length + padlen, padstr);
}

export function objToFormData(obj: Record<string, unknown>, formData?: FormData, prefix?: string): FormData {
    formData = formData || new FormData();
  
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const formKey = prefix ? `${prefix}[${key}]` : key;
            const value = obj[key];
      
            if (value === null || value === undefined) {
                formData.append(formKey, '');
            } else if (typeof value === 'object' && !(value instanceof File)) {
                objToFormData(value as Record<string, unknown>, formData, formKey);
            } else {
                formData.append(formKey, String(value));
            }
        }
    }
  
    return formData;
}

export function sortList(list: HTMLElement): void {
    const items = list.querySelectorAll('li');
    const sortedItems = Array.from(items).sort(function(a, b) {
        const aText = a.textContent?.toLowerCase() || '';
        const bText = b.textContent?.toLowerCase() || '';
        return aText.localeCompare(bText);
    });

    // Re-append the sorted items using modern replaceChildren API
    list.replaceChildren(...sortedItems);
}

export function grep<T>(items: T[], value: T, method: string): T[] {
    switch (method) {
    case "exists":
        return items.filter(item => item === value);
    case "remove":
        return items.filter(item => item !== value);
    case "unique":
        return [...new Set(items)];
    default:
        return [];
    }
}

export function isHTMLInputElement(element: Element): element is HTMLInputElement {
    return element instanceof HTMLInputElement;
}

export function isHTMLSelectElement(element: Element): element is HTMLSelectElement {
    return element instanceof HTMLSelectElement;
}

export function isHTMLTextAreaElement(element: Element): element is HTMLTextAreaElement {
    return element instanceof HTMLTextAreaElement;
}

export function getElementValue(element: Element): string {
    if (isHTMLInputElement(element)) {
        return element.value;
    } else if (isHTMLSelectElement(element)) {
        return element.value;
    } else if (isHTMLTextAreaElement(element)) {
        return element.value;
    }
    return '';
}

export function setElementValue(element: Element, value: string): void {
    if (isHTMLInputElement(element)) {
        element.value = value;
    } else if (isHTMLSelectElement(element)) {
        element.value = value;
    } else if (isHTMLTextAreaElement(element)) {
        element.value = value;
    }
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
  
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
  
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
  
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }
  
    if (obj instanceof Array) {
        return obj.map((item) => deepClone(item)) as unknown as T;
    }
  
    if (typeof obj === "object") {
        const clonedObj = {} as T;
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
  
    return obj;
}

// ============================================================================
// Modern DOM Utility Functions - Enhanced for better type safety and performance
// ============================================================================

/**
 * Create an HTML element with attributes and text content
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes?: Record<string, string>,
    textContent?: string
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
  
    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
  
    if (textContent !== undefined) {
        element.textContent = textContent;
    }
  
    return element;
}

/**
 * Modern class manipulation utilities
 */
export function toggleClass(element: HTMLElement, className: string, force?: boolean): boolean {
    return element.classList.toggle(className, force);
}

export function hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
}

export function addClass(element: HTMLElement, ...classNames: string[]): void {
    element.classList.add(...classNames);
}

export function removeClass(element: HTMLElement, ...classNames: string[]): void {
    element.classList.remove(...classNames);
}

/**
 * Enhanced selector utilities with type safety
 */
export function closest<K extends keyof HTMLElementTagNameMap>(
  element: HTMLElement,
  selector: K
): HTMLElementTagNameMap[K] | null;
export function closest(element: HTMLElement, selector: string): HTMLElement | null;
export function closest(element: HTMLElement, selector: string): HTMLElement | null {
    return element.closest(selector);
}

export function matches(element: HTMLElement, selector: string): boolean {
    return element.matches(selector);
}

/**
 * Modern event handling utility
 */
export function delegateEvent<K extends keyof HTMLElementEventMap>(
    container: HTMLElement,
    selector: string,
    eventType: K,
    handler: (event: HTMLElementEventMap[K] & { delegateTarget: HTMLElement }) => void
): void {
    container.addEventListener(eventType, (event) => {
        const target = event.target as HTMLElement;
        const delegateTarget = target.closest(selector) as HTMLElement;
    
        if (delegateTarget && container.contains(delegateTarget)) {
            const delegateEvent = event as HTMLElementEventMap[K] & { delegateTarget: HTMLElement };
            delegateEvent.delegateTarget = delegateTarget;
            handler(delegateEvent);
        }
    });
}

/**
 * Safely set innerHTML with sanitization warning
 */
export function setInnerHTML(element: HTMLElement, html: string, sanitize = true): void {
    if (sanitize) {
    // Basic XSS protection - remove script tags and event handlers
        const sanitized = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
        element.innerHTML = sanitized;
    } else {
        element.innerHTML = html;
    }
}

// ============================================================================
// Modern Async Utilities
// ============================================================================

/**
 * Modern sleep function using Promise
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 */
export function waitFor(
    condition: () => boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
  
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
    
        const check = () => {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error('Condition timeout'));
            } else {
                setTimeout(check, interval);
            }
        };
    
        check();
    });
}

/**
 * Create a cancel-able timeout
 */
export function createTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(callback, delay);
    return {
        cancel: () => clearTimeout(timeoutId)
    };
}

/**
 * Request Animation Frame Promise wrapper
 */
export function nextFrame(): Promise<number> {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Request Idle Callback Promise wrapper with fallback
 */
export function nextIdle(options?: IdleRequestOptions): Promise<IdleDeadline> {
    return new Promise(resolve => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(resolve, options);
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => resolve({
                didTimeout: false,
                timeRemaining: () => 16.67 // ~60fps budget
            } as IdleDeadline), 1);
        }
    });
}

// Data Attribute Management System
export interface DataAttributeConfig {
  prefix?: string;
  separator?: string;
  caseStyle?: 'kebab' | 'camel' | 'snake';
}

export class DataAttributeManager {
    private config: DataAttributeConfig;
    private attributeRegistry = new Map<string, Set<HTMLElement>>();

    constructor(config: DataAttributeConfig = {}) {
        this.config = {
            prefix: 'annie',
            separator: '-',
            caseStyle: 'kebab',
            ...config
        };
    }

    // Generate standardized data attribute names
    public generateAttributeName(category: string, name: string): string {
        const prefix = this.config.prefix!;
        const separator = this.config.separator!;
    
        let attributeName = `${prefix}${separator}${category}`;
        if (name) {
            attributeName += `${separator}${this.formatName(name)}`;
        }
    
        return attributeName;
    }

    // Set data attribute with automatic registration
    public setAttribute(element: HTMLElement, category: string, name: string, value?: string): void {
        const attrName = this.generateAttributeName(category, name);
        const attrValue = value || name;
    
        element.setAttribute(`data-${attrName}`, attrValue);
        this.registerElement(attrName, element);
    }

    // Get elements by data attribute
    public getElements(category: string, name?: string): HTMLElement[] {
        const attrName = this.generateAttributeName(category, name || '');
        const selector = name 
            ? `[data-${attrName}="${name}"]`
            : `[data-${attrName}]`;
    
        return Array.from(document.querySelectorAll(selector));
    }

    // Get single element by data attribute
    public getElement(category: string, name: string): HTMLElement | null {
        const elements = this.getElements(category, name);
        return elements.length > 0 ? elements[0] : null;
    }

    // Remove data attribute
    public removeAttribute(element: HTMLElement, category: string, name: string): void {
        const attrName = this.generateAttributeName(category, name);
        element.removeAttribute(`data-${attrName}`);
        this.unregisterElement(attrName, element);
    }

    // Check if element has data attribute
    public hasAttribute(element: HTMLElement, category: string, name: string): boolean {
        const attrName = this.generateAttributeName(category, name);
        return element.hasAttribute(`data-${attrName}`);
    }

    // Get attribute value
    public getAttributeValue(element: HTMLElement, category: string, name: string): string | null {
        const attrName = this.generateAttributeName(category, name);
        return element.getAttribute(`data-${attrName}`);
    }

    // Batch set attributes
    public setAttributes(element: HTMLElement, attributes: Record<string, { category: string; name: string; value?: string }>): void {
        Object.entries(attributes).forEach(([key, config]) => {
            this.setAttribute(element, config.category, config.name, config.value);
        });
    }

    // Find elements by multiple data attributes
    public findElements(criteria: Array<{ category: string; name: string; value?: string }>): HTMLElement[] {
        const selectors = criteria.map(({ category, name, value }) => {
            const attrName = this.generateAttributeName(category, name);
            return value 
                ? `[data-${attrName}="${value}"]`
                : `[data-${attrName}]`;
        });
    
        const selector = selectors.join('');
        return Array.from(document.querySelectorAll(selector));
    }

    // Register element for tracking
    private registerElement(attrName: string, element: HTMLElement): void {
        if (!this.attributeRegistry.has(attrName)) {
            this.attributeRegistry.set(attrName, new Set());
        }
    this.attributeRegistry.get(attrName)!.add(element);
    }

    // Unregister element
    private unregisterElement(attrName: string, element: HTMLElement): void {
        const elements = this.attributeRegistry.get(attrName);
        if (elements) {
            elements.delete(element);
            if (elements.size === 0) {
                this.attributeRegistry.delete(attrName);
            }
        }
    }

    // Format name according to case style
    private formatName(name: string): string {
        switch (this.config.caseStyle) {
        case 'kebab':
            return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        case 'snake':
            return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        case 'camel':
            return name;
        default:
            return name.toLowerCase();
        }
    }

    // Get registry stats
    public getRegistryStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        this.attributeRegistry.forEach((elements, attrName) => {
            stats[attrName] = elements.size;
        });
        return stats;
    }

    // Clear registry
    public clearRegistry(): void {
        this.attributeRegistry.clear();
    }
}

// Predefined data attribute categories for Annie Framework
export const DataAttributeCategories = {
    // Component identification
    COMPONENT: 'component',
    MODULE: 'module',
    WIDGET: 'widget',
  
    // Functional roles
    ROLE: 'role',
    ACTION: 'action',
    TRIGGER: 'trigger',
    OBSERVER: 'observer',
  
    // Navigation and routing
    ROUTE: 'route',
    NAV: 'nav',
    LINK: 'link',
  
    // Data and state
    DATA: 'data',
    STATE: 'state',
    BIND: 'bind',
  
    // UI interaction
    INPUT: 'input',
    OUTPUT: 'output',
    CONTROL: 'control',
    FEEDBACK: 'feedback',
  
    // Framework internal
    FRAMEWORK: 'framework',
    SYSTEM: 'system',
    INTERNAL: 'internal'
} as const;

// Standard data attribute roles for Annie Framework
export const DataAttributeRoles = {
    // Button roles
    SUBMIT: 'submit',
    CANCEL: 'cancel',
    RESET: 'reset',
    DELETE: 'delete',
    EDIT: 'edit',
    SAVE: 'save',
  
    // Container roles
    CONTAINER: 'container',
    WRAPPER: 'wrapper',
    CONTENT: 'content',
    HEADER: 'header',
    FOOTER: 'footer',
    SIDEBAR: 'sidebar',
  
    // Form roles
    FORM: 'form',
    FIELD: 'field',
    INPUT: 'input',
    LABEL: 'label',
    ERROR: 'error',
    SUCCESS: 'success',
  
    // Navigation roles
    MENU: 'menu',
    TAB: 'tab',
    BREADCRUMB: 'breadcrumb',
    PAGINATION: 'pagination',
  
    // Data display roles
    LIST: 'list',
    ITEM: 'item',
    TABLE: 'table',
    CARD: 'card',
    TILE: 'tile',
  
    // Modal and overlay roles
    MODAL: 'modal',
    OVERLAY: 'overlay',
    POPUP: 'popup',
    TOOLTIP: 'tooltip',
    DROPDOWN: 'dropdown'
} as const;

// Enhanced data attribute helper functions
export function setDataRole(element: HTMLElement, role: string, value?: string): void {
    element.setAttribute(`data-${DataAttributeCategories.ROLE}`, role);
    if (value) {
        element.setAttribute(`data-${role}`, value);
    }
}

export function getDataRole(element: HTMLElement): string | null {
    return element.getAttribute(`data-${DataAttributeCategories.ROLE}`);
}

export function hasDataRole(element: HTMLElement, role: string): boolean {
    return element.getAttribute(`data-${DataAttributeCategories.ROLE}`) === role;
}

export function setDataComponent(element: HTMLElement, component: string, instance?: string): void {
    element.setAttribute(`data-${DataAttributeCategories.COMPONENT}`, component);
    if (instance) {
        element.setAttribute(`data-${component}-instance`, instance);
    }
}

export function getDataComponent(element: HTMLElement): string | null {
    return element.getAttribute(`data-${DataAttributeCategories.COMPONENT}`);
}

export function setDataAction(element: HTMLElement, action: string, target?: string): void {
    element.setAttribute(`data-${DataAttributeCategories.ACTION}`, action);
    if (target) {
        element.setAttribute(`data-${action}-target`, target);
    }
}

export function getDataAction(element: HTMLElement): string | null {
    return element.getAttribute(`data-${DataAttributeCategories.ACTION}`);
}

export function setDataState(element: HTMLElement, state: string, value?: string): void {
    element.setAttribute(`data-${DataAttributeCategories.STATE}`, state);
    if (value !== undefined) {
        element.setAttribute(`data-${state}-value`, value);
    }
}

export function getDataState(element: HTMLElement, state?: string): string | null {
    if (state) {
        return element.getAttribute(`data-${state}-value`);
    }
    return element.getAttribute(`data-${DataAttributeCategories.STATE}`);
}

export function toggleDataState(element: HTMLElement, state: string, value1: string, value2: string): string {
    const current = getDataState(element, state);
    const newValue = current === value1 ? value2 : value1;
    setDataState(element, state, newValue);
    return newValue;
}

// Query functions using data attributes
export function queryByDataRole(role: string, parent: Element | Document = document): HTMLElement[] {
    return Array.from(parent.querySelectorAll(`[data-${DataAttributeCategories.ROLE}="${role}"]`));
}

export function queryByDataComponent(component: string, parent: Element | Document = document): HTMLElement[] {
    return Array.from(parent.querySelectorAll(`[data-${DataAttributeCategories.COMPONENT}="${component}"]`));
}

export function queryByDataAction(action: string, parent: Element | Document = document): HTMLElement[] {
    return Array.from(parent.querySelectorAll(`[data-${DataAttributeCategories.ACTION}="${action}"]`));
}

export function queryByDataState(state: string, value?: string, parent: Element | Document = document): HTMLElement[] {
    const selector = value 
        ? `[data-${state}-value="${value}"]`
        : `[data-${DataAttributeCategories.STATE}="${state}"]`;
    return Array.from(parent.querySelectorAll(selector));
}

// Compound query functions
export function queryByMultipleData(
    criteria: Record<string, string>, 
    parent: Element | Document = document
): HTMLElement[] {
    const selectors = Object.entries(criteria).map(([attr, value]) => `[data-${attr}="${value}"]`);
    return Array.from(parent.querySelectorAll(selectors.join('')));
}

// Data attribute validation
export function validateDataAttributes(element: HTMLElement): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const attributes = element.attributes;
  
    for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith('data-')) {
            const attrName = attr.name.substring(5); // Remove 'data-' prefix
      
            // Check for valid naming convention
            if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(attrName)) {
                errors.push(`Invalid data attribute name: ${attr.name}. Use kebab-case.`);
            }
      
            // Check for empty values
            if (attr.value.trim() === '') {
                errors.push(`Empty value for data attribute: ${attr.name}`);
            }
        }
    }
  
    return {
        valid: errors.length === 0,
        errors
    };
}

// Migration helper to convert class-based selectors to data attributes
export function migrateClassesToDataAttributes(
    mappings: Array<{ className: string; dataAttr: string; value?: string }>,
    container: Element | Document = document
): number {
    let migrated = 0;
  
    mappings.forEach(({ className, dataAttr, value }) => {
        const elements = container.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            element.setAttribute(`data-${dataAttr}`, value || className);
            element.classList.remove(className);
            migrated++;
        });
    });
  
    return migrated;
}

// Performance optimization: Create indexes for fast lookups
export class DataAttributeIndex {
    private indexes = new Map<string, Map<string, Set<HTMLElement>>>();
    private observer?: MutationObserver;

    constructor(autoIndex = true) {
        if (autoIndex) {
            this.buildIndex();
            this.startObserving();
        }
    }

    public buildIndex(): void {
        this.indexes.clear();
    
        // Index all elements with common data attributes
        // Use specific selectors for better performance
        const commonDataSelectors = [
            '[data-annie-component]',
            '[data-annie-role]', 
            '[data-annie-state]',
            '[data-annie-config]',
            '[data-trigger]',
            '[data-observe]',
            '[data-field]',
            '[data-datasource]'
        ];
        
        commonDataSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    this.indexElement(element as HTMLElement);
                });
            } catch {
                // Skip invalid selectors
            }
        });
        
        // Also check for any other data attributes on body and common containers
        const containers = document.querySelectorAll('body, main, section, div, form, table');
        containers.forEach(container => {
            if (Array.from(container.attributes).some(attr => attr.name.startsWith('data-'))) {
                this.indexElement(container as HTMLElement);
            }
        });
    }

    public lookup(attribute: string, value?: string): HTMLElement[] {
        const attrIndex = this.indexes.get(attribute);
        if (!attrIndex) return [];
    
        if (value) {
            const elements = attrIndex.get(value);
            return elements ? Array.from(elements) : [];
        }
    
        // Return all elements with this attribute regardless of value
        const allElements = new Set<HTMLElement>();
        attrIndex.forEach(elements => {
            elements.forEach(el => allElements.add(el));
        });
    
        return Array.from(allElements);
    }

    private indexElement(element: HTMLElement): void {
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                const attrName = attr.name.substring(5);
        
                if (!this.indexes.has(attrName)) {
                    this.indexes.set(attrName, new Map());
                }
        
                const attrIndex = this.indexes.get(attrName)!;
                if (!attrIndex.has(attr.value)) {
                    attrIndex.set(attr.value, new Set());
                }
        
        attrIndex.get(attr.value)!.add(element);
            }
        });
    }

    private startObserving(): void {
        this.observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('data-')) {
                    const element = mutation.target as HTMLElement;
                    this.reindexElement(element);
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.indexElement(node as HTMLElement);
                        }
                    });
                }
            });
        });

        // Get list of known data attributes to observe
        const knownDataAttributes = [
            'data-annie-component',
            'data-annie-role', 
            'data-annie-state',
            'data-annie-config',
            'data-trigger',
            'data-observe',
            'data-field',
            'data-datasource'
        ];

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: knownDataAttributes
        });
    }

    private reindexElement(element: HTMLElement): void {
    // Remove element from all indexes first
        this.indexes.forEach(attrIndex => {
            attrIndex.forEach(elements => {
                elements.delete(element);
            });
        });
    
        // Re-index the element
        this.indexElement(element);
    }

    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.indexes.clear();
    }
}

// Export global data attribute manager instance
export const dataAttributeManager = new DataAttributeManager();
export const dataAttributeIndex = new DataAttributeIndex();
