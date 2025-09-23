import { DataStore } from '../core/data-store.js';
import { ILogger } from '../core/logger.js';
import { DataRecord } from '../core/types.js';

export interface ServerObjectMetadata {
    objectType: string;              // Object type name (e.g., "person", "order")
    primaryKey: string;              // Primary key field (e.g., "id", "personId")
    tables: ServerTableMapping[];    // Tables that make up this object
    relationships?: ServerRelationshipConfig[];
    version?: string;                // Metadata version for cache validation
    lastModified?: string;           // Timestamp for cache validation
}

export interface ServerTableMapping {
    tableName: string;               // Database table name
    dataset: string;                 // Local dataset name
    keyField: string;                // Foreign key field linking to main object
    fields?: ServerFieldMapping[];   // Field mappings (optional, defaults to direct mapping)
    isCollection?: boolean;          // True for one-to-many relationships (emails, phones)
    required?: boolean;              // Whether this table is required for the object
}

export interface ServerFieldMapping {
    source: string;                  // Field name in dataset
    target: string;                  // Field name in database table
    transform?: string;              // Optional transformation function name
    validation?: string;             // Validation rules
    defaultValue?: any;              // Default value if missing
}

export interface ServerRelationshipConfig {
    type: 'one-to-one' | 'one-to-many';
    parentField: string;
    childTable: string;
    childKey: string;
    cascade?: boolean;               // Whether to cascade operations
}

export interface DatasetSubmissionFilter {
    changedOnly?: boolean;           // Only include modified records
    deletedOnly?: boolean;           // Only include deleted records
    fields?: string[];               // Only include specific fields
    where?: (record: DataRecord) => boolean; // Custom filter function
}

export interface SubmissionConfig {
    datasets?: DatasetSubmissionConfig[];
    objects?: ObjectSubmissionConfig[];
    mode: 'manual' | 'auto';         // Manual selection vs automatic detection
}

export interface DatasetSubmissionConfig {
    name: string;                    // Dataset name
    alias?: string;                  // Alias in submission
    filter?: DatasetSubmissionFilter;
    format: 'flat' | 'nested';      // How to serialize the data
}

export interface ObjectSubmissionConfig {
    objectType: string;              // Object type name
    includeRelated?: boolean;        // Include related table data
    filter?: DatasetSubmissionFilter;
}

export interface MetadataLoadOptions {
    endpoint?: string;               // API endpoint to fetch metadata
    cacheKey?: string;               // Local storage cache key
    ttl?: number;                    // Cache time-to-live in minutes
    version?: string;                // Expected metadata version
}

export interface ObjectMetadataCache {
    metadata: ServerObjectMetadata[];
    timestamp: number;
    version?: string;
}

export class DataObjectManager {
    private dataStore: DataStore;
    private logger: ILogger;
    private objectMetadata: Map<string, ServerObjectMetadata> = new Map();
    private changeTracking: Map<string, Set<string>> = new Map(); // Track changed records
    private deletedRecords: Map<string, DataRecord[]> = new Map(); // Track deleted records
    private metadataLoaded: boolean = false;

    constructor(dataStore: DataStore, logger: ILogger) {
        this.dataStore = dataStore;
        this.logger = logger;
    }

    /**
     * Load object metadata from server or cache
     */
    async loadMetadata(options: MetadataLoadOptions = {}): Promise<void> {
        try {
            // Try to load from cache first
            const cached = this.loadFromCache(options.cacheKey);
            if (cached && this.isCacheValid(cached, options.ttl || 60)) {
                this.setMetadata(cached.metadata);
                this.logger.info('Loaded object metadata from cache');
                return;
            }

            // Load from server
            if (options.endpoint) {
                const metadata = await this.fetchMetadataFromServer(options.endpoint);
                this.setMetadata(metadata);
                this.saveToCache(metadata, options.cacheKey);
                this.logger.info('Loaded object metadata from server');
            } else {
                this.logger.warn('No metadata endpoint provided and no valid cache found');
            }
        } catch (error) {
            this.logger.error(`Failed to load metadata: ${error}`);
            // Try to use cached data even if expired
            const cached = this.loadFromCache(options.cacheKey);
            if (cached) {
                this.setMetadata(cached.metadata);
                this.logger.warn('Using expired cached metadata due to server error');
            }
        }
    }

