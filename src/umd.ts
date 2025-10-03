/**
 * Annie Framework - UMD Entry Point (No Auto-Initialization)
 * Exports classes only - user controls initialization
 */

// Export the framework class and types
export { AnnieFramework, AppConfig } from './annie.js';

// Core modules
export { Logger } from './core/logger.js';
export { DataStore } from './core/data-store.js';
export { Observable } from './core/observable.js';
export { ApiClient, ApiConfig } from './core/api-client.js';
export { ApiController } from './core/api-controller.js';
export { Router } from './core/router.js';
export { SignalRManager, SignalRConfig } from './core/signalr-manager.js';
export { NotificationManager, NotificationConfig } from './core/notification-manager.js';
export { StateManager, StateManagerConfig } from './core/state-manager.js';

// UI modules
export { UIObserver } from './ui/observer.js';
export { TriggerHandler } from './ui/trigger-handler.js';
export { FieldProcessor, FieldProcessorConfig, FieldOperation } from './ui/field-processor.js';
export { AICommandProcessor, AICommandConfig } from './ui/ai-command-processor.js';
export { RemoteControlUI, RemoteControlConfig } from './ui/remote-control-ui.js';

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

// NO AUTO-INITIALIZATION - User must create instances manually