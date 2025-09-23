import { ILogger } from './logger.js';

export interface StateChange<T = any> {
  key: string;
  oldValue: T;
  newValue: T;
  timestamp: number;
  source?: string;
}

export interface StateSubscription {
  id: string;
  callback: (change: StateChange) => void;
  keys?: string[];
  filter?: (change: StateChange) => boolean;
}

export interface StateManagerConfig {
  enableDevTools?: boolean;
  enableTimeTravel?: boolean;
  maxHistorySize?: number;
  enableLocalStorage?: boolean;
  storagePrefix?: string;
}

interface EventSubscription {
  event: string;
  callback: (data: any) => void;
}

export class StateManager {
    private state: Map<string, any> = new Map();
    private subscriptions: Map<string, StateSubscription> = new Map();
    private eventSubscriptions: Map<string, EventSubscription[]> = new Map();
    private history: StateChange[] = [];
    private config: StateManagerConfig;
    private logger: ILogger;
    private currentHistoryIndex: number = -1;

    constructor(logger: ILogger, config: StateManagerConfig = {}) {
        this.logger = logger;
        this.config = {
            enableDevTools: false,
            enableTimeTravel: false,
            maxHistorySize: 100,
            enableLocalStorage: false,
            storagePrefix: 'annie-state',
            ...config
        };
        this.initializeDevTools();
        this.loadFromStorage();
    }

    /**
   * Set a state value
   */
    setState<T>(key: string, value: T, source?: string): void {
        const oldValue = this.state.get(key);
    
        // Don't update if value hasn't changed
        if (this.deepEqual(oldValue, value)) {
            return;
        }

        this.state.set(key, value);
    
        const change: StateChange<T> = {
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now(),
            source
        };

        this.addToHistory(change);
        this.notifySubscribers(change);
        this.saveToStorage(key, value);
    
        this.logger.debug(`State updated: ${key} = ${JSON.stringify(value)}`);
    }

    /**
   * Get a state value
   */
    getState<T>(key: string): T | undefined {
        return this.state.get(key);
    }

    /**
   * Get all state as an object
   */
    getAllState(): Record<string, any> {
        const result: Record<string, any> = {};
        this.state.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
   * Update multiple state values at once
   */
    batchUpdate(updates: Record<string, any>, source?: string): void {
        const changes: StateChange[] = [];
    
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.state.get(key);
      
            if (!this.deepEqual(oldValue, value)) {
                this.state.set(key, value);
        
                const change: StateChange = {
                    key,
                    oldValue,
                    newValue: value,
                    timestamp: Date.now(),
                    source
                };
        
                changes.push(change);
                this.addToHistory(change);
                this.saveToStorage(key, value);
            }
        });

        // Notify all subscribers of all changes
        changes.forEach(change => this.notifySubscribers(change));
    
