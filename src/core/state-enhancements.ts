/**
 * Annie State Enhancements - AI-First Approach
 * Enhances existing StateManager with data-attributes for reactive UI updates
 */

export interface StateSubscription {
  element: HTMLElement;
  key: string;
  transform?: (value: any) => string;
  attribute?: string;
}

export class AnnieStateEnhancements {
  private subscriptions = new Map<string, StateSubscription[]>();
  private stateManager: any; // Reference to Annie's existing StateManager

  constructor(stateManager: any) {
    this.stateManager = stateManager;
    this.setupStateWatching();
  }

  /**
   * Process all elements with data-annie-state attributes
   * AI-friendly: <div data-annie-state="user.name">Loading...</div>
   */
  processStateElements(): void {
    // State binding: data-annie-state="key"
    document.querySelectorAll('[data-annie-state]').forEach(element => {
      const key = element.getAttribute('data-annie-state');
      if (key) {
        this.bindElement(element as HTMLElement, key);
      }
    });

    // State attributes: data-annie-state-attr="class:user.status,title:user.name"
    document.querySelectorAll('[data-annie-state-attr]').forEach(element => {
      const attrMap = element.getAttribute('data-annie-state-attr');
      if (attrMap) {
        attrMap.split(',').forEach(mapping => {
          const [attr, key] = mapping.split(':');
          if (attr && key) {
            this.bindElementAttribute(element as HTMLElement, key.trim(), attr.trim());
          }
        });
      }
    });

    // Conditional visibility: data-annie-state-show="user.isActive"
    document.querySelectorAll('[data-annie-state-show]').forEach(element => {
      const key = element.getAttribute('data-annie-state-show');
      if (key) {
        this.bindElementVisibility(element as HTMLElement, key);
      }
    });
  }

  /**
   * Bind element content to state key
   */
  private bindElement(element: HTMLElement, key: string): void {
    const transform = this.getTransformFunction(element);
    
    const subscription: StateSubscription = {
      element,
      key,
      transform
    };

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(subscription);

    // Initial update
    this.updateElement(subscription);
  }

  /**
   * Bind element attribute to state key
   */
  private bindElementAttribute(element: HTMLElement, key: string, attribute: string): void {
    const subscription: StateSubscription = {
      element,
      key,
      attribute
    };

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(subscription);

    // Initial update
    this.updateElement(subscription);
  }

  /**
   * Bind element visibility to state key
   */
  private bindElementVisibility(element: HTMLElement, key: string): void {
    const subscription: StateSubscription = {
      element,
      key,
      transform: (value) => value ? 'block' : 'none'
    };

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(subscription);

    // Initial update with display style
    const value = this.getStateValue(key);
    element.style.display = value ? '' : 'none';
  }

  /**
   * Get transform function from element attributes
   */
  private getTransformFunction(element: HTMLElement): ((value: any) => string) | undefined {
    const format = element.getAttribute('data-annie-format');
    const formatOptions = element.getAttribute('data-annie-format-options');

    if (format) {
      return (value) => {
        switch (format) {
          case 'currency':
            const currency = formatOptions || 'USD';
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
          case 'date':
            return new Intl.DateTimeFormat('en-US').format(new Date(value));
          case 'number':
            return new Intl.NumberFormat('en-US').format(value);
          case 'json':
            return JSON.stringify(value, null, 2);
          default:
            return String(value);
        }
      };
    }

    return undefined;
  }

  /**
   * Update element when state changes
   */
  private updateElement(subscription: StateSubscription): void {
    const value = this.getStateValue(subscription.key);
    
    if (subscription.attribute) {
      // Update attribute
      const stringValue = subscription.transform ? subscription.transform(value) : String(value);
      subscription.element.setAttribute(subscription.attribute, stringValue);
    } else if (subscription.transform && subscription.key.endsWith('.visibility')) {
      // Special case for visibility
      subscription.element.style.display = subscription.transform(value);
    } else {
      // Update content
      const stringValue = subscription.transform ? subscription.transform(value) : String(value);
      subscription.element.textContent = stringValue;
    }
  }

  /**
   * Get state value using dot notation
   */
  private getStateValue(key: string): any {
    const keys = key.split('.');
    let value = this.stateManager.state || {};
    
    for (const k of keys) {
      value = value[k];
      if (value === undefined) break;
    }
    
    return value;
  }

  /**
   * Setup state change watching
   */
  private setupStateWatching(): void {
    // Hook into existing StateManager's change events
    if (this.stateManager.on) {
      this.stateManager.on('change', (key: string) => {
        this.handleStateChange(key);
      });
    } else {
      // Fallback: poll for changes (not ideal but works)
      this.setupPolling();
    }
  }

  /**
   * Handle state change notifications
   */
  private handleStateChange(changedKey: string): void {
    // Update all subscriptions for this key and nested keys
    for (const [key, subscriptions] of this.subscriptions.entries()) {
      if (key === changedKey || key.startsWith(changedKey + '.') || changedKey.startsWith(key + '.')) {
        subscriptions.forEach(subscription => {
          this.updateElement(subscription);
        });
      }
    }
  }

  /**
   * Fallback polling for state changes
   */
  private setupPolling(): void {
    let lastState = JSON.stringify(this.stateManager.state);
    
    setInterval(() => {
      const currentState = JSON.stringify(this.stateManager.state);
      if (currentState !== lastState) {
        // State changed, update all subscriptions
        for (const subscriptions of this.subscriptions.values()) {
          subscriptions.forEach(subscription => {
            this.updateElement(subscription);
          });
        }
        lastState = currentState;
      }
    }, 100); // Check every 100ms
  }

  /**
   * Manually trigger updates for a key
   */
  triggerUpdate(key: string): void {
    this.handleStateChange(key);
  }

  /**
   * Remove all subscriptions for an element (cleanup)
   */
  unbindElement(element: HTMLElement): void {
    for (const subscriptions of this.subscriptions.values()) {
      const index = subscriptions.findIndex(sub => sub.element === element);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
    }
  }
}

/**
 * Initialize state enhancements with existing StateManager
 */
export function initializeStateEnhancements(stateManager: any): AnnieStateEnhancements {
  const enhancements = new AnnieStateEnhancements(stateManager);
  
  // Process existing elements
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhancements.processStateElements();
    });
  } else {
    enhancements.processStateElements();
  }

  // Watch for dynamically added elements
  const observer = new MutationObserver(() => {
    enhancements.processStateElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-annie-state', 'data-annie-state-attr', 'data-annie-state-show']
  });

  return enhancements;
}