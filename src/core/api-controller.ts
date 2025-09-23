import { ApiClient } from '../core/api-client.js';
import { ILogger } from '../core/logger.js';

export class ApiController {
    private queue: any[] = [];
    private apiClient: ApiClient;
    private logger: ILogger;
    private processing: boolean = false;

    constructor(apiClient: ApiClient, logger: ILogger) {
        this.apiClient = apiClient;
        this.logger = logger;
    }

    start(apiObject: any): Promise<any> {
        return new Promise((resolve, reject) => {
            // Add to queue with resolve/reject callbacks
            this.queue.push({
                apiObject,
                resolve,
                reject
            });

            // Start processing if not already running
            if (this.queue.length === 1 && !this.processing) {
                this.run();
            }
        });
    }

    private async run(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const queueItem = this.queue.shift();
            if (!queueItem) {
                continue;
            }

            try {
                this.logger.debug(`Processing API call: ${JSON.stringify(queueItem.apiObject)}`);
                const result = await this.apiClient.call(queueItem.apiObject);
                queueItem.resolve(result);
            } catch (error) {
                this.logger.error(`API call failed: ${error}`);
                queueItem.reject(error);
            }
        }

        this.processing = false;
    }

    // Get queue status
    getQueueLength(): number {
        return this.queue.length;
    }

    isProcessing(): boolean {
        return this.processing;
    }

    // Clear queue
    clearQueue(): void {
    // Reject all pending promises
        while (this.queue.length > 0) {
            const queueItem = this.queue.shift();
            if (queueItem) {
                queueItem.reject(new Error('Queue cleared'));
            }
        }
        this.processing = false;
    }

    // Cancel current request
    cancel(): void {
        this.apiClient.cancel();
        this.clearQueue();
    }
}
