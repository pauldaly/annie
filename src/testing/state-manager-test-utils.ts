/**
 * State Manager Test Utilities
 * Provides testing helpers for Annie's StateManager
 */

import { StateManager, StateChange, StateManagerConfig } from '../core/state-manager.js';
import { Logger } from '../core/logger.js';

export interface StateTestOptions {
  enableHistory?: boolean;
  maxHistorySize?: number;
}

export class StateManagerTestUtils {
  private stateManager: StateManager;
  private changeHistory: StateChange[] = [];
  private subscriptionId?: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Start recording state changes for testing
   */
  startRecording(): void {
    this.changeHistory = [];
    this.subscriptionId = this.stateManager.subscribe((change) => {
      this.changeHistory.push(change);
    });
  }

  /**
   * Stop recording state changes
   */
  stopRecording(): void {
    if (this.subscriptionId) {
      this.stateManager.unsubscribe(this.subscriptionId);
      this.subscriptionId = undefined;
    }
  }

  /**
   * Get all recorded state changes
   */
  getRecordedChanges(): StateChange[] {
    return [...this.changeHistory];
  }

  /**
   * Get the last recorded state change
   */
  getLastChange(): StateChange | undefined {
    return this.changeHistory[this.changeHistory.length - 1];
  }

  /**
   * Clear recorded changes
   */
  clearRecording(): void {
    this.changeHistory = [];
  }

  /**
   * Assert that a state change occurred
   */
  expectStateChange(key: string, expectedValue: any): boolean {
    const change = this.changeHistory.find(c => c.key === key && this.deepEqual(c.newValue, expectedValue));
    return !!change;
  }

  /**
   * Assert that a specific number of changes occurred
   */
  expectChangeCount(count: number): boolean {
    return this.changeHistory.length === count;
  }

  /**
   * Assert that changes occurred in a specific order
   */
  expectChangeOrder(expectedKeys: string[]): boolean {
    if (this.changeHistory.length < expectedKeys.length) {
      return false;
    }

    const actualKeys = this.changeHistory.slice(0, expectedKeys.length).map(c => c.key);
    return expectedKeys.every((key, index) => actualKeys[index] === key);
  }

  /**
   * Wait for a specific state change to occur
   */
  async waitForStateChange(key: string, expectedValue: any, timeout: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if change already happened
      if (this.expectStateChange(key, expectedValue)) {
        resolve(true);
        return;
      }

      // Subscribe to future changes
      const subscriptionId = this.stateManager.subscribeToKey(key, (newValue) => {
        if (this.deepEqual(newValue, expectedValue)) {
          this.stateManager.unsubscribe(subscriptionId);
          resolve(true);
        }
      });

      // Set timeout
      setTimeout(() => {
        this.stateManager.unsubscribe(subscriptionId);
        resolve(false);
      }, timeout);
    });
  }

  /**
   * Create a snapshot for testing
   */
  createTestSnapshot(name: string = 'test'): any {
    return this.stateManager.createSnapshot(name);
  }

  /**
   * Restore from a test snapshot
   */
  restoreTestSnapshot(snapshot: any): void {
    this.stateManager.restoreSnapshot(snapshot, 'test');
  }

  /**
   * Get current state for testing
   */
  getCurrentState(): Record<string, any> {
    return this.stateManager.getAllState();
  }

  /**
   * Set multiple state values for testing
   */
  setTestState(state: Record<string, any>): void {
    this.stateManager.batchUpdate(state, 'test');
  }

  /**
   * Clear all state for testing
   */
  clearTestState(): void {
    this.stateManager.clearState('test');
  }

  /**
   * Test time travel functionality
   */
  testTimeTravel(steps: number): boolean {
    return this.stateManager.timeTravel(steps);
  }

  /**
   * Reset to present state
   */
  resetToPresent(): void {
    this.stateManager.resetToPresent();
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return this.stateManager.getDebugInfo();
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
}

/**
 * Create a test state manager with specific configuration
 */
export function createTestStateManager(options: StateTestOptions = {}): StateManager {
  const logger = new Logger('Error');
  const config: StateManagerConfig = {
    enableDevTools: false,
    enableTimeTravel: options.enableHistory || false,
    maxHistorySize: options.maxHistorySize || 50,
    enableLocalStorage: false,
    storagePrefix: 'annie-test'
  };
  
  return new StateManager(logger, config);
}

/**
 * Create test utilities for a state manager
 */
export function createStateTestUtils(stateManager: StateManager): StateManagerTestUtils {
  return new StateManagerTestUtils(stateManager);
}