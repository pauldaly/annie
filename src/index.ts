/**
 * Annie Framework - Entry Point
 * // Removed over-engineered module system - use simple annie-module-system instead system removed - replaced with annie-module-systemcement for boltts.ts
 */

import { AnnieFramework } from './annie.js';

// Export all public APIs
export { AnnieFramework, AppConfig } from './annie.js';

// Core modules
export { Logger } from './core/logger.js';
export { DataStore } from './core/data-store.js';
export { Observable } from './core/observable.js';
export { ApiClient, ApiConfig } from './core/api-client.js';
export { 
  EnhancedHttpClient, 
  createEnhancedHttpClient,
  HttpInterceptors,
  MemoryHttpCache
} from './core/enhanced-http-client.js';
export { 
  UnifiedApiClient,
  createUnifiedApiClient,
  ServerResponseBuilder
} from './core/unified-api-client.js';
export type {
  HttpRequestConfig,
  HttpResponse,
  HttpError,
  HttpHeaders,
  HttpParams,
  HttpMethod,
  HttpCache,
  HttpRequestInterceptor,
  HttpResponseInterceptor
} from './core/enhanced-http-client.js';
export type {
  UnifiedRequest,
  UnifiedResponse,
  RequestOptions
} from './core/unified-api-client.js';
// Removed over-engineered module system - use simple annie-module-system instead
export { ApiController } from './core/api-controller.js';
export { Router } from './core/router.js';
export { SignalRManager, SignalRConfig } from './core/signalr-manager.js';
export { NotificationManager, NotificationConfig } from './core/notification-manager.js';
export { StateManager, StateManagerConfig } from './core/state-manager.js';
export { 
    AnnieStateEnhancements,
    initializeStateEnhancements
} from './core/state-enhancements.js';
export type {
    StateSubscription
} from './core/state-enhancements.js';

// UI modules
export { UIObserver } from './ui/observer.js';
export { TriggerHandler } from './ui/trigger-handler.js';
export { FieldProcessor, FieldProcessorConfig, FieldOperation } from './ui/field-processor.js';
export { AICommandProcessor, AICommandConfig } from './ui/ai-command-processor.js';
export { 
    ChangeDetector, 
    EnhancedUIObserver, 
    initializeChangeDetection,
    ChangeDetectionConfig,
    ElementUpdate,
    PerformanceMetrics
} from './ui/change-detection.js';

// Animation System
export { 
    AnnieAnimations, 
    AnimationOptions, 
    AnimationStep, 
    AnimationSequence,
    AnimationConfig,
    AnimationTrigger,
    ANNIE_ANIMATIONS,
    annieAnimations
} from './ui/animations.js';
export { RemoteControlUI, RemoteControlConfig } from './ui/remote-control-ui.js';
export { ComponentSystem } from './ui/component-system.js';
export { EnhancedDataObserver, createEnhancedDataObserver } from './ui/enhanced-data-observer.js';

// Types
export { 
    TriggerConfig, 
    LogLevel, 
    Dataset, 
    DatasetMeta, 
    HistoryItem 
} from './core/types.js';

// Utils
export * from './utils/helpers.js';
export * from './utils/localization.js';
export { jsonLogic, ComponentLogic, AttributeParser } from './utils/json-logic.js';

// Module System
export { 
    AnnieModuleSystem, 
    annieModules, 
    initializeModuleSystem,
    registerModulesFromConfig 
} from './core/module-system.js';
export type { ModuleConfig as AnnieModuleConfig } from './core/module-system.js';

// Get configuration from global variables or provide defaults
const host = window.location.hostname;
const protocol = window.location.protocol;
const port = window.location.port;
const baseUrl = `${protocol}//${host}${port ? ':' + port : ''}/xhr`;

// Initialize the framework with remote control capabilities
const annie = new AnnieFramework({
    logLevel: (window as any).loglevel || 'Fatal',
    apiConfig: {
        baseUrl: baseUrl,
        timeout: 30000
    },
    autoInitialize: true,
    // Add SignalR and AI capabilities if configured
    signalRUrl: (window as any).signalRUrl,
    openAiApiKey: (window as any).openAiApiKey,
    enableVoiceCommands: (window as any).enableVoiceCommands,
    enableSMSCommands: (window as any).enableSMSCommands,
    aiCommandEndpoint: (window as any).aiCommandEndpoint,
    twilioConfig: (window as any).twilioConfig,
    enableRemoteControl: (window as any).enableRemoteControl !== false,
    notificationConfig: {
        enablePollingFallback: false,  // Disable polling by default
        pollingInterval: 30000,
        maxRetries: 3,
        batchNotifications: true,
        batchDelay: 1000
    },
    remoteControlConfig: {
        position: 'top-right',
        collapsed: true,
        showMouseCursor: true,
        enableVoiceControl: true
    }
});

// Export for global access
export { annie };
export default annie;

// Keep global reference for backward compatibility
(window as any).annie = annie;
