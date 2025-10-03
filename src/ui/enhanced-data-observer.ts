/**
 * Enhanced Data-Observe System with JsonLogic Integration
 * Extends the existing data-observe functionality with conditional logic
 */

import { jsonLogic } from '../utils/json-logic.js';

interface DataObserveConfig {
  datasource?: string | string[];
  type?: string;
  value?: string;
  template?: string;
  // Enhanced formatting options
  format?: {
    type?: 'currency' | 'date' | 'number' | 'uppercase' | 'lowercase' | 'capitalize' | 'json' | 'length' | 'default';
    options?: any; // Format-specific options
  };
  state?: {
    function?: string;
    condition?: any; // JsonLogic expression or legacy array format
    classenabled?: string;
    classdisabled?: string;
    transform?: any; // JsonLogic transformation
  };
  // Enhanced JsonLogic extensions
  jsonlogic?: {
    if?: any; // Conditional visibility/content
    class?: any; // Dynamic classes
    transform?: any; // Data transformation
    loop?: string; // For loops: "item in items"
    format?: any; // JsonLogic-based formatting
  };
  // Advanced template features
  templates?: {
    loading?: string; // Template while loading
    error?: string; // Template for errors
    empty?: string; // Template for empty data
    item?: string; // Template for each item in loops
  };
  // Nested data handling
  nested?: {
    key?: string; // Key to access nested object
    fallback?: any; // Fallback value if nested key doesn't exist
  };
}

export class EnhancedDataObserver {
  private annie: any;
  private legacyObserver: any; // Reference to existing dataObserver

  constructor(annie: any, legacyObserver: any) {
    this.annie = annie;
    this.legacyObserver = legacyObserver;
  }

  /**
   * Initialize enhanced data-observe processing
   */
  initialize(): void {
    // Process all existing data-observe elements
    this.processDataObserveElements();
    
    // Set up mutation observer for dynamically added elements
    this.observeDOMChanges();
  }

  /**
   * Process all elements with data-observe attributes
   */
  processDataObserveElements(): void {
    const elements = document.querySelectorAll('[data-observe]');
    
    Array.from(elements).forEach(element => {
      this.enhanceElement(element as HTMLElement);
    });
  }

  /**
   * Enhance a single element with JsonLogic capabilities
   */
  enhanceElement(element: HTMLElement): void {
    try {
      const observeAttr = element.getAttribute('data-observe');
      if (!observeAttr) return;

      const config: DataObserveConfig = JSON.parse(observeAttr);
      
      // Set up legacy observer functionality first
      this.setupLegacyObserver(element, config);
      
      // JsonLogic enhancements are handled in observer callbacks
      
    } catch (error) {
      console.warn('Failed to process data-observe element:', error, element);
    }
  }

  /**
   * Set up the legacy observer functionality (maintaining compatibility)
   */
  private setupLegacyObserver(element: HTMLElement, config: DataObserveConfig): void {
    const { datasource } = config;

    if (datasource) {
      if (Array.isArray(datasource)) {
        datasource.forEach(ds => {
          this.addEnhancedObserver(ds, element, config);
        });
      } else {
        this.addEnhancedObserver(datasource, element, config);
      }
    }
  }

  /**
   * Add enhanced observer that includes JsonLogic processing
   */
  private addEnhancedObserver(datasource: string, element: HTMLElement, config: DataObserveConfig): void {
    this.legacyObserver.addObserver(datasource, (data: any[]) => {
      // Process the element with enhanced capabilities
      this.processElementUpdate(element, config, data, datasource);
    });
  }

  /**
   * Process element update with JsonLogic enhancements
   */
  private processElementUpdate(element: HTMLElement, config: DataObserveConfig, data: any[], datasource: string): void {
    // Create data context for JsonLogic evaluation
    const dataContext = {
      data,
      datasource,
      element: this.getElementData(element),
      // Add current item for loops
      ...(this.getCurrentLoopContext(element))
    };

    // Handle JsonLogic conditional visibility
    if (config.jsonlogic?.if) {
      const shouldShow = jsonLogic.truthy(jsonLogic.apply(config.jsonlogic.if, dataContext));
      element.style.display = shouldShow ? '' : 'none';
    }

    // Handle JsonLogic dynamic classes
    if (config.jsonlogic?.class) {
      this.applyDynamicClasses(element, config.jsonlogic.class, dataContext);
    }

    // Handle legacy state conditions with JsonLogic support
    if (config.state?.condition) {
      this.processStateCondition(element, config.state, dataContext);
    }

    // Handle data transformation and rendering
    this.processDataRendering(element, config, dataContext);

    // Handle loops
    if (config.jsonlogic?.loop) {
      this.processLoop(element, config, dataContext);
    }
  }

