import { Logger, ILogger } from './core/logger.js';
import { DataStore } from './core/data-store.js';
import { ApiClient, ApiConfig } from './core/api-client.js';
import { ApiController } from './core/api-controller.js';
import { Router } from './core/router.js';
import { TriggerHandler } from './ui/trigger-handler.js';
import { FieldProcessor } from './ui/field-processor.js';
import { UIObserver } from './ui/observer.js';
import { SignalRManager } from './core/signalr-manager.js';
import { AICommandProcessor } from './ui/ai-command-processor.js';
import { RemoteControlUI, RemoteControlConfig } from './ui/remote-control-ui.js';
import { NotificationManager, NotificationConfig } from './core/notification-manager.js';
import { StateManager, StateManagerConfig } from './core/state-manager.js';
import { ErrorBoundary, ErrorBoundaryConfig } from './core/error-boundary.js';
import { DIContainer, ServiceTokens } from './core/di-container.js';
import { CleanupManager, MemoryLeakDetector, CleanupHelpers } from './utils/cleanup.js';
import { ValidationManager, ValidationResult, validate } from './utils/type-guards.js';
import { DataObjectManager, MetadataLoadOptions, ServerObjectMetadata } from './core/data-object-manager.js';

export interface AppConfig {
  logLevel?: string;
  apiConfig?: ApiConfig;
  autoInitialize?: boolean;
  signalRUrl?: string;
  openAiApiKey?: string;
  enableVoiceCommands?: boolean;
  enableSMSCommands?: boolean;
  aiCommandEndpoint?: string;
  load?: string[];  // Datasets to load during initialization
  twilioConfig?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  remoteControlConfig?: RemoteControlConfig;
  enableRemoteControl?: boolean;
  notificationConfig?: NotificationConfig;
  stateManagerConfig?: StateManagerConfig;
  errorBoundaryConfig?: ErrorBoundaryConfig;
  metadataOptions?: MetadataLoadOptions;
  onDataLoaded?: () => void;
  onDataLoadError?: (error: any) => void;
}

export class AnnieFramework {
    static readonly version = "manual-config-test";
    
    private container: DIContainer;
    private logger: ILogger;
    private dataStore: DataStore;
    private apiClient: ApiClient;
    private apiController: ApiController;
    private router: Router;
    private triggerHandler: TriggerHandler;
    private fieldProcessor: FieldProcessor;
    private dataObjectManager: DataObjectManager;
    private uiObserver: UIObserver;
    private signalRManager?: SignalRManager;
    private aiCommandProcessor?: AICommandProcessor;
    private remoteControlUI?: RemoteControlUI;
    private notificationManager?: NotificationManager;
    private stateManager: StateManager;
    private errorBoundary: ErrorBoundary;
    private cleanupManager: CleanupManager;
    private memoryLeakDetector: MemoryLeakDetector;
    private validationManager: ValidationManager;
    private initialized: boolean = false;
    private dataLoadingComplete: boolean = false;
    private dataLoadingPromise: Promise<void> | null = null;
    private config: AppConfig;

    // Global variables for compatibility
    public db: any;
    public _r: any;

