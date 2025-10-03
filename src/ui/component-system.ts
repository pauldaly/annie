/**
 * Simplified Component System - Works with existing data-observe
 * Instead of creating redundant attributes, this enhances your data-observe system
 */

import { createEnhancedDataObserver } from './enhanced-data-observer.js';
import { AttributeParser, ComponentLogic } from '../utils/json-logic.js';

export class ComponentSystem {
  private annie: any;
  private enhancedObserver: any;
  private legacyObserver: any;

  constructor(annie: any, legacyObserver: any) {
    this.annie = annie;
    this.legacyObserver = legacyObserver;
    this.enhancedObserver = createEnhancedDataObserver(annie, legacyObserver);
  }

  /**
   * Initialize the component system
   * This now just initializes the enhanced data-observe system
   */
  async initialize(): Promise<void> {
    // Initialize enhanced data-observe processing
    this.enhancedObserver.initialize();
    
    // Process any data-annie-component elements (for backwards compatibility)
    await this.processLegacyComponents();
  }

  /**
   * Process legacy data-annie-component elements by converting them to data-observe
   */
  private async processLegacyComponents(): Promise<void> {
    const componentElements = document.querySelectorAll('[data-annie-component]');
    
    for (const element of Array.from(componentElements)) {
      await this.convertToDataObserve(element as HTMLElement);
    }
  }

  /**
   * Convert data-annie-component to data-observe format
   */
  private async convertToDataObserve(element: HTMLElement): Promise<void> {
    const componentId = element.getAttribute('data-annie-component');
    if (!componentId) return;

    try {
      // Extract data from element attributes
      const componentData = this.extractComponentData(element);
      
      // Create data-observe configuration
      const observeConfig = this.createObserveConfig(componentId, componentData, element);
      
      // Replace data-annie-component with data-observe
      element.removeAttribute('data-annie-component');
      element.setAttribute('data-observe', JSON.stringify(observeConfig));
      
      // Let the enhanced observer handle it
      this.enhancedObserver.enhanceElement(element);
      
    } catch (error) {
      console.error(`Failed to convert component ${componentId}:`, error);
    }
  }

  /**
   * Extract data from element attributes (legacy compatibility)
   */
  private extractComponentData(element: HTMLElement): Record<string, any> {
    const data: Record<string, any> = {};

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-') && 
          !attr.name.startsWith('data-annie-') &&
          attr.name !== 'data-observe') {
        
        const key = attr.name.slice(5); // Remove 'data-' prefix
        let value = attr.value;

        // Try to parse JSON values
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if not valid JSON
          }
        }
        
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Create data-observe configuration from component data
   */
  private createObserveConfig(componentId: string, componentData: any, element: HTMLElement): any {
    // Basic data-observe configuration
    const config: any = {
      type: 'component',
      component: componentId,
      data: componentData
    };

    // Handle datasource if specified
    if (componentData.datasource) {
      config.datasource = componentData.datasource;
    }

    // Handle JsonLogic extensions from element attributes
    const jsonlogic: any = {};

    // Convert data-annie-if to jsonlogic.if
    const ifCondition = element.getAttribute('data-annie-if');
    if (ifCondition) {
      jsonlogic.if = this.parseCondition(ifCondition);
      element.removeAttribute('data-annie-if');
    }

    // Convert data-annie-class to jsonlogic.class
    const classCondition = element.getAttribute('data-annie-class');
    if (classCondition) {
      jsonlogic.class = this.parseClass(classCondition);
      element.removeAttribute('data-annie-class');
    }

    // Convert data-annie-for to jsonlogic.loop
    const forLoop = element.getAttribute('data-annie-for');
    if (forLoop) {
      jsonlogic.loop = forLoop;
      element.removeAttribute('data-annie-for');
    }

    if (Object.keys(jsonlogic).length > 0) {
      config.jsonlogic = jsonlogic;
    }

    return config;
  }

  /**
   * Parse condition string
   */
  private parseCondition(value: string): any {
    // Try JSON first
    try {
      return JSON.parse(value);
    } catch {}
    
    // Handle simple expressions
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    
    // Handle variable references
    if (value.startsWith('{{') && value.endsWith('}}')) {
      return { var: value.slice(2, -2).trim() };
    }
    
    // Handle simple comparisons like "user.isActive"
    return { var: value };
  }

  /**
   * Parse class specification
   */
  private parseClass(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not JSON
    }
  }

  /**
   * Public API: Create component programmatically
   * Now creates data-observe elements instead
   */
  async create(componentId: string, data: Record<string, any>, container: string | HTMLElement): Promise<HTMLElement | null> {
    const containerElement = typeof container === 'string' 
      ? document.querySelector(container) as HTMLElement
      : container;
      
    if (!containerElement) {
      console.error('Container not found');
      return null;
    }

    // Create element with data-observe instead of data-annie-component
    const element = document.createElement('div');
    
    const observeConfig = {
      type: 'component',
      component: componentId,
      data: data,
      datasource: data.datasource || componentId.replace('-', '_')
    };

    element.setAttribute('data-observe', JSON.stringify(observeConfig));
    containerElement.appendChild(element);
    
    // Let enhanced observer handle it
    this.enhancedObserver.enhanceElement(element);
    
    return element;
  }

  /**
   * Public API: Update component data
   * Now works by updating data-observe and notifying observers
   */
  update(selector: string, newData: Record<string, any>): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.error('Element not found');
      return;
    }

    const observeAttr = element.getAttribute('data-observe');
    if (!observeAttr) {
      console.error('Element does not have data-observe attribute');
      return;
    }

    try {
      const config = JSON.parse(observeAttr);
      
      // Update the data in the config
      config.data = { ...config.data, ...newData };
      
      // Update the attribute
      element.setAttribute('data-observe', JSON.stringify(config));
      
      // Trigger re-processing
      this.enhancedObserver.enhanceElement(element);
      
      // Notify observers if there's a datasource
      if (config.datasource) {
        this.legacyObserver.notifyObservers(config.datasource);
      }
      
    } catch (error) {
      console.error('Failed to update element:', error);
    }
  }
}

/**
 * Example of enhanced data-observe usage
 */
export const DataObserveExamples = {
  
  // Simple data binding with JsonLogic conditions
  userCard: {
    "datasource": "currentUser",
    "type": "template", 
    "template": "<h3>{{name}}</h3><p>{{email}}</p>",
    "jsonlogic": {
      "if": {"var": "isActive"},
      "class": {
        "active": {"var": "isActive"},
        "premium": {"==": [{"var": "plan"}, "premium"]}
      }
    }
  },

  // Loop with conditions
  userList: {
    "datasource": "users",
    "type": "template",
    "template": "<div class='user'>{{name}}</div>",
    "jsonlogic": {
      "loop": "user in users",
      "if": {"var": "user.isActive"}
    }
  },

  // Complex conditional with transform
  statusMessage: {
    "datasource": "userStatus", 
    "type": "html",
    "jsonlogic": {
      "transform": {
        "if": [
          {"var": "isOnline"},
          {"cat": ["User ", {"var": "name"}, " is online"]},
          {"cat": ["User ", {"var": "name"}, " is offline"]}
        ]
      },
      "class": {
        "online": {"var": "isOnline"},
        "offline": {"!": {"var": "isOnline"}}
      }
    }
  }
};