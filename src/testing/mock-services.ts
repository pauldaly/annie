/**
 * Mock Services for Testing
 * Provides mock implementations of Annie's core services
 */

import { StateChange } from '../core/state-manager.js';
import { LogLevel } from '../core/types.js';

export class MockLogger {
  public logs: Array<{ level: string; message: string; timestamp: number }> = [];
  public logLevel: LogLevel = LogLevel.Debug;
  public logEnum: any = {};
  public consoleConfig: any = {};

  setLogLevel(level: string): void {
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.Debug;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  log(message: any, level: LogLevel = LogLevel.Info): void {
    this.logs.push({ level: LogLevel[level], message: String(message), timestamp: Date.now() });
  }

  getLevel(): string {
    return LogLevel[this.logLevel];
  }

  getConfig(): any {
    return this.consoleConfig;
  }

  fatal(message: any): void {
    this.logs.push({ level: 'Fatal', message: String(message), timestamp: Date.now() });
  }

  dispose(): void {
    this.logs = [];
  }

  debug(message: string): void {
    this.logs.push({ level: 'Debug', message, timestamp: Date.now() });
  }

  info(message: string): void {
    this.logs.push({ level: 'Info', message, timestamp: Date.now() });
  }

  warn(message: string): void {
    this.logs.push({ level: 'Warn', message, timestamp: Date.now() });
  }

  error(message: string): void {
    this.logs.push({ level: 'Error', message, timestamp: Date.now() });
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogsForLevel(level: string): string[] {
    return this.logs.filter(log => log.level === level).map(log => log.message);
  }

  getLastLog(): string | undefined {
    const last = this.logs[this.logs.length - 1];
    return last?.message;
  }
}

export class MockStateManager {
  private state: Map<string, any> = new Map();
  private subscriptions: Map<string, (change: StateChange) => void> = new Map();
  private history: StateChange[] = [];

  setState<T>(key: string, value: T, source?: string): void {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    
    const change: StateChange<T> = {
      key,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
      source
    };
    
    this.history.push(change);
    this.notifySubscribers(change);
  }

  getState<T>(key: string): T | undefined {
    return this.state.get(key);
  }

  getAllState(): Record<string, any> {
    const result: Record<string, any> = {};
    this.state.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  subscribe(callback: (change: StateChange) => void): string {
    const id = `mock-sub-${Date.now()}-${Math.random()}`;
    this.subscriptions.set(id, callback);
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  clearState(): void {
    this.state.clear();
  }

  getHistory(): StateChange[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  private notifySubscribers(change: StateChange): void {
    this.subscriptions.forEach(callback => {
      try {
        callback(change);
      } catch (error) {
        console.warn('Error in mock state subscription:', error);
      }
    });
  }
}

export class MockDataStore {
  private datasets: Map<string, any[]> = new Map();
  private subscribers: Map<string, (datasource: string, data: any[]) => void> = new Map();

  setDataset(name: string, data: any[]): void {
    this.datasets.set(name, [...data]);
    this.notifySubscribers(name, data);
  }

  getDataset(name: string): any[] | undefined {
    return this.datasets.get(name);
  }

  updateField(datasetName: string, index: number, fieldName: string, value: any): void {
    const dataset = this.datasets.get(datasetName);
    if (dataset && dataset[index]) {
      dataset[index][fieldName] = value;
      this.notifySubscribers(datasetName, dataset);
    }
  }

  subscribe(datasource: string, callback: (datasource: string, data: any[]) => void): string {
    const id = `mock-ds-sub-${Date.now()}-${Math.random()}`;
    this.subscribers.set(id, callback);
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscribers.delete(subscriptionId);
  }

  clear(): void {
    this.datasets.clear();
  }

  private notifySubscribers(datasource: string, data: any[]): void {
    this.subscribers.forEach(callback => {
      try {
        callback(datasource, data);
      } catch (error) {
        console.warn('Error in mock data store subscription:', error);
      }
    });
  }
}

export class MockApiClient {
  private responses: Map<string, any> = new Map();
  private requests: Array<{ url: string; method: string; data?: any; timestamp: number }> = [];

  mockResponse(url: string, response: any): void {
    this.responses.set(url, response);
  }

  async get(url: string): Promise<any> {
    this.recordRequest(url, 'GET');
    return this.getResponse(url) || { success: true, data: null };
  }

  async post(url: string, data?: any): Promise<any> {
    this.recordRequest(url, 'POST', data);
    return this.getResponse(url) || { success: true, data: null };
  }

  async put(url: string, data?: any): Promise<any> {
    this.recordRequest(url, 'PUT', data);
    return this.getResponse(url) || { success: true, data: null };
  }

  async delete(url: string): Promise<any> {
    this.recordRequest(url, 'DELETE');
    return this.getResponse(url) || { success: true, data: null };
  }

  getRequests(): Array<{ url: string; method: string; data?: any; timestamp: number }> {
    return [...this.requests];
  }

  clearRequests(): void {
    this.requests = [];
  }

  private recordRequest(url: string, method: string, data?: any): void {
    this.requests.push({ url, method, data, timestamp: Date.now() });
  }

  private getResponse(url: string): any {
    return this.responses.get(url);
  }
}

export class MockRouter {
  private currentRoute: string = '/';
  private routes: Map<string, () => void> = new Map();
  private navigationHistory: string[] = [];

  navigateTo(route: string): void {
    this.navigationHistory.push(this.currentRoute);
    this.currentRoute = route;
    
    const handler = this.routes.get(route);
    if (handler) {
      handler();
    }
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  addRoute(path: string, handler: () => void): void {
    this.routes.set(path, handler);
  }

  getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  back(): void {
    const previousRoute = this.navigationHistory.pop();
    if (previousRoute) {
      this.currentRoute = previousRoute;
    }
  }

  clearHistory(): void {
    this.navigationHistory = [];
  }
}

/**
 * Factory functions to create mock services
 */
export function createMockLogger(): MockLogger {
  return new MockLogger();
}

export function createMockStateManager(): MockStateManager {
  return new MockStateManager();
}

export function createMockDataStore(): MockDataStore {
  return new MockDataStore();
}

export function createMockApiClient(): MockApiClient {
  return new MockApiClient();
}

export function createMockRouter(): MockRouter {
  return new MockRouter();
}

/**
 * Create a full set of mock services
 */
export function createMockServices() {
  return {
    logger: createMockLogger(),
    stateManager: createMockStateManager(),
    dataStore: createMockDataStore(),
    apiClient: createMockApiClient(),
    router: createMockRouter()
  };
}