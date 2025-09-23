import { Dataset, DatasetMeta, HistoryItem, DataRecord } from './types.js';
import { ILogger } from './logger.js';
import { IDisposable } from './di-container.js';
import { 
    isDataRecord, 
    isDataset, 
    isDatasetMeta, 
    isString, 
    isNumber, 
    isArray,
    isObject,
    isBoolean,
    ValidationManager,
    ValidationResult,
    validate
} from '../utils/type-guards.js';

type DataStoreValue = string | number | boolean | DataRecord | DataRecord[] | null | undefined;

export class DataStore implements IDisposable {
    private datasets: { [key: string]: Dataset } = {};
    private history: {
    pointer: number | null;
    data: HistoryItem<DataStoreValue>[];
  } = {
            pointer: 0,
            data: []
        };
    private logger: ILogger;
    private subscribers: Map<string, Array<(datasource: string, data: DataRecord[]) => void>> = new Map();
    private disposed: boolean = false;
    private validationManager: ValidationManager;

    constructor(logger: ILogger) {
        this.logger = logger;
        this.validationManager = new ValidationManager(logger);
        this.initializeStore();
    }

    private initializeStore(): void {
    // Initialize default store dataset
        this.datasets.store = {
            data: [],
            meta: {
                object: "true",
                count: 0
            },
            all: function() {
                return [...this.data];
            }
        };
    }

    // Get all datasets
    all(): { [key: string]: Dataset } {
        return JSON.parse(JSON.stringify(this.datasets));
    }

    // Load dataset from JSON
    load(datasetName: string, jsonData: string): void {
    // Validate inputs
        const nameValidation = validate(datasetName, 'string', { minLength: 1 });
        const jsonValidation = validate(jsonData, 'string', { minLength: 1 });
    
        if (!nameValidation.isValid) {
            this.logger.error(`Invalid dataset name: ${nameValidation.errors.join(', ')}`);
            return;
        }
    
        if (!jsonValidation.isValid) {
            this.logger.error(`Invalid JSON data: ${jsonValidation.errors.join(', ')}`);
            return;
        }

        try {
            const parsedData = JSON.parse(jsonData);
      
            if (!isDataset(parsedData)) {
                this.logger.error(`Invalid dataset structure for ${datasetName}`);
                return;
            }
      
            this.datasets[datasetName] = parsedData;
            this.logger.info(`Successfully loaded dataset: ${datasetName}`);
        } catch (error) {
            this.logger.error(`Failed to load dataset ${datasetName}: ${error}`);
        }
    }

    // Unload dataset
    unload(datasetName?: string): void {
        if (datasetName) {
            delete this.datasets[datasetName];
        } else {
            this.datasets = { store: this.datasets.store };
        }
    }

    // Get specific dataset
    getDataset(name: string): Dataset | undefined {
        return this.datasets[name];
    }

    // Set dataset data
    setDataset(name: string, data: DataRecord[], meta?: Partial<DatasetMeta>): void {
    // Validate inputs
        const nameValidation = validate(name, 'string', { minLength: 1 });
        const dataValidation = validate(data, 'array');
    
        if (!nameValidation.isValid) {
            this.logger.error(`Invalid dataset name: ${nameValidation.errors.join(', ')}`);
            return;
        }
    
        if (!dataValidation.isValid) {
            this.logger.error(`Invalid data array: ${dataValidation.errors.join(', ')}`);
            return;
        }
    
        // Validate each data record
        const invalidRecords = data.filter((record, index) => {
            if (!isDataRecord(record)) {
                this.logger.warn(`Invalid data record at index ${index} in dataset ${name}`);
                return true;
            }
            return false;
        });
    
        if (invalidRecords.length > 0) {
            this.logger.warn(`Dataset ${name} contains ${invalidRecords.length} invalid records`);
        }

        if (!this.datasets[name]) {
            this.datasets[name] = {
                data: [],
                meta: { object: "false", count: 0 },
                all: function() { return [...this.data]; }
            };
        }

        this.datasets[name].data = data;
        this.datasets[name].meta = {
            ...this.datasets[name].meta,
            count: data.length,
            lastModified: Date.now(),
            ...meta
        };

        // Validate the meta object if provided
        if (meta && !isDatasetMeta({ ...this.datasets[name].meta, ...meta })) {
            this.logger.warn(`Invalid metadata provided for dataset ${name}`);
        }

        // Notify subscribers
        this.notifySubscribers(name, this.datasets[name].data);
    
        this.logger.debug(`Dataset ${name} updated with ${data.length} records`);
    }