  /**
   * Apply dynamic classes based on JsonLogic expressions
   */
  private applyDynamicClasses(element: HTMLElement, classConfig: any, dataContext: any): void {
    if (typeof classConfig === 'object' && !Array.isArray(classConfig)) {
      // Object format: { "className": condition, ... }
      Object.entries(classConfig).forEach(([className, condition]) => {
        const shouldApply = jsonLogic.truthy(jsonLogic.apply(condition, dataContext));
        element.classList.toggle(className, shouldApply);
      });
    } else {
      // Single condition that returns class names
      const classNames = jsonLogic.apply(classConfig, dataContext);
      if (typeof classNames === 'string') {
        element.className = classNames;
      }
    }
  }

  /**
   * Process state conditions (enhanced to support JsonLogic)
   */
  private processStateCondition(element: HTMLElement, state: any, dataContext: any): void {
    let conditionResult = false;

    if (Array.isArray(state.condition)) {
      // Legacy array format - convert to JsonLogic or process as before
      conditionResult = this.evaluateLegacyCondition(state.condition);
    } else if (typeof state.condition === 'object') {
      // JsonLogic format
      conditionResult = jsonLogic.truthy(jsonLogic.apply(state.condition, dataContext));
    }

    // Apply classes based on condition result
    if (state.classenabled && state.classdisabled) {
      element.className = element.className
        .replace(state.classenabled, '')
        .replace(state.classdisabled, '');
      
      element.classList.add(conditionResult ? state.classenabled : state.classdisabled);
    }
  }

  /**
   * Process data rendering with JsonLogic transformations
   */
  private processDataRendering(element: HTMLElement, config: DataObserveConfig, dataContext: any): void {
    let content: any;

    // Handle loading state
    if (dataContext.loading && config.templates?.loading) {
      element.innerHTML = this.processTemplate(config.templates.loading, dataContext);
      return;
    }

    // Handle error state
    if (dataContext.error && config.templates?.error) {
      element.innerHTML = this.processTemplate(config.templates.error, dataContext);
      return;
    }

    // Handle empty data state
    if (!dataContext.data && config.templates?.empty) {
      element.innerHTML = this.processTemplate(config.templates.empty, dataContext);
      return;
    }

    // Handle different content types
    switch (config.type) {
      case 'html':
        content = this.getContentValue(config, dataContext);
        if (content !== undefined) {
          const formatted = this.applyFormatting(content, config);
          element.innerHTML = this.processTemplate(String(formatted), dataContext);
        }
        break;

      case 'text':
        content = this.getContentValue(config, dataContext);
        if (content !== undefined) {
          const formatted = this.applyFormatting(content, config);
          element.textContent = this.processTemplate(String(formatted), dataContext);
        }
        break;

      case 'template':
        if (config.template) {
          content = this.processTemplate(config.template, dataContext);
          element.innerHTML = content;
        }
        break;

      case 'list':
      case 'loop':
        this.processListTemplate(element, config, dataContext);
        break;

      case 'attribute':
        this.processAttributeBinding(element, config, dataContext);
        break;

      default:
        content = this.getContentValue(config, dataContext);
        if (content !== undefined) {
          const formatted = this.applyFormatting(content, config);
          element.innerHTML = this.processTemplate(String(formatted), dataContext);
        }
    }
  }

  /**
   * Get content value from various sources
   */
  private getContentValue(config: DataObserveConfig, dataContext: any): any {
    if (config.jsonlogic?.transform) {
      return jsonLogic.apply(config.jsonlogic.transform, dataContext);
    } else if (config.value) {
      return this.extractValue(dataContext.data, config.value);
    } else if (config.nested?.key) {
      const nested = jsonLogic.apply({ var: config.nested.key }, dataContext);
      return nested !== undefined ? nested : config.nested.fallback;
    }
    return dataContext.data;
  }

  /**
   * Apply formatting to content
   */
  private applyFormatting(content: any, config: DataObserveConfig): any {
    if (config.format?.type) {
      return this.formatValue(content, config.format.type, config.format.options);
    } else if (config.jsonlogic?.format) {
      return jsonLogic.apply(config.jsonlogic.format, { value: content });
    }
    return content;
  }