        this.logger.debug(`Batch state update: ${changes.length} changes`);
    }

    /**
   * Subscribe to state changes
   */
    subscribe(callback: (change: StateChange) => void, options: {
    id?: string;
    keys?: string[];
    filter?: (change: StateChange) => boolean;
  } = {}): string {
        const id = options.id || this.generateId();
    
        const subscription: StateSubscription = {
            id,
            callback,
            keys: options.keys,
            filter: options.filter
        };
    
        this.subscriptions.set(id, subscription);
    
        this.logger.debug(`State subscription added: ${id} for keys: ${options.keys?.join(', ') || 'all'}`);
    
        return id;
    }

    /**
   * Unsubscribe from state changes
   */
    unsubscribe(subscriptionId: string): boolean {
        const removed = this.subscriptions.delete(subscriptionId);
        if (removed) {
            this.logger.debug(`State subscription removed: ${subscriptionId}`);
        }
        return removed;
    }

    /**
   * Subscribe to specific key changes
   */
    subscribeToKey<T>(key: string, callback: (value: T, oldValue: T) => void): string {
        return this.subscribe((change) => {
            callback(change.newValue, change.oldValue);
        }, { keys: [key] });
    }

    /**
   * Remove a state key
   */
    removeState(key: string, source?: string): boolean {
        if (!this.state.has(key)) {
            return false;
        }

        const oldValue = this.state.get(key);
        this.state.delete(key);
    
        const change: StateChange = {
            key,
            oldValue,
            newValue: undefined,
            timestamp: Date.now(),
            source
        };

        this.addToHistory(change);
        this.notifySubscribers(change);
        this.removeFromStorage(key);
    
        this.logger.debug(`State key removed: ${key}`);
        return true;
    }

    /**
   * Clear all state
   */
    clearState(source?: string): void {
        const keys = Array.from(this.state.keys());
    
        keys.forEach(key => {
            this.removeState(key, source);
        });
    
        this.clearStorage();
        this.logger.debug('All state cleared');
    }

    /**
   * Get state change history
   */
    getHistory(): StateChange[] {
        return [...this.history];
    }

    /**
   * Time travel - go back to a previous state
   */
    timeTravel(steps: number): boolean {
        if (!this.config.enableTimeTravel) {
            this.logger.warn('Time travel is not enabled');
            return false;
        }

        const targetIndex = this.currentHistoryIndex - steps;
    
        if (targetIndex < 0 || targetIndex >= this.history.length) {
            this.logger.warn('Invalid time travel target');
            return false;
        }

        this.currentHistoryIndex = targetIndex;
    
        // Reconstruct state up to the target point
        this.state.clear();
    
        for (let i = 0; i <= targetIndex; i++) {
            const change = this.history[i];
            if (change.newValue !== undefined) {
                this.state.set(change.key, change.newValue);
            }
        }

        this.logger.debug(`Time traveled ${steps} steps back to index ${targetIndex}`);
        return true;
    }

    /**
   * Reset to current state (undo time travel)
   */
    resetToPresent(): void {
        if (!this.config.enableTimeTravel) {
            return;
        }

        this.currentHistoryIndex = this.history.length - 1;
    
        // Reconstruct full current state
        this.state.clear();
    
        this.history.forEach(change => {
            if (change.newValue !== undefined) {
                this.state.set(change.key, change.newValue);
            } else {
                this.state.delete(change.key);
            }
        });

        this.logger.debug('Reset to present state');
    }

    /**
   * Create a state snapshot
   */
    createSnapshot(name?: string): {
    name?: string;
    timestamp: number;
    state: Record<string, any>;
  } {
        return {
            name,
            timestamp: Date.now(),
            state: this.getAllState()
        };
    }

    /**
   * Restore from a snapshot
   */
    restoreSnapshot(snapshot: { state: Record<string, any> }, source?: string): void {
        this.clearState(source);
        this.batchUpdate(snapshot.state, source);
        this.logger.debug('State restored from snapshot');
    }

    /**
   * Subscribe to global state events
   */
    on(event: string, callback: (data: any) => void): string {
        const subscriptions = this.eventSubscriptions.get(event) || [];
        const subscription: EventSubscription = { event, callback };
        subscriptions.push(subscription);
        this.eventSubscriptions.set(event, subscriptions);
        return `event-${event}-${Date.now()}`;
    }

    /**
   * Emit a global state event
   */
    private emitEvent(event: string, data: any): void {
        const subscriptions = this.eventSubscriptions.get(event) || [];
        subscriptions.forEach(subscription => {
            try {
                subscription.callback(data);
            } catch (error) {
                this.logger.error(`Error in event subscription for ${event}: ${error}`);
            }
        });
    }

    /**
   * Get state middleware for debugging
   */
    getDebugInfo(): {
    stateCount: number;
    subscriptionCount: number;
    historySize: number;
    currentIndex: number;
    } {
        return {
            stateCount: this.state.size,
            subscriptionCount: this.subscriptions.size,
            historySize: this.history.length,
            currentIndex: this.currentHistoryIndex
        };
    }

    private notifySubscribers(change: StateChange): void {
        this.subscriptions.forEach(subscription => {
            // Check if subscription is interested in this key
            if (subscription.keys && !subscription.keys.includes(change.key)) {
                return;
            }

            // Apply custom filter if provided
            if (subscription.filter && !subscription.filter(change)) {
                return;
            }

            try {
                subscription.callback(change);
            } catch (error) {
                this.logger.error(`Error in state subscription ${subscription.id}: ${error}`);
            }
        });

        // Emit global change event
        this.emitEvent('stateChanged', change);
    }

    private addToHistory(change: StateChange): void {
    // If we're in the middle of history (time traveled), truncate future history
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        }

        this.history.push(change);
        this.currentHistoryIndex = this.history.length - 1;

        // Maintain history size limit
        if (this.history.length > this.config.maxHistorySize!) {
            this.history.shift();
            this.currentHistoryIndex--;
        }
    }

    private deepEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
    
        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b)) return false;
      
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
      
            if (keysA.length !== keysB.length) return false;
      
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.deepEqual(a[key], b[key])) return false;
            }
      
            return true;
        }
    
        return false;
    }

    private generateId(): string {
        return `state-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeDevTools(): void {
        if (this.config.enableDevTools && typeof window !== 'undefined') {
            // Add to window for debugging
            (window as any).__ANNIE_STATE_MANAGER__ = this;
      
            this.logger.debug('State manager dev tools enabled');
        }
    }

    private saveToStorage(key: string, value: any): void {
        if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
            return;
        }

        try {
            const storageKey = `${this.config.storagePrefix}-${key}`;
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (error) {
            this.logger.warn(`Failed to save state to localStorage: ${key} - ${error}`);
        }
    }

    private removeFromStorage(key: string): void {
        if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
            return;
        }

        try {
            const storageKey = `${this.config.storagePrefix}-${key}`;
            localStorage.removeItem(storageKey);
        } catch (error) {
            this.logger.warn(`Failed to remove state from localStorage: ${key} - ${error}`);
        }
    }

    private loadFromStorage(): void {
        if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
            return;
        }

        try {
            const prefix = `${this.config.storagePrefix}-`;
            const keysToLoad: string[] = [];
      
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToLoad.push(key);
                }
            }

            keysToLoad.forEach(storageKey => {
                const key = storageKey.replace(prefix, '');
                const value = localStorage.getItem(storageKey);
        
                if (value) {
                    try {
                        this.state.set(key, JSON.parse(value));
                    } catch (error) {
                        this.logger.warn(`Failed to parse stored state: ${key} - ${error}`);
                    }
                }
            });

            if (keysToLoad.length > 0) {
                this.logger.debug(`Loaded ${keysToLoad.length} state values from localStorage`);
            }
        } catch (error) {
            this.logger.warn(`Failed to load state from localStorage: ${error}`);
        }
    }

    private clearStorage(): void {
        if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
            return;
        }

        try {
            const prefix = `${this.config.storagePrefix}-`;
            const keysToRemove: string[] = [];
      
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            this.logger.warn(`Failed to clear state from localStorage: ${error}`);
        }
    }
}