    // Update specific field in dataset
    updateField(datasetName: string, index: number, fieldName: string, value: DataStoreValue): void {
    // Validate inputs
        const nameValidation = validate(datasetName, 'string', { minLength: 1 });
        const indexValidation = validate(index, 'number', { min: 0 });
        const fieldValidation = validate(fieldName, 'string', { minLength: 1 });
    
        if (!nameValidation.isValid) {
            this.logger.error(`Invalid dataset name: ${nameValidation.errors.join(', ')}`);
            return;
        }
    
        if (!indexValidation.isValid) {
            this.logger.error(`Invalid index: ${indexValidation.errors.join(', ')}`);
            return;
        }
    
        if (!fieldValidation.isValid) {
            this.logger.error(`Invalid field name: ${fieldValidation.errors.join(', ')}`);
            return;
        }

        // Check if dataset exists
        if (!this.datasets[datasetName]) {
            this.logger.error(`Dataset ${datasetName} does not exist`);
            return;
        }
    
        // Check if index is valid
        if (!this.datasets[datasetName].data[index]) {
            this.logger.error(`Index ${index} out of bounds for dataset ${datasetName}`);
            return;
        }
    
        // Validate that the record is still a valid DataRecord after update
        const testRecord = { ...this.datasets[datasetName].data[index], [fieldName]: value };
        if (!isDataRecord(testRecord)) {
            this.logger.error(`Update would create invalid data record in ${datasetName}[${index}].${fieldName}`);
            return;
        }

        const oldValue = this.datasets[datasetName].data[index][fieldName];
    
        // Add to history
        this.addToHistory({
            datasource: datasetName,
            datafield: fieldName,
            value: value,
            was: oldValue,
            timestamp: Date.now()
        });

        this.datasets[datasetName].data[index][fieldName] = value;
    
        // Update meta timestamp
        this.datasets[datasetName].meta.lastModified = Date.now();
    
        // Notify subscribers
        this.notifySubscribers(datasetName, this.datasets[datasetName].data);
    
        this.logger.debug(`Updated ${datasetName}[${index}].${fieldName}: ${oldValue} -> ${value}`);
    }

    // History management
    private addToHistory(item: HistoryItem<DataStoreValue>): void {
    // Truncate history from current pointer if needed
        if (this.history.pointer !== null && this.history.pointer + 1 < this.history.data.length) {
            const slice = this.history.data.length - (this.history.pointer + 1);
            this.history.data = this.history.data.slice(0, -slice);
        }

        this.history.data.push(item);
        this.history.pointer = this.history.data.length - 1;
    }

    undo(): boolean {
        if (this.history.pointer !== null && this.history.pointer >= 0) {
            const historyItem = this.history.data[this.history.pointer];
            const { datasource, datafield, was } = historyItem;
      
            if (this.datasets[datasource] && this.datasets[datasource].data[0]) {
                this.datasets[datasource].data[0][datafield] = was;
                this.history.pointer = this.history.pointer > 0 ? this.history.pointer - 1 : 0;
                return true;
            }
        }
        return false;
    }

    redo(): boolean {
        if (this.history.pointer !== null && this.history.pointer < this.history.data.length - 1) {
            const historyItem = this.history.data[this.history.pointer + 1];
            const { datasource, datafield, value } = historyItem;
      
            if (this.datasets[datasource] && this.datasets[datasource].data[0]) {
                this.datasets[datasource].data[0][datafield] = value;
                this.history.pointer = this.history.pointer + 1;
                return true;
            }
        }
        return false;
    }

    getHistory(): { pointer: number | null; data: HistoryItem[] } {
        return this.history;
    }

    // Helper methods
    where(datasetName: string, predicate: (item: DataRecord) => boolean): DataRecord[] {
        const dataset = this.datasets[datasetName];
        if (dataset) {
            return dataset.data.filter(predicate);
        }
        return [];
    }

    save(datasetName: string): boolean {
    // TODO: Implement save functionality
        this.logger.info(`Save functionality not yet implemented for ${datasetName}`);
        return false;
    }

    help(): object {
        return {
            all: "get list of all datasets in db as object",
            create: "todo",
            read: "todo", 
            update: "todo",
            delete: "todo",
            alterTable: "todo",
            load: "add dataset as array to db",
            unload: "empty db and init with empty store dataset",
            where: "filter dataset by predicate function",
            save: "todo",
        };
    }

    // Subscription methods for notifications
    subscribe(datasource: string, callback: (datasource: string, data: DataRecord[]) => void): void {
        if (!this.subscribers.has(datasource)) {
            this.subscribers.set(datasource, []);
        }
    this.subscribers.get(datasource)!.push(callback);
    }

    unsubscribe(datasource: string, callback?: (datasource: string, data: DataRecord[]) => void): void {
        if (!this.subscribers.has(datasource)) return;

        if (callback) {
            const callbacks = this.subscribers.get(datasource)!;
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        } else {
            this.subscribers.delete(datasource);
        }
    }