  /**
   * Process list/loop templates
   */
  private processListTemplate(element: HTMLElement, config: DataObserveConfig, dataContext: any): void {
    const items = Array.isArray(dataContext.data) ? dataContext.data : [];
    
    if (items.length === 0 && config.templates?.empty) {
      element.innerHTML = this.processTemplate(config.templates.empty, dataContext);
      return;
    }

    const itemTemplate = config.templates?.item || config.template || '{{this}}';
    
    const renderedItems = items.map((item: any, index: number) => {
      const itemContext = {
        ...dataContext,
        this: item,
        '@index': index,
        '@first': index === 0,
        '@last': index === items.length - 1,
        '@even': index % 2 === 0,
        '@odd': index % 2 === 1,
        '@length': items.length
      };

      return this.processTemplate(itemTemplate, itemContext);
    }).join('');

    element.innerHTML = renderedItems;
  }

  /**
   * Process attribute binding
   */
  private processAttributeBinding(element: HTMLElement, config: DataObserveConfig, dataContext: any): void {
    if (config.value) {
      const [attrName, attrPath] = config.value.split(':');
      if (attrName && attrPath) {
        const value = jsonLogic.apply({ var: attrPath.trim() }, dataContext);
        if (value !== undefined) {
          element.setAttribute(attrName.trim(), String(value));
        }
      }
    }
  }

  /**
   * Process loops with JsonLogic
   */
  private processLoop(element: HTMLElement, config: DataObserveConfig, dataContext: any): void {
    const loopSpec = config.jsonlogic?.loop;
    if (!loopSpec) return;

    const match = loopSpec.match(/^(\w+)\s+in\s+(.+)$/);
    if (!match) return;

    const [, itemVar, arrayPath] = match;
    const items = jsonLogic.apply({ var: arrayPath }, dataContext);
    
    if (!Array.isArray(items)) return;

    // Store original template
    const template = element.outerHTML;
    const parent = element.parentElement;
    if (!parent) return;

    // Remove original element
    element.remove();

    // Create elements for each item
    items.forEach((item, index) => {
      const loopContext = {
        ...dataContext,
        [itemVar]: item,
        $index: index,
        $first: index === 0,
        $last: index === items.length - 1,
        $even: index % 2 === 0,
        $odd: index % 2 === 1
      };

      // Create new element from template
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');
      const newElement = doc.body.firstElementChild as HTMLElement;

      if (newElement) {
        // Process the new element with loop context
        this.processElementInLoopContext(newElement, config, loopContext);
        parent.appendChild(newElement);
      }
    });
  }

  /**
   * Process an element within a loop context
   */
  private processElementInLoopContext(element: HTMLElement, config: DataObserveConfig, loopContext: any): void {
    // Remove the loop attribute to prevent infinite recursion
    const newConfig = { ...config };
    if (newConfig.jsonlogic) {
      delete newConfig.jsonlogic.loop;
    }

    // Update the element's data-observe attribute
    element.setAttribute('data-observe', JSON.stringify(newConfig));

    // Process template variables
    this.processTemplateVariables(element, loopContext);

    // Enhance the new element
    this.enhanceElement(element);
  }