    constructor(config: AppConfig) {
        console.log('Constructor called with config:', JSON.stringify(config, null, 2));
        
        // Provide default apiConfig if not specified
        if (!config.apiConfig) {
            const host = window.location.hostname;
            const protocol = window.location.protocol;
            const port = window.location.port;
            const baseUrl = `${protocol}//${host}${port ? ':' + port : ''}/xhr`;
            
            config.apiConfig = {
                baseUrl: baseUrl,
                timeout: 30000
            };
        }
        
        this.config = config;
        console.log('Final config set:', JSON.stringify(this.config, null, 2));
    
        // Validate configuration
        this.validateConfiguration(config);
    
        // Initialize dependency injection container
        this.container = new DIContainer();
        this.registerServices();
    
        // Get services from container
        this.logger = this.container.resolve<ILogger>(ServiceTokens.Logger);
        this.dataStore = this.container.resolve<DataStore>(ServiceTokens.DataStore);
        this.apiClient = this.container.resolve<ApiClient>(ServiceTokens.ApiClient);
        this.apiController = this.container.resolve<ApiController>(ServiceTokens.ApiController);
        this.router = this.container.resolve<Router>(ServiceTokens.Router);
        this.triggerHandler = this.container.resolve<TriggerHandler>(ServiceTokens.TriggerHandler);
        this.fieldProcessor = this.container.resolve<FieldProcessor>(ServiceTokens.FieldProcessor);
        this.dataObjectManager = this.container.resolve<DataObjectManager>(ServiceTokens.DataObjectManager);
        this.uiObserver = this.container.resolve<UIObserver>(ServiceTokens.UIObserver);
        this.stateManager = this.container.resolve<StateManager>(ServiceTokens.StateManager);
        this.errorBoundary = this.container.resolve<ErrorBoundary>(ServiceTokens.ErrorBoundary);

        // Initialize cleanup manager, memory leak detector, and validation manager
        this.cleanupManager = new CleanupManager(this.logger);
        this.memoryLeakDetector = MemoryLeakDetector.getInstance(this.logger);
        this.validationManager = new ValidationManager(this.logger);

        // Register disposable components for cleanup
        this.cleanupManager.register(this.dataStore);
        this.cleanupManager.register(this.apiClient);
        this.cleanupManager.register(this.router);
        this.cleanupManager.register(this.triggerHandler);
        this.cleanupManager.register(this.fieldProcessor);
        this.cleanupManager.register(this.dataObjectManager);
        this.cleanupManager.register(this.uiObserver);

        // Connect DataStore changes to StateManager
        this.dataStore.subscribe('state-sync', (datasource: string, data: any) => {
            this.stateManager.setState(`datastore.${datasource}`, data, 'datastore');
        });

        // Connect DataStore changes to UIObserver for automatic observer notifications
        this.dataStore.subscribe('*', (datasource: string) => {
            this.uiObserver.notifyObservers(datasource);
        });

        // Initialize SignalR and AI components if configured
        this.initializeRemoteCapabilities();

        // Setup global access (for backward compatibility)
        this.setupGlobalAccess();

        // Initialize global variables
        this.initializeGlobalVariables();

        if (config.autoInitialize !== false) {
            // Auto-initialize when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                this.initialize();
            }
        }
    }

    private registerServices(): void {
    // Register logger first
        this.container.registerSingleton(ServiceTokens.Logger, () => 
            Logger.create(this.config.logLevel)
        );

        // Register core services
        this.container.registerSingleton(ServiceTokens.DataStore, () => 
            new DataStore(this.container.resolve(ServiceTokens.Logger))
        );

        this.container.registerSingleton(ServiceTokens.ApiClient, () => 
            new ApiClient(
                this.config.apiConfig!, 
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.ApiController, () => 
            new ApiController(
                this.container.resolve(ServiceTokens.ApiClient),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.Router, () => 
            new Router(
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.TriggerHandler, () => 
            new TriggerHandler(
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.ApiClient),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.FieldProcessor, () => 
            new FieldProcessor(
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.DataObjectManager, () => 
            new DataObjectManager(
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.UIObserver, () => 
            new UIObserver(
                this.container.resolve(ServiceTokens.DataStore),
                this.container.resolve(ServiceTokens.Logger)
            )
        );

        this.container.registerSingleton(ServiceTokens.StateManager, () => 
            new StateManager(
                this.container.resolve(ServiceTokens.Logger),
                this.config.stateManagerConfig
            )
        );

        this.container.registerSingleton(ServiceTokens.ErrorBoundary, () => 
            new ErrorBoundary(
                this.container.resolve(ServiceTokens.Logger),
                this.config.errorBoundaryConfig || {},
                this.container.has(ServiceTokens.NotificationManager) 
                    ? this.container.resolve(ServiceTokens.NotificationManager) 
                    : undefined
            )
        );
    }

    private validateConfiguration(config: AppConfig): void {
    // Define validation schema for configuration
        const schema: Record<string, any> = {
            logLevel: { allowUndefined: true },
            apiConfig: { allowUndefined: false },
            autoInitialize: { allowUndefined: true },
            signalRUrl: { allowUndefined: true },
            openAiApiKey: { allowUndefined: true }
        };

        // Validate required fields
        const apiConfigValidation = validate(config.apiConfig, 'object');
        if (!apiConfigValidation.isValid) {
            throw new Error(`Invalid API configuration: ${apiConfigValidation.errors.join(', ')}`);
        }

        // Validate API config baseUrl
        const baseUrlValidation = validate(config.apiConfig!.baseUrl, 'string', { minLength: 1 });
        if (!baseUrlValidation.isValid) {
            throw new Error(`Invalid API base URL: ${baseUrlValidation.errors.join(', ')}`);
        }

        // Optional validations with warnings
        if (config.signalRUrl) {
            const signalRValidation = validate(config.signalRUrl, 'string', { minLength: 1 });
            if (!signalRValidation.isValid) {
                this.logger?.warn(`Invalid SignalR URL: ${signalRValidation.errors.join(', ')}`);
            }
        }

        if (config.openAiApiKey) {
            const apiKeyValidation = validate(config.openAiApiKey, 'string', { minLength: 10 });
            if (!apiKeyValidation.isValid) {
                this.logger?.warn(`Invalid OpenAI API key: ${apiKeyValidation.errors.join(', ')}`);
            }
        }

        this.logger?.debug('Configuration validation completed successfully');
    }

    private initializeRemoteCapabilities(): void {
    // Debug: Log the entire config to see what we have
        this.logger.info(`Config debug - enableVoiceCommands: ${this.config.enableVoiceCommands}, openAiApiKey: ${!!this.config.openAiApiKey}`);
        this.logger.info(`Full config: ${JSON.stringify(this.config, null, 2)}`);
        
    // Initialize SignalR if URL is provided
        if (this.config.signalRUrl) {
            const signalRConfig = {
                hubUrl: this.config.signalRUrl,
                enableMouseTracking: true,
                enableRemoteControl: true,
                enableAICommands: true
            };
            this.signalRManager = new SignalRManager(signalRConfig, this.logger);
        }

        // Initialize AI Command Processor if API key is provided OR voice commands are enabled
        // Create processor even if voice starts as OFF - user may want to enable it later
        const enableVoice = this.config.enableVoiceCommands === true; // Only true if explicitly set
        const shouldCreateProcessor = this.config.openAiApiKey || this.config.enableVoiceCommands !== undefined;
        
        if (shouldCreateProcessor) {
            this.logger.info(`Initializing AI Command Processor - Voice: ${enableVoice}, API Key: ${!!this.config.openAiApiKey}`);
            const aiConfig = {
                openAiApiKey: this.config.openAiApiKey,
                enableVoiceCommands: this.config.enableVoiceCommands, // Pass the original setting
                enableSMSCommands: this.config.enableSMSCommands,
                twilioConfig: this.config.twilioConfig
            };
            // SignalR is optional - voice commands can work without it
            this.aiCommandProcessor = new AICommandProcessor(aiConfig, this.signalRManager, this.logger);
            this.logger.info('AI Command Processor created successfully');
        } else {
            this.logger.info(`AI Command Processor NOT created - Voice: ${enableVoice}, API Key: ${!!this.config.openAiApiKey}`);
        }

        // Initialize Remote Control UI if enabled
        if (this.config.enableRemoteControl && this.signalRManager && this.aiCommandProcessor) {
            const defaultConfig: RemoteControlConfig = {
                position: 'top-right',
                collapsed: true,
                showMouseCursor: true,
                enableVoiceControl: true
            };
      
            const remoteConfig = { ...defaultConfig, ...this.config.remoteControlConfig };
            this.remoteControlUI = new RemoteControlUI(
                this.signalRManager,
                this.aiCommandProcessor,
                remoteConfig,
                this.logger
            );
        }

        // Initialize Notification Manager
        this.notificationManager = new NotificationManager(
            this.dataStore,
            this.logger,
            this.signalRManager,
            this.config.notificationConfig
        );
    }

    private setupGlobalAccess(): void {
    // Create proxy objects for backward compatibility
        this.db = new Proxy(this.dataStore, {
            get: (target, prop) => {
                if (prop === 'datasets') {
                    return new Proxy(target, {
                        get: (innerTarget, innerProp) => {
                            return innerTarget.getDataset(innerProp as string);
                        },
                        set: (innerTarget, innerProp, value) => {
                            if (value && value.data) {
                                innerTarget.setDataset(innerProp as string, value.data, value.meta);
                            }
                            return true;
                        }
                    });
                }
                return (target as any)[prop];
            }
        });

        this._r = new Proxy(this.dataStore, {
            get: (target, prop) => {
                if (prop === 'datasets') {
                    return new Proxy(target, {
                        get: (innerTarget, innerProp) => {
                            return innerTarget.getDataset(innerProp as string);
                        },
                        set: (innerTarget, innerProp, value) => {
                            // Reactive proxy - notify observers on changes
                            if (value && value.data) {
                                innerTarget.setDataset(innerProp as string, value.data, value.meta);
                                this.uiObserver.notifyObservers(innerProp as string);
                            }
                            return true;
                        }
                    });
                }
                return (target as any)[prop];
            }
        });
    }

    private initializeGlobalVariables(): void {
    // Initialize request params
        const requestParams = (window as any)._requestparams || {};
        // Support both _datasets and _datasetsinit for backward compatibility
        const datasetsInit = (window as any)._datasets || (window as any)._datasetsinit || {};

        (window as any)._request_params_obj = requestParams;
        (window as any)._datasets_init_obj = datasetsInit;

        // Initialize store with request params
        this.dataStore.setDataset('store', [requestParams], {
            object: "true",
            count: Object.keys(requestParams).length
        });

        // Set global references
        (window as any).db = this.db;
        (window as any)._r = this._r;
        (window as any).annie = this;

        // Global dataset shortcuts
        (window as any).ds = (name: string) => this.ds(name);
        (window as any).$ds = (name: string) => this.ds(name);
        (window as any).dataset = (name: string) => this.dataset(name);

        // Make error boundary globally accessible for decorators
        (window as any).annie.errorBoundary = this.errorBoundary;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            this.logger.warn('Framework already initialized');
            return;
        }

        this.logger.info('Initializing Annie Framework');

        try {
            // Initialize all subsystems
            this.triggerHandler.initializeTriggers();
            this.fieldProcessor.initialize();
            this.uiObserver.initializeObservers();

            // Load metadata for data object manager
            if (this.config.metadataOptions) {
                await this.dataObjectManager.loadMetadata(this.config.metadataOptions);
            }
      
            // Initialize remote control components
            if (this.signalRManager) {
                this.signalRManager.initialize();
            }

            if (this.aiCommandProcessor) {
                this.logger.info('Initializing AI Command Processor...');
                await this.aiCommandProcessor.initialize();
                this.logger.info('AI Command Processor initialization complete');
            } else {
                this.logger.info('No AI Command Processor to initialize');
            }

            if (this.remoteControlUI) {
                this.remoteControlUI.initialize();
            }

            // Initialize Notification Manager
            if (this.notificationManager) {
                await this.notificationManager.initialize();
            }
      
            // Load initial data if specified
            this.dataLoadingPromise = this.loadInitialData();
            await this.dataLoadingPromise;

            this.initialized = true;
            this.logger.info('Annie Framework initialized successfully');

            // Call global initialization callbacks if they exist
            this.callGlobalCallbacks();

        } catch (error) {
            this.logger.error(`Initialization failed: ${error}`);
            throw error;
        }
    }

    private async loadInitialData(): Promise<void> {
        const datasetsInitObj = (window as any)._datasetsinit;
    
        if (datasetsInitObj) {
            const promises: Promise<any>[] = [];

            // Load initial datasets in one call
            if (datasetsInitObj.load && datasetsInitObj.load.length > 0) {
                promises.push(this.apiController.start('load'));
            }

            // Load remote datasets
            if (datasetsInitObj.remote) {
                promises.push(this.apiController.start('remote'));
            }

            // Wait for all initial data to load
            if (promises.length > 0) {
                try {
                    await Promise.all(promises);
                    this.logger.info('Initial data loaded successfully');
                    this.dataLoadingComplete = true;
                    
                    // Call onDataLoaded callback if provided
                    if (this.config.onDataLoaded) {
                        try {
                            this.config.onDataLoaded();
                        } catch (callbackError) {
                            this.logger.error(`onDataLoaded callback failed: ${callbackError}`);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to load initial data: ${error}`);
                    
                    // Call onDataLoadError callback if provided
                    if (this.config.onDataLoadError) {
                        try {
                            this.config.onDataLoadError(error);
                        } catch (callbackError) {
                            this.logger.error(`onDataLoadError callback failed: ${callbackError}`);
                        }
                    }
                }
            } else {
                // No data to load, but still call onDataLoaded
                this.dataLoadingComplete = true;
                if (this.config.onDataLoaded) {
                    try {
                        this.config.onDataLoaded();
                    } catch (callbackError) {
                        this.logger.error(`onDataLoaded callback failed: ${callbackError}`);
                    }
                }
            }

            // Load lazy datasets after initial load
            if (datasetsInitObj.lazyload) {
                setTimeout(() => {
                    for (let dataset of datasetsInitObj.lazyload) {
                        this.apiController.start(dataset);
                    }
                }, 100);
            }
        }
    }

    private callGlobalCallbacks(): void {
    // Call pageinit if it exists
        if (typeof (window as any).pageinit === 'function') {
            try {
                (window as any).pageinit();
            } catch (error) {
                this.logger.error(`pageinit callback failed: ${error}`);
            }
        }

        // Call pageloaded if it exists
        if (typeof (window as any).pageloaded === 'function') {
            try {
                (window as any).pageloaded();
            } catch (error) {
                this.logger.error(`pageloaded callback failed: ${error}`);
            }
        }
    }

    // Public API methods
    public getDataStore(): DataStore {
        return this.dataStore;
    }

    public getApiController(): ApiController {
        return this.apiController;
    }

    public getRouter(): Router {
        return this.router;
    }

    public getLogger(): ILogger {
        return this.logger;
    }

    public getUIObserver(): UIObserver {
        return this.uiObserver;
    }

    public getTriggerHandler(): TriggerHandler {
        return this.triggerHandler;
    }

    public getSignalRManager(): SignalRManager | undefined {
        return this.signalRManager;
    }

    public getAICommandProcessor(): AICommandProcessor | undefined {
        return this.aiCommandProcessor;
    }

    // Convenience methods for voice recognition testing
    public startVoiceRecognition(): void {
        console.log('🎤 startVoiceRecognition() called'); // Always log to console
        console.log('aiCommandProcessor exists:', !!this.aiCommandProcessor);
        
        if (this.aiCommandProcessor) {
            console.log('🎤 Calling startListening()...');
            this.aiCommandProcessor.startListening();
            this.logger.info('🎤 Voice recognition started via Annie convenience method');
            console.log('🎤 startListening() completed');
        } else {
            console.log('❌ No AI Command Processor available');
            this.logger.warn('❌ No AI Command Processor available for voice recognition');
        }
    }

    public stopVoiceRecognition(): void {
        console.log('🔇 stopVoiceRecognition() called'); // Always log to console
        console.log('aiCommandProcessor exists:', !!this.aiCommandProcessor);
        
        if (this.aiCommandProcessor) {
            console.log('🔇 Calling stopListening()...');
            this.aiCommandProcessor.stopListening();
            this.logger.info('🔇 Voice recognition stopped via Annie convenience method');
            console.log('🔇 stopListening() completed');
        } else {
            console.log('❌ No AI Command Processor available');
            this.logger.warn('❌ No AI Command Processor available for voice recognition');
        }
    }

    public toggleVoiceRecognition(): void {
        if (this.aiCommandProcessor) {
            this.aiCommandProcessor.toggleListening();
            this.logger.info('🔄 Voice recognition toggled via Annie convenience method');
        } else {
            this.logger.warn('❌ No AI Command Processor available for voice recognition');
        }
    }

    // Test the intelligent matching system
    public testVoiceMatching(target: string, intent: string = 'click'): any {
        if (this.aiCommandProcessor) {
            return this.aiCommandProcessor.testMatching(target, intent);
        } else {
            this.logger.warn('❌ No AI Command Processor available for testing');
            return [];
        }
    }

    // Get all available page elements for voice commands
    public getPageElements(): any {
        if (this.aiCommandProcessor) {
            return this.aiCommandProcessor.getPageElements();
        } else {
            this.logger.warn('❌ No AI Command Processor available');
            return { menuItems: [], buttons: [], inputs: [] };
        }
    }

    // Clear any pending disambiguation
    public clearVoiceDisambiguation(): void {
        if (this.aiCommandProcessor) {
            this.aiCommandProcessor.clearDisambiguation();
        } else {
            this.logger.warn('❌ No AI Command Processor available');
        }
    }

    // Process a voice command manually (for testing)
    public testVoiceCommand(command: string): Promise<any> {
        if (this.aiCommandProcessor) {
            return this.aiCommandProcessor.processTextCommand(command);
        } else {
            this.logger.warn('❌ No AI Command Processor available');
            return Promise.resolve([]);
        }
    }

    // Add safety check for getting processor
    public getAICommandProcessorSafely(): AICommandProcessor | null {
        if (this.aiCommandProcessor) {
            return this.aiCommandProcessor;
        } else {
            this.logger.warn('❌ AI Command Processor not available');
            return null;
        }
    }

    public getRemoteControlUI(): RemoteControlUI | undefined {
        return this.remoteControlUI;
    }

    public getNotificationManager(): NotificationManager | undefined {
        return this.notificationManager;
    }

    public getStateManager(): StateManager {
        return this.stateManager;
    }

    public getErrorBoundary(): ErrorBoundary {
        return this.errorBoundary;
    }

    // Helper methods for common operations
    public async loadData(query: string | object): Promise<any> {
        return this.apiController.start(query);
    }

    public updateField(datasource: string, field: string, value: any, index: number = 0): void {
        this.dataStore.updateField(datasource, index, field, value);
        this.uiObserver.notifyObservers(datasource);
    }

    public getData(datasource: string): any[] | undefined {
        const dataset = this.dataStore.getDataset(datasource);
        return dataset?.data;
    }

    public navigateTo(view: string): void {
        this.router.navigateTo(view);
    }

    public reinitializeTriggers(): void {
        this.triggerHandler.reinitializeTriggers();
    }

    public getFieldProcessor(): FieldProcessor {
        return this.fieldProcessor;
    }

    public getDataObjectManager(): DataObjectManager {
        return this.dataObjectManager;
    }

    public async loadObjectMetadata(options: MetadataLoadOptions): Promise<void> {
        await this.dataObjectManager.loadMetadata(options);
    }

    public setObjectMetadata(metadata: ServerObjectMetadata[]): void {
        this.dataObjectManager.setMetadata(metadata);
    }

    public getAvailableObjectTypes(): string[] {
        return this.dataObjectManager.getAvailableObjectTypes();
    }

    public createDataObject(objectType: string, primaryKeyValue: string | number): any {
        return this.dataObjectManager.createObject(objectType, primaryKeyValue);
    }

    public updateDataObject(objectType: string, primaryKeyValue: string | number, updates: any): void {
        this.dataObjectManager.updateObject(objectType, primaryKeyValue, updates);
    }

    public waitForData(datasetName: string): Promise<any[]> {
        return this.dataStore.waitForData(datasetName);
    }

    public waitForAllData(datasetNames: string[]): Promise<{ [key: string]: any[] }> {
        return this.dataStore.waitForAllData(datasetNames);
    }

    public hasAllData(datasetNames: string[]): boolean {
        return this.dataStore.hasAllData(datasetNames);
    }

    /**
     * Convenient shorthand for getting dataset data (just the data array, not metadata)
     * Usage: annie.dataset('staff_list_get_v2') or annie.ds('staff_list_get_v2')
     * Returns: the data array from the dataset, or null if not found
     * For full dataset including metadata, use: annie.getDataStore().getDataset('name')
     */
    public dataset(datasetName: string): any[] | null {
        const normalizedName = datasetName.replace(/-/g, '_');
        const datasetInfo = this.dataStore.getDataset(normalizedName);
        return datasetInfo ? datasetInfo.data : null;
    }

    /**
     * Ultra-short alias for dataset() - returns just the data array
     * Usage: annie.ds('staff_list_get_v2')
     * Returns: the data array from the dataset, or null if not found
     */
    public ds(datasetName: string): any[] | null {
        return this.dataset(datasetName);
    }

    public getAllDatasetNames(): string[] {
        return this.dataStore.getAllDatasetNames();
    }

    /**
     * Wait for all initial data loading to complete
     */
    public waitForAllDataLoaded(): Promise<void> {
        return new Promise((resolve) => {
            const datasetsInitObj = (window as any)._datasetsinit;
            
            if (!datasetsInitObj || !datasetsInitObj.load || datasetsInitObj.load.length === 0) {
                // No data loading configuration, consider it complete
                this.logger.info('No datasets expected, marking as complete');
                this.dataLoadingComplete = true;
                resolve();
                return;
            }

            // Normalize all expected dataset names to match JavaScript naming (- to _)
            const expectedDatasets = datasetsInitObj.load.map((name: string) => name.replace(/-/g, '_'));
            this.logger.debug(`Waiting for ${expectedDatasets.length} datasets: ${expectedDatasets.join(', ')}`);
            
            // Check what datasets are already available
            const availableDatasets = this.dataStore.getAllDatasetNames();
            this.logger.debug(`Available datasets: ${availableDatasets.join(', ')}`);
            
            // Use the existing waitForAllData method that works
            this.dataStore.waitForAllData(expectedDatasets)
                .then(() => {
                    this.logger.info(`All ${expectedDatasets.length} datasets loaded successfully`);
                    this.dataLoadingComplete = true;
                    resolve();
                })
                .catch((error) => {
                    this.logger.error(`Error waiting for datasets: ${error}`);
                    // Still resolve to avoid blocking the application
                    this.dataLoadingComplete = true;
                    resolve();
                });
        });
    }

    /**
     * Check if all initial data loading is complete
     */
    public isDataLoadingComplete(): boolean {
        return this.dataLoadingComplete;
    }

    public reinitializeFieldProcessors(): void {
        this.fieldProcessor.reinitializeFieldProcessors();
    }

    public undo(): boolean {
        const result = this.dataStore.undo();
        if (result) {
            // Notify observers of any data changes
            const history = this.dataStore.getHistory();
            if (history.pointer !== null && history.data[history.pointer]) {
                const historyItem = history.data[history.pointer];
                this.uiObserver.notifyObservers(historyItem.datasource);
            }
        }
        return result;
    }

    public redo(): boolean {
        const result = this.dataStore.redo();
        if (result) {
            // Notify observers of any data changes
            const history = this.dataStore.getHistory();
            if (history.pointer !== null && history.data[history.pointer]) {
                const historyItem = history.data[history.pointer];
                this.uiObserver.notifyObservers(historyItem.datasource);
            }
        }
        return result;
    }

    // Cleanup method
    public destroy(): void {
        this.logger.info('🧹 Starting comprehensive Annie Framework cleanup...');
        const startTime = Date.now();
    
        // Stop memory leak monitoring
        this.memoryLeakDetector.stopMonitoring();
    
        // Cancel all active API requests
        this.apiController.cancel();
    
        // Clean up remote control components
        if (this.remoteControlUI) {
            this.remoteControlUI.destroy();
        }

        if (this.signalRManager) {
            this.signalRManager.disconnect();
        }

        if (this.notificationManager) {
            this.notificationManager.destroy();
        }

        // Register and clean up optional components that implement IDisposable
        // (NotificationManager and SignalRManager have their own cleanup methods)

        // Clean up error boundary
        this.errorBoundary.dispose();

        // Clear state manager
        this.stateManager.clearState('framework-destroy');
    
        // Use comprehensive cleanup manager
        this.cleanupManager.dispose();
    
        // Clean up framework-specific data attributes
        CleanupHelpers.cleanupDataAttributes(
            document.querySelectorAll('[data-annie-component], [data-annie-role], [data-annie-state], [data-annie-config]'),
            'annie-'
        );
    
        // Clean up framework CSS classes
        CleanupHelpers.cleanupCssClasses(
            document.querySelectorAll('[class*="annie-"]'),
            'annie-'
        );
    
        // Clean up local storage
        CleanupHelpers.cleanupLocalStorage('annie-');
        CleanupHelpers.cleanupSessionStorage('annie-');
    
        // Remove global references
        this.cleanupManager.cleanupGlobalReferences([
            'annie',
            'db', 
            '_r',
            '_rex',
            '_datasets_init_obj'
        ]);
    
        // Force garbage collection if available
        this.cleanupManager.requestGarbageCollection();
    
        this.initialized = false;
    
        const endTime = Date.now();
        this.logger.info(`✅ Annie Framework cleanup completed in ${endTime - startTime}ms`);
    
        // Dispose logger last if it implements IDisposable
        if (this.logger && 'dispose' in this.logger && typeof (this.logger as any).dispose === 'function') {
            (this.logger as any).dispose();
        }
    }

    // Additional cleanup and debugging methods
  
    /**
   * Start memory leak monitoring
   */
    public startMemoryMonitoring(intervalMs: number = 30000): void {
        this.memoryLeakDetector.startMonitoring(intervalMs);
    }

    /**
   * Stop memory leak monitoring
   */
    public stopMemoryMonitoring(): void {
        this.memoryLeakDetector.stopMonitoring();
    }

    /**
   * Get memory usage information
   */
    public getMemoryInfo(): any {
        return this.memoryLeakDetector.getMemoryInfo();
    }

    /**
   * Get cleanup statistics
   */
    public getCleanupStats(): any {
        return this.cleanupManager.getCleanupStats();
    }

    /**
   * Force garbage collection (development only)
   */
    public forceGarbageCollection(): void {
        this.cleanupManager.requestGarbageCollection();
    }

    /**
   * Partial cleanup - reset specific components without full destroy
   */
    public resetComponent(componentName: 'datastore' | 'observers' | 'triggers' | 'routes' | 'state'): void {
        this.logger.info(`Resetting component: ${componentName}`);
    
        switch (componentName) {
        case 'datastore':
        // Clear all datasets except 'store'
            const allDatasets = this.dataStore.all();
            Object.keys(allDatasets).forEach(key => {
                if (key !== 'store') {
                    this.dataStore.setDataset(key, [], { object: 'true', count: 0 });
                }
            });
            break;
        
        case 'observers':
            this.uiObserver.removeAllObservers();
            this.uiObserver.initializeObservers();
            break;
        
        case 'triggers':
        // Reinitialize triggers
            this.triggerHandler.initializeTriggers();
            break;
        
        case 'routes':
        // Routes will be reinitialized when router is recreated
            this.logger.info('Route reset requires full router reinitialization');
            break;
        
        case 'state':
            this.stateManager.clearState('manual-reset');
            break;
        }
    }

    /**
   * Clean up specific DOM elements and their framework bindings
   */
    public cleanupElements(selector: string): void {
        const elements = document.querySelectorAll(selector);
    
        // Clean up data attributes
        CleanupHelpers.cleanupDataAttributes(elements, 'annie-');
    
        // Remove elements from cleanup manager tracking
        this.cleanupManager.removeElements(elements);
    
        this.logger.info(`Cleaned up ${elements.length} elements matching selector: ${selector}`);
    }

    /**
   * Re-initialize framework components (useful after partial cleanup)
   */
    public reinitialize(): void {
        if (!this.initialized) {
            this.logger.warn('Framework not initialized, calling initialize() instead');
            this.initialize();
            return;
        }

        this.logger.info('Re-initializing framework components...');
    
        // Re-initialize components in order
        this.triggerHandler.initializeTriggers();
        this.uiObserver.initializeObservers();
    
        this.logger.info('Framework re-initialization completed');
    }

    // Validation Methods
  
    /**
   * Get the validation manager for external access
   */
    public getValidationManager(): ValidationManager {
        return this.validationManager;
    }

    /**
   * Validate the current framework state
   */
    public validateFramework(): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate all datasets
        const dataValidation = this.dataStore.validateAllDatasets();
        if (!dataValidation.isValid) {
            result.isValid = false;
            result.errors.push(...dataValidation.errors);
        }
        result.warnings.push(...dataValidation.warnings);

        // Check component initialization
        if (!this.initialized) {
            result.warnings.push('Framework not fully initialized');
        }

        // Check for memory leaks
        const memoryInfo = this.memoryLeakDetector.getMemoryInfo();
        if (memoryInfo.hasMemoryLeak) {
            result.warnings.push('Potential memory leak detected');
        }

        // Store validation result
        this.validationManager.storeValidationResult('framework', result);

        return result;
    }

    /**
   * Validate framework configuration
   */
    public validateConfig(): ValidationResult {
        try {
            this.validateConfiguration(this.config);
            return {
                isValid: true,
                errors: [],
                warnings: []
            };
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)],
                warnings: []
            };
        }
    }

    /**
   * Get all validation errors across the framework
   */
    public getAllValidationErrors(): Record<string, ValidationResult> {
        return this.validationManager.getAllValidationErrors();
    }

    /**
   * Check if the framework has any validation errors
   */
    public hasValidationErrors(): boolean {
        return this.validationManager.hasValidationErrors();
    }

    // ...existing code...
}

// Export for global usage
(window as any).AnnieFramework = AnnieFramework;