    private notifySubscribers(datasource: string, data: DataRecord[]): void {
    // Notify specific datasource subscribers
        const specificCallbacks = this.subscribers.get(datasource);
        if (specificCallbacks) {
            specificCallbacks.forEach(callback => {
                try {
                    callback(datasource, data);
                } catch (error) {
                    this.logger.error(`Subscriber callback error: ${error}`);
                }
            });
        }

        // Notify wildcard subscribers
        const wildcardCallbacks = this.subscribers.get('*');
        if (wildcardCallbacks) {
            wildcardCallbacks.forEach(callback => {
                try {
                    callback(datasource, data);
                } catch (error) {
                    this.logger.error(`Wildcard subscriber callback error: ${error}`);
                }
            });
        }
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing DataStore');
    
        // Clear all subscribers
        this.subscribers.clear();
    
        // Clear all datasets
        this.datasets = {};
    
        // Clear history
        this.history = {
            pointer: 0,
            data: []
        };
    
        this.disposed = true;
    
        this.logger.debug('DataStore disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }

    // Validation methods
  
    /**
   * Validate a complete dataset
   */
    public validateDataset(name: string): ValidationResult {
        const dataset = this.datasets[name];
    
        if (!dataset) {
            return {
                isValid: false,
                errors: [`Dataset ${name} does not exist`],
                warnings: []
            };
        }
    
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };
    
        // Validate dataset structure
        if (!isDataset(dataset)) {
            result.isValid = false;
            result.errors.push(`Dataset ${name} has invalid structure`);
            return result;
        }
    
        // Validate individual records
        dataset.data.forEach((record, index) => {
            if (!isDataRecord(record)) {
                result.isValid = false;
                result.errors.push(`Record at index ${index} is invalid`);
            }
        });
    
        // Validate metadata consistency
        if (dataset.meta.count !== dataset.data.length) {
            result.warnings.push(`Meta count (${dataset.meta.count}) doesn't match actual data length (${dataset.data.length})`);
        }
    
        this.validationManager.storeValidationResult(`dataset-${name}`, result);
    
        return result;
    }
  
    /**
   * Validate all datasets
   */
    public validateAllDatasets(): ValidationResult {
        const overallResult: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };
    
        for (const name of Object.keys(this.datasets)) {
            const result = this.validateDataset(name);
      
            if (!result.isValid) {
                overallResult.isValid = false;
                overallResult.errors.push(...result.errors.map(err => `${name}: ${err}`));
            }
      
            overallResult.warnings.push(...result.warnings.map(warn => `${name}: ${warn}`));
        }
    
        return overallResult;
    }
  
    /**
   * Get validation manager for external access
   */
    public getValidationManager(): ValidationManager {
        return this.validationManager;
    }
  
    /**
   * Sanitize and validate input data before setting
   */
    public sanitizeAndSetDataset(name: string, data: any[], meta?: Partial<DatasetMeta>): boolean {
        try {
            // Attempt to sanitize the data
            const sanitizedData: DataRecord[] = data.map((item, index) => {
                if (isDataRecord(item)) {
                    return item;
                }
        
                // Try to convert to DataRecord
                if (isObject(item)) {
                    const sanitized: DataRecord = {};
                    for (const [key, value] of Object.entries(item)) {
                        if (isString(key) && (
                            isString(value) || isNumber(value) || isBoolean(value) || 
              value === null || value === undefined
                        )) {
                            sanitized[key] = value as string | number | boolean | null | undefined;
                        } else {
                            this.logger.warn(`Skipped invalid field ${key} in record ${index}`);
                        }
                    }
                    return sanitized;
                }
        
                this.logger.warn(`Could not sanitize record at index ${index}`);
                return {};
            });
      
            this.setDataset(name, sanitizedData, meta);
            return true;
      
        } catch (error) {
            this.logger.error(`Failed to sanitize and set dataset ${name}: ${error}`);
            return false;
        }
    }

    /**
     * Wait for a dataset to be available (returns a promise)
     */
    public waitForData(datasetName: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            // Check if data already exists
            if (this.datasets[datasetName] && this.datasets[datasetName].data) {
                resolve(this.datasets[datasetName].data);
                return;
            }

            // Create a callback that will be called when data is loaded
            const waitCallback = (datasource: string, data: DataRecord[]) => {
                if (datasource === datasetName) {
                    // Unsubscribe and resolve
                    this.unsubscribe(datasetName, waitCallback);
                    resolve(data);
                }
            };

            // Subscribe to wait for the data
            this.subscribe(datasetName, waitCallback);

            // Optional: Add timeout to prevent infinite waiting
            setTimeout(() => {
                this.unsubscribe(datasetName, waitCallback);
                reject(new Error(`Timeout waiting for dataset: ${datasetName}`));
            }, 30000); // 30 second timeout
        });
    }

    /**
     * Wait for multiple datasets to be loaded
     */
    public waitForAllData(datasetNames: string[]): Promise<{ [key: string]: any[] }> {
        const promises = datasetNames.map(name => 
            this.waitForData(name).then(data => ({ name, data }))
        );

        return Promise.all(promises).then(results => {
            const datasets: { [key: string]: any[] } = {};
            results.forEach(result => {
                datasets[result.name] = result.data;
            });
            return datasets;
        });
    }

    /**
     * Check if all specified datasets are loaded
     */
    public hasAllData(datasetNames: string[]): boolean {
        return datasetNames.every(name => 
            this.datasets[name] && this.datasets[name].data && this.datasets[name].data.length >= 0
        );
    }

    /**
     * Get all dataset names
     */
    public getAllDatasetNames(): string[] {
        return Object.keys(this.datasets);
    }
}
