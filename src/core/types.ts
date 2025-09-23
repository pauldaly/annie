// Core type definitions and interfaces

export enum LogLevel {
  All = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
  Fatal = 6,
}

export interface Log {
  All: string;
  Debug: string;
  Info: string;
  Warn: string;
  Error: string;
  Fatal: string;
}

// ============================================================================
// Data Structure Interfaces
// ============================================================================

/**
 * Represents a single data record in a dataset
 */
export interface DataRecord {
  [key: string]: string | number | boolean | null | undefined | DataRecord | DataRecord[];
}

/**
 * Enhanced dataset interface with better typing
 */
export interface Dataset<T = DataRecord> {
  data: T[];
  meta: DatasetMeta;
  all(): T[];
}

export interface DatasetMeta {
  object: string;
  count: number;
  lastModified?: number;
  version?: number;
}

export interface HistoryItem<T = unknown> {
  datasource: string;
  datafield: string;
  value: T;
  was: T;
  timestamp: number;
  index?: number;
}

// ============================================================================
// API Interfaces
// ============================================================================

export interface ApiRequest {
  type: 'init' | 'get' | 'post' | 'put' | 'delete';
  query?: string;
  dataset?: string;
  datasets?: string[];
  data?: DataRecord | DataRecord[];
  parameters?: Record<string, unknown>;
}

export interface ApiResponse<T = DataRecord[]> {
  success: boolean;
  data?: T;
  meta?: DatasetMeta;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface QueryDataset {
  query: string;
  dataset: string;
}

export interface QueryDatasets {
  query: string;
  datasets: string[];
}

export interface Remote {
  url: string;
  dataset: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  options?: RequestInit;
}

export interface ViewDataset {
  load: string[] | QueryDatasets[];
  lazyload: string[] | (QueryDataset | QueryDatasets)[];
  remote: Remote[];
}

export type ViewDatasets = {
  view: string;
  datasets: ViewDataset[];
};

// ============================================================================
// UI Event Interfaces
// ============================================================================

export interface TriggerConfig {
  type: 'change' | 'click' | 'api' | 'crud' | 'undo' | 'redo' | 'keyup' | 'list-selector';
  datasource?: string;
  callback?: string;
  callbefore?: CallbackConfig;
  params?: unknown[];
  query?: string[];
  form?: string[];
  method?: string; // HTTP method for API calls (GET, POST, PUT, DELETE)
  action?: string; // URL endpoint for API calls
  element_to_id?: string;
  dataTarget?: string; // Data attribute-based targeting (preferred over element_to_id)
  calendarid?: string;
  dataobjects?: string[];
  validation?: ValidationConfig;
}

export interface CallbackConfig {
  function: string;
  params: unknown[];
}

export interface ValidationConfig {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: string; // Custom validation function name
}

// ============================================================================
// Observer Pattern Interfaces
// ============================================================================

export interface Observer<T = unknown> {
  next: (value: T) => void;
  error: (error: Error) => void;
  complete: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

export interface ObservableConfig {
  type: 'html' | 'attr' | 'class' | 'style' | 'template' | 'function';
  datasource?: string;
  value?: string;
  name?: string;
  target?: string;
  method?: string;
  prepend?: string;
  append?: string;
  bustcache?: boolean;
}

// ============================================================================
// Framework Configuration Interfaces
// ============================================================================

export interface FrameworkConfig {
  logLevel?: keyof typeof LogLevel;
  enableDevMode?: boolean;
  enableTimeTravel?: boolean;
  maxHistorySize?: number;
  autoSaveInterval?: number;
}

export interface ConsoleConfig {
  priority: boolean;
  log: boolean;
  info: boolean;
  warning: boolean;
  debug: boolean;
  error: boolean;
  verbose: boolean;
  separator: boolean;
  console: boolean;
  lastmethod: string;
}

// ============================================================================
// Route and Navigation Interfaces
// ============================================================================

export interface RouteDefinition {
  path: string;
  component?: string;
  template?: string;
  data?: DataRecord;
  guards?: string[];
}

export interface NavigationContext {
  from?: string;
  to: string;
  data?: DataRecord;
  timestamp: number;
}

// ============================================================================
// Form and Input Interfaces
// ============================================================================

export interface FormFieldConfig {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'select' | 'checkbox' | 'radio' | 'textarea';
  label?: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationConfig;
  datasource?: string;
  options?: SelectOption[];
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}

export interface FormData {
  [fieldName: string]: string | number | boolean | string[] | File | File[];
}

// ============================================================================
// Template and Rendering Interfaces
// ============================================================================

export interface TemplateConfig {
  name: string;
  target: 'dom' | 'shadow';
  datasource: string;
  key?: string;
  options?: TemplateOptions;
}

export interface TemplateOptions {
  filter?: boolean;
  page?: number;
  layout?: 'list' | 'grid' | 'table';
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Error and Exception Interfaces
// ============================================================================

export interface AnnieError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  stack?: string;
}

export interface ValidationError extends AnnieError {
  field: string;
  value: unknown;
  rule: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

export type AsyncEventCallback<T = unknown> = (data: T) => Promise<void>;

export type DataSubscriber<T = DataRecord[]> = (datasource: string, data: T) => void;

// ============================================================================
// Global Window Interfaces for Annie Framework
// ============================================================================

export interface AnnieGlobals {
  annie?: unknown; // Will be defined in annie.ts
  db?: unknown;
  _r?: unknown;
  _requestparams?: Record<string, unknown>;
  _datasets?: ViewDataset;
  _datasetsinit?: ViewDataset;
  loglevel?: string;
  signalRUrl?: string;
  openAiApiKey?: string;
  twilioConfig?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  enableRemoteControl?: boolean;
}

// ============================================================================
// SignalR and Real-time Communication Interfaces
// ============================================================================

export interface SignalRConnection {
  invoke(methodName: string, ...args: unknown[]): Promise<unknown>;
  on(methodName: string, handler: (...args: unknown[]) => void): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  onclose(handler: () => void): void;
  onreconnecting(handler: () => void): void;
  onreconnected(handler: () => void): void;
}

export interface SignalRConnectionBuilder {
  withUrl(url: string): SignalRConnectionBuilder;
  build(): SignalRConnection;
}

export interface SignalRHubConnectionBuilder {
  new (): SignalRConnectionBuilder;
}

export interface SignalRHub {
  HubConnectionBuilder: SignalRHubConnectionBuilder;
}

export interface WindowWithSignalR extends Window {
  signalR?: SignalRHub;
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  userId?: string;
  groupId?: string;
  data?: DataRecord;
}

export interface DataUpdateEvent {
  datasource: string;
  operation: 'create' | 'update' | 'delete';
  data: DataRecord | DataRecord[];
  timestamp: number;
  userId?: string;
}

// ============================================================================
// AI and Voice Command Interfaces  
// ============================================================================

export interface AICommandRequest {
  prompt: string;
  context?: DataRecord;
  sessionId: string;
  userId?: string;
}

export interface AICommandResponse {
  success: boolean;
  commands?: Array<{
    type: string;
    target?: string;
    value?: unknown;
    confidence: number;
  }>;
  error?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// ============================================================================
// Type Guards and Utility Functions
// ============================================================================

export function isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDataRecordArray(value: unknown): value is DataRecord[] {
    return Array.isArray(value) && value.every(isDataRecord);
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
    return (
        typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse).success === 'boolean'
    );
}

export function hasTimestamp(value: unknown): value is { timestamp: number } {
    return (
        typeof value === 'object' &&
    value !== null &&
    'timestamp' in value &&
    typeof (value as { timestamp: number }).timestamp === 'number'
    );
}