    /**
     * Set metadata directly (useful for testing or manual configuration)
     */
    setMetadata(metadataArray: ServerObjectMetadata[]): void {
        this.objectMetadata.clear();
        metadataArray.forEach(metadata => {
            this.objectMetadata.set(metadata.objectType, metadata);
            
            // Initialize change tracking for each table
            metadata.tables.forEach(table => {
                if (!this.changeTracking.has(table.dataset)) {
                    this.changeTracking.set(table.dataset, new Set());
                }
            });
        });
        
        this.metadataLoaded = true;
        this.logger.info(`Loaded metadata for ${metadataArray.length} object types`);
    }

    /**
     * Check if metadata is loaded
     */
    isMetadataLoaded(): boolean {
        return this.metadataLoaded;
    }

    /**
     * Get available object types
     */
    getAvailableObjectTypes(): string[] {
        return Array.from(this.objectMetadata.keys());
    }

    /**
     * Create a complete object from multiple datasets
     */
    createObject(objectType: string, primaryKeyValue: string | number): any {
        const config = this.objectMetadata.get(objectType);
        if (!config) {
            this.logger.error(`Object type ${objectType} not found in metadata`);
            return null;
        }

        const result: any = {};
        
        config.tables.forEach((tableConfig: ServerTableMapping) => {
            const dataset = this.dataStore.getDataset(tableConfig.dataset);
            if (!dataset) {
                this.logger.warn(`Dataset ${tableConfig.dataset} not found for object type ${objectType}`);
                return;
            }

            // Find records that belong to this object
            const records = dataset.data.filter(record => 
                record[tableConfig.keyField] === primaryKeyValue
            );

            if (tableConfig.isCollection) {
                // One-to-many relationship (emails, phones, etc.)
                result[tableConfig.tableName] = records.map(record => 
                    this.mapFields(record, tableConfig.fields)
                );
            } else {
                // One-to-one relationship (demographics, main data)
                if (records.length > 0) {
                    const mappedRecord = this.mapFields(records[0], tableConfig.fields);
                    Object.assign(result, mappedRecord);
                }
            }
        });

        this.logger.debug(`Created ${objectType} object: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * Update an object across multiple datasets
     */
    updateObject(objectType: string, primaryKeyValue: string | number, updates: any): void {
        const config = this.objectMetadata.get(objectType);
        if (!config) {
            this.logger.error(`Object type ${objectType} not found in metadata`);
            return;
        }

        config.tables.forEach((tableConfig: ServerTableMapping) => {
            const dataset = this.dataStore.getDataset(tableConfig.dataset);
            if (!dataset) return;

            // Find and update records
            dataset.data.forEach((record) => {
                if (record[tableConfig.keyField] === primaryKeyValue) {
                    // Apply updates to this record
                    const tableUpdates = this.extractTableUpdates(updates, tableConfig);
                    Object.assign(record, tableUpdates);
                    
                    // Track the change
                    this.trackChange(tableConfig.dataset, record[config.primaryKey] as string);
                    
                    this.logger.debug(`Updated ${tableConfig.tableName} record for ${objectType}:${primaryKeyValue}`);
                }
            });
        });
    }

    /**
     * Mark a record as changed for tracking
     */
    trackChange(datasetName: string, recordId: string): void {
        if (!this.changeTracking.has(datasetName)) {
            this.changeTracking.set(datasetName, new Set());
        }
        this.changeTracking.get(datasetName)!.add(recordId);
        this.logger.debug(`Tracked change: ${datasetName}:${recordId}`);
    }

    /**
     * Mark a record as deleted
     */
    markDeleted(datasetName: string, record: DataRecord): void {
        if (!this.deletedRecords.has(datasetName)) {
            this.deletedRecords.set(datasetName, []);
        }
        this.deletedRecords.get(datasetName)!.push(record);
        this.logger.debug(`Marked as deleted: ${datasetName}:${record.id || 'unknown'}`);
    }

    /**
     * Build submission data based on configuration
     */
    buildSubmissionData(config: SubmissionConfig): any {
        const submission: any = {};

        // Handle dataset submissions
        if (config.datasets) {
            config.datasets.forEach(datasetConfig => {
                const data = this.buildDatasetSubmission(datasetConfig);
                if (data !== null) {
                    const key = datasetConfig.alias || datasetConfig.name;
                    submission[key] = data;
                }
            });
        }

        // Handle object submissions
        if (config.objects) {
            config.objects.forEach(objectConfig => {
                const data = this.buildObjectSubmission(objectConfig);
                if (data !== null) {
                    submission[objectConfig.objectType] = data;
                }
            });
        }

        this.logger.debug(`Built submission data: ${JSON.stringify(submission)}`);
        return submission;
    }

    private buildDatasetSubmission(config: DatasetSubmissionConfig): any {
        const dataset = this.dataStore.getDataset(config.name);
        if (!dataset) {
            this.logger.warn(`Dataset ${config.name} not found for submission`);
            return null;
        }

        let records = [...dataset.data];

        // Apply filters
        if (config.filter) {
            records = this.applyDatasetFilter(records, config.name, config.filter);
        }

        // Format the data
        if (config.format === 'nested') {
            return {
                meta: dataset.meta,
                data: records,
                changes: Array.from(this.changeTracking.get(config.name) || []),
                deleted: this.deletedRecords.get(config.name) || []
            };
        } else {
            // Flat format
            return records;
        }
    }

    private buildObjectSubmission(config: ObjectSubmissionConfig): any {
        const objectConfig = this.objectMetadata.get(config.objectType);
        if (!objectConfig) {
            this.logger.error(`Object type ${config.objectType} not found in metadata`);
            return null;
        }

        // Get all unique primary key values across all tables for this object type
        const primaryKeys = new Set<string | number>();
        
        objectConfig.tables.forEach((tableConfig: ServerTableMapping) => {
            const dataset = this.dataStore.getDataset(tableConfig.dataset);
            if (dataset) {
                dataset.data.forEach(record => {
                    const pkValue = record[objectConfig.primaryKey];
                    if (pkValue !== undefined && pkValue !== null) {
                        primaryKeys.add(pkValue as string | number);
                    }
                });
            }
        });

        // Build complete objects
        const objects: any[] = [];
        primaryKeys.forEach(pk => {
            const obj = this.createObject(config.objectType, pk);
            if (obj && Object.keys(obj).length > 0) {
                // Apply filtering if needed
                if (!config.filter || this.passesObjectFilter(obj, config.filter)) {
                    objects.push(obj);
                }
            }
        });

        return {
            objectType: config.objectType,
            objects: objects,
            meta: {
                totalObjects: objects.length,
                timestamp: Date.now()
            }
        };
    }

    private applyDatasetFilter(records: DataRecord[], datasetName: string, filter: DatasetSubmissionFilter): DataRecord[] {
        let filteredRecords = records;

        // Filter for changed records only
        if (filter.changedOnly) {
            const changedIds = this.changeTracking.get(datasetName) || new Set();
            filteredRecords = filteredRecords.filter(record => 
                changedIds.has(record.id as string)
            );
        }

        // Filter for deleted records only
        if (filter.deletedOnly) {
            filteredRecords = this.deletedRecords.get(datasetName) || [];
        }

        // Filter by specific fields
        if (filter.fields) {
            filteredRecords = filteredRecords.map(record => {
                const filtered: DataRecord = {};
                filter.fields!.forEach(field => {
                    if (record.hasOwnProperty(field)) {
                        filtered[field] = record[field];
                    }
                });
                return filtered;
            });
        }

        // Apply custom filter function
        if (filter.where) {
            filteredRecords = filteredRecords.filter(filter.where);
        }

        return filteredRecords;
    }

    private passesObjectFilter(obj: any, filter: DatasetSubmissionFilter): boolean {
        // Apply object-level filtering logic
        if (filter.where) {
            return filter.where(obj);
        }
        return true;
    }

    private mapFields(record: DataRecord, fieldMappings?: ServerFieldMapping[]): any {
        if (!fieldMappings) {
            return { ...record };
        }

        const mapped: any = {};
        fieldMappings.forEach(mapping => {
            if (record.hasOwnProperty(mapping.source)) {
                let value = record[mapping.source];
                
                // Apply transformation if specified
                if (mapping.transform) {
                    value = this.applyTransform(value, mapping.transform);
                }
                
                // Use default value if source is undefined
                if (value === undefined && mapping.defaultValue !== undefined) {
                    value = mapping.defaultValue;
                }
                
                mapped[mapping.target] = value;
            }
        });

        return mapped;
    }

    private extractTableUpdates(updates: any, tableConfig: ServerTableMapping): any {
        // Extract updates relevant to this table
        const tableUpdates: any = {};
        
        if (tableConfig.fields) {
            tableConfig.fields.forEach((fieldMapping: ServerFieldMapping) => {
                if (updates.hasOwnProperty(fieldMapping.target)) {
                    tableUpdates[fieldMapping.source] = updates[fieldMapping.target];
                }
            });
        } else {
            // Direct mapping
            Object.assign(tableUpdates, updates);
        }

        return tableUpdates;
    }

    private applyTransform(value: any, transformName: string): any {
        // Apply data transformations (implement as needed)
        switch (transformName) {
            case 'uppercase':
                return typeof value === 'string' ? value.toUpperCase() : value;
            case 'lowercase':
                return typeof value === 'string' ? value.toLowerCase() : value;
            case 'trim':
                return typeof value === 'string' ? value.trim() : value;
            // Add more transformations as needed
            default:
                this.logger.warn(`Unknown transform: ${transformName}`);
                return value;
        }
    }

    /**
     * Get change tracking info for debugging
     */
    getChangeTracking(): Map<string, Set<string>> {
        return this.changeTracking;
    }

    /**
     * Clear change tracking
     */
    clearChangeTracking(datasetName?: string): void {
        if (datasetName) {
            this.changeTracking.delete(datasetName);
            this.deletedRecords.delete(datasetName);
        } else {
            this.changeTracking.clear();
            this.deletedRecords.clear();
        }
        this.logger.debug(`Cleared change tracking${datasetName ? ` for ${datasetName}` : ''}`);
    }

    /**
     * Cache management methods
     */
    private loadFromCache(cacheKey?: string): ObjectMetadataCache | null {
        if (!cacheKey || typeof window === 'undefined' || !window.localStorage) {
            return null;
        }

        try {
            const cached = window.localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            this.logger.warn(`Failed to load metadata from cache: ${error}`);
            return null;
        }
    }

    private saveToCache(metadata: ServerObjectMetadata[], cacheKey?: string): void {
        if (!cacheKey || typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        try {
            const cache: ObjectMetadataCache = {
                metadata,
                timestamp: Date.now(),
                version: metadata[0]?.version
            };
            window.localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (error) {
            this.logger.warn(`Failed to save metadata to cache: ${error}`);
        }
    }

    private isCacheValid(cache: ObjectMetadataCache, ttlMinutes: number): boolean {
        const now = Date.now();
        const ageMinutes = (now - cache.timestamp) / (1000 * 60);
        return ageMinutes < ttlMinutes;
    }

    private async fetchMetadataFromServer(endpoint: string): Promise<ServerObjectMetadata[]> {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${endpoint} returned ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : data.metadata || [];
    }

    /**
     * Dispose method for cleanup
     */
    dispose(): void {
        this.objectMetadata.clear();
        this.changeTracking.clear();
        this.deletedRecords.clear();
        this.metadataLoaded = false;
        this.logger.debug('DataObjectManager disposed');
    }
}