  /**
   * Process template variables in element content
   */
  private processTemplateVariables(element: HTMLElement, context: any): void {
    // Process text content
    if (element.textContent) {
      element.textContent = this.processTemplate(element.textContent, context);
    }

    // Process attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.value.includes('{{')) {
        attr.value = this.processTemplate(attr.value, context);
      }
    });

    // Process child elements recursively
    Array.from(element.children).forEach(child => {
      this.processTemplateVariables(child as HTMLElement, context);
    });
  }

  /**
   * Enhanced template processing with multiple syntaxes and formatting
   */
  private processTemplate(template: string, context: any): string {
    // 1. Handle {{variable}} syntax with optional formatting
    template = template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      return this.processTemplateExpression(expression.trim(), context, match);
    });

    // 2. Handle JsonLogic expressions {{jsonlogic: {...}}}
    template = template.replace(/\{\{jsonlogic:\s*(\{[^}]*\})\s*\}\}/g, (match, jsonlogicExpr) => {
      try {
        const logic = JSON.parse(jsonlogicExpr);
        const result = jsonLogic.apply(logic, context);
        return this.formatValue(result);
      } catch (error) {
        console.warn('Invalid JsonLogic in template:', jsonlogicExpr, error);
        return match;
      }
    });

    // 3. Handle conditional blocks {{#if condition}}...{{/if}}
    template = this.processConditionalBlocks(template, context);

    // 4. Handle loops {{#each items}}...{{/each}}
    template = this.processLoopBlocks(template, context);

    return template;
  }

  /**
   * Process individual template expressions with formatting
   */
  private processTemplateExpression(expression: string, context: any, fallback: string): string {
    // Check for formatting syntax: variable | format:options
    const formatMatch = expression.match(/^([^|]+)\s*\|\s*([^:]+)(?::(.+))?$/);
    
    if (formatMatch) {
      const [, varPath, formatter, options] = formatMatch;
      const value = jsonLogic.apply({ var: varPath.trim() }, context);
      return this.formatValue(value, formatter.trim(), options?.trim());
    }

    // Simple variable lookup
    const value = jsonLogic.apply({ var: expression }, context);
    return value !== undefined ? this.formatValue(value) : fallback;
  }

  /**
   * Format values with various formatters
   */
  private formatValue(value: any, formatter?: string, options?: string): string {
    if (value === null || value === undefined) return '';

    switch (formatter) {
      case 'currency':
        const currency = options || 'USD';
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency 
        }).format(Number(value) || 0);

      case 'date':
        const dateOptions = options ? JSON.parse(`{${options}}`) : {};
        return new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(value));

      case 'number':
        const numOptions = options ? JSON.parse(`{${options}}`) : {};
        return new Intl.NumberFormat('en-US', numOptions).format(Number(value) || 0);

      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();

      case 'json':
        return JSON.stringify(value, null, options ? parseInt(options) : 0);

      case 'length':
        return String(Array.isArray(value) ? value.length : String(value).length);

      case 'default':
        return value || options || '';

      default:
        return String(value);
    }
  }

  /**
   * Process conditional blocks {{#if condition}}...{{/if}}
   */
  private processConditionalBlocks(template: string, context: any): string {
    return template.replace(/\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      try {
        // Support both JsonLogic and simple variable checks
        let result: boolean;
        
        if (condition.startsWith('{')) {
          // JsonLogic condition
          const logic = JSON.parse(condition);
          result = Boolean(jsonLogic.apply(logic, context));
        } else {
          // Simple variable check
          const value = jsonLogic.apply({ var: condition.trim() }, context);
          result = Boolean(value);
        }

        return result ? this.processTemplate(content, context) : '';
      } catch (error) {
        console.warn('Invalid condition in template:', condition, error);
        return match;
      }
    });
  }

  /**
   * Process loop blocks {{#each items}}...{{/each}}
   */
  private processLoopBlocks(template: string, context: any): string {
    return template.replace(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayPath, itemTemplate) => {
      try {
        const items = jsonLogic.apply({ var: arrayPath.trim() }, context);
        
        if (!Array.isArray(items)) {
          console.warn('Loop target is not an array:', arrayPath, items);
          return '';
        }

        return items.map((item, index) => {
          const loopContext = {
            ...context,
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === items.length - 1,
            '@even': index % 2 === 0,
            '@odd': index % 2 === 1,
            '@length': items.length
          };

          return this.processTemplate(itemTemplate, loopContext);
        }).join('');
      } catch (error) {
        console.warn('Invalid loop in template:', arrayPath, error);
        return match;
      }
    });
  }

  /**
   * Extract value from data using dot notation
   */
  private extractValue(data: any, path: string): any {
    return jsonLogic.apply({ var: path }, { data });
  }

  /**
   * Get element-specific data for context
   */
  private getElementData(element: HTMLElement): any {
    return {
      id: element.id,
      className: element.className,
      tagName: element.tagName.toLowerCase(),
      // Add other element properties as needed
    };
  }

  /**
   * Get current loop context if element is inside a loop
   */
  private getCurrentLoopContext(element: HTMLElement): any {
    // Look for loop context stored in parent elements
    let parent = element.parentElement;
    while (parent) {
      const loopData = parent.getAttribute('data-loop-context');
      if (loopData) {
        try {
          return JSON.parse(loopData);
        } catch {}
      }
      parent = parent.parentElement;
    }
    return {};
  }

  /**
   * Evaluate legacy condition format
   */
  private evaluateLegacyCondition(condition: any[]): boolean {
    // Convert legacy array condition to JsonLogic if needed
    // This would need to be implemented based on your specific legacy format
    // For now, return true as a fallback
    console.warn('Legacy condition format not yet implemented:', condition);
    return true;
  }

  /**
   * Observe DOM changes for new data-observe elements
   */
  private observeDOMChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            // Check if element has data-observe
            if (element.hasAttribute('data-observe')) {
              this.enhanceElement(element);
            }
            
            // Check children for data-observe
            const childElements = element.querySelectorAll('[data-observe]');
            Array.from(childElements).forEach(child => {
              this.enhanceElement(child as HTMLElement);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

/**
 * Factory function to create enhanced data observer
 */
export function createEnhancedDataObserver(annie: any, legacyObserver: any): EnhancedDataObserver {
  return new EnhancedDataObserver(annie, legacyObserver);
}