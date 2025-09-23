import { SignalRManager } from './signalr-manager.js';
import { ILogger } from './logger.js';
import { DataStore } from './data-store.js';

export interface NotificationConfig {
  enablePollingFallback?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  batchNotifications?: boolean;
  batchDelay?: number;
  notificationGroups?: string[];
}

export interface Notification {
  id: string;
  type: 'data-update' | 'system' | 'user' | 'alert' | 'info';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  userId?: string;
  groupId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: number;
  read?: boolean;
}

export interface NotificationSubscription {
  datasource?: string;
  type?: string[];
  userId?: string;
  groupId?: string;
  callback?: (notification: Notification) => void;
}

export class NotificationManager {
    private signalRManager?: SignalRManager;
    private dataStore: DataStore;
    private logger: ILogger;
    private config: NotificationConfig;
    private subscriptions: Map<string, NotificationSubscription[]> = new Map();
    private notifications: Map<string, Notification> = new Map();
    private pollingTimer?: number;
    private batchTimer?: number;
    private pendingNotifications: Notification[] = [];
    private isSignalRConnected: boolean = false;
    private connectionAttempts: number = 0;

    constructor(
        dataStore: DataStore,
        logger: ILogger,
        signalRManager?: SignalRManager,
        config: NotificationConfig = {}
    ) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.signalRManager = signalRManager;
    
        this.config = {
            enablePollingFallback: false,  // Changed default to false
            pollingInterval: 30000, // 30 seconds
            maxRetries: 3,
            batchNotifications: true,
            batchDelay: 1000, // 1 second
            notificationGroups: ['data-updates', 'system-alerts', 'user-notifications'],
            ...config
        };
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Notification Manager');

        // Try to use SignalR first
        if (this.signalRManager) {
            try {
                await this.setupSignalRNotifications();
                this.isSignalRConnected = true;
                this.logger.info('Using SignalR for real-time notifications');
            } catch (error) {
                this.logger.warn(`SignalR connection failed: ${error}`);
                this.fallbackToPolling();
            }
        } else {
            this.fallbackToPolling();
        }

        // Setup data store observation for local notifications
        this.setupDataStoreObservation();
    }

    private async setupSignalRNotifications(): Promise<void> {
        if (!this.signalRManager) return;

        // Listen for notifications from server
        this.signalRManager.onNotificationReceived((notification: Notification) => {
            this.handleNotification(notification);
        });

        // Listen for data updates
        this.signalRManager.onDataUpdated((data: any) => {
            this.createDataUpdateNotification(data);
        });

        // Handle connection events
        this.signalRManager.onConnectionStateChanged((connected: boolean) => {
            this.isSignalRConnected = connected;
            if (!connected && this.config.enablePollingFallback) {
                this.fallbackToPolling();
            } else if (connected) {
                this.stopPolling();
                this.connectionAttempts = 0;
            }
        });

        // Join notification groups
        if (this.config.notificationGroups) {
            for (const group of this.config.notificationGroups) {
                await this.signalRManager.joinGroup(group);
            }
        }
    }

    private fallbackToPolling(): void {
        if (!this.config.enablePollingFallback) return;

        this.logger.info(`Falling back to polling (interval: ${this.config.pollingInterval}ms)`);
    
        this.stopPolling(); // Clear any existing timer
    
        this.pollingTimer = window.setInterval(() => {
            this.pollForNotifications();
        }, this.config.pollingInterval);
    }

    private stopPolling(): void {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
    }

    private async pollForNotifications(): Promise<void> {
        try {
            // Implement your polling logic here
            // This would typically make an API call to get pending notifications
            const response = await fetch('/api/notifications/pending', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const notifications: Notification[] = await response.json();
                notifications.forEach(notification => {
                    this.handleNotification(notification);
                });
            }
        } catch (error) {
            this.logger.error(`Polling failed: ${error}`);
      
            // Implement exponential backoff
            this.connectionAttempts++;
            if (this.connectionAttempts <= this.config.maxRetries!) {
                const delay = Math.pow(2, this.connectionAttempts) * 1000;
                setTimeout(() => {
                    if (!this.isSignalRConnected) {
                        this.pollForNotifications();
                    }
                }, delay);
            }
        }
    }

    private setupDataStoreObservation(): void {
    // Listen for data changes and create notifications
        this.dataStore.subscribe('*', (datasource: string, data: any) => {
            if (this.hasSubscription(datasource)) {
                this.createDataUpdateNotification({
                    datasource,
                    data,
                    timestamp: Date.now()
                });
            }
        });
    }

    private handleNotification(notification: Notification): void {
    // Store notification
        this.notifications.set(notification.id, notification);

        // Batch notifications if enabled
        if (this.config.batchNotifications) {
            this.pendingNotifications.push(notification);
            this.scheduleBatchProcessing();
        } else {
            this.processNotification(notification);
        }

        // Trigger subscriptions
        this.triggerSubscriptions(notification);
    }

    private scheduleBatchProcessing(): void {
        if (this.batchTimer) return;

        this.batchTimer = window.setTimeout(() => {
            this.processBatchedNotifications();
            this.batchTimer = undefined;
        }, this.config.batchDelay);
    }

    private processBatchedNotifications(): void {
        if (this.pendingNotifications.length === 0) return;

        // Group by type and priority
        const grouped = this.groupNotifications(this.pendingNotifications);
    
        // Process each group
        Object.entries(grouped).forEach(([key, notifications]) => {
            this.processBatchGroup(key, notifications);
        });

        this.pendingNotifications = [];
    }

    private groupNotifications(notifications: Notification[]): Record<string, Notification[]> {
        const groups: Record<string, Notification[]> = {};
    
        notifications.forEach(notification => {
            const key = `${notification.type}-${notification.priority}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(notification);
        });

        return groups;
    }

    private processBatchGroup(key: string, notifications: Notification[]): void {
        const [type, priority] = key.split('-');
    
        if (notifications.length === 1) {
            this.processNotification(notifications[0]);
        } else {
            // Create a summary notification for multiple items
            const summaryNotification: Notification = {
                id: `batch-${Date.now()}`,
                type: type as any,
                title: `${notifications.length} ${type} notifications`,
                message: this.createBatchMessage(notifications),
                timestamp: Date.now(),
                priority: priority as any,
                data: { notifications }
            };
      
            this.processNotification(summaryNotification);
        }
    }

    private createBatchMessage(notifications: Notification[]): string {
        const types = [...new Set(notifications.map(n => n.type))];
        return `Received ${notifications.length} notifications: ${types.join(', ')}`;
    }

    private processNotification(notification: Notification): void {
    // Show notification based on priority and type
        switch (notification.priority) {
        case 'urgent':
            this.showUrgentNotification(notification);
            break;
        case 'high':
            this.showHighPriorityNotification(notification);
            break;
        default:
            this.showNormalNotification(notification);
            break;
        }

        // Log notification
        this.logger.info(`Notification: ${notification.title} - ${notification.message}`);
    }

    private showUrgentNotification(notification: Notification): void {
    // Use browser notification API for urgent messages
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                requireInteraction: true
            });
        }
    
        // Also show in-app notification
        this.showInAppNotification(notification, true);
    }

    private showHighPriorityNotification(notification: Notification): void {
        this.showInAppNotification(notification, false);
    }

    private showNormalNotification(notification: Notification): void {
        this.showInAppNotification(notification, false);
    }

    private showInAppNotification(notification: Notification, persistent: boolean = false): void {
    // Create notification UI element
        const notificationEl = document.createElement('div');
        notificationEl.setAttribute('data-component', 'annie-notification');
        notificationEl.setAttribute('data-type', notification.type);
        notificationEl.setAttribute('data-priority', notification.priority);
        notificationEl.innerHTML = `
      <div data-component="notification-header">
        <span data-component="notification-title">${notification.title}</span>
        <button data-button="close" data-action="close">×</button>
      </div>
      <div data-component="notification-body">${notification.message}</div>
      <div data-component="notification-time">${new Date(notification.timestamp).toLocaleTimeString()}</div>
    `;

        // Add styles if not already present
        this.ensureNotificationStyles();

        // Add to container
        let container = document.getElementById('annie-notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'annie-notifications-container';
            document.body.appendChild(container);
        }

        container.appendChild(notificationEl);

        // Auto-remove after delay unless persistent
        if (!persistent) {
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 5000);
        }

        // Handle close button
        notificationEl.querySelector('[data-button="close"]')?.addEventListener('click', () => {
            notificationEl.remove();
        });
    }

    private ensureNotificationStyles(): void {
        if (document.getElementById('annie-notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'annie-notification-styles';
        styles.textContent = `
      #annie-notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        max-width: 400px;
      }

      .annie-notification {
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-bottom: 10px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
      }

      .annie-notification.urgent {
        border-left: 4px solid #dc3545;
        background: #fff5f5;
      }

      .annie-notification.high {
        border-left: 4px solid #ffc107;
        background: #fffbf0;
      }

      .annie-notification.system {
        border-left: 4px solid #007bff;
      }

      .annie-notification.data-update {
        border-left: 4px solid #28a745;
      }

      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .notification-title {
        font-weight: 600;
        color: #333;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
      }

      .notification-close:hover {
        color: #666;
      }

      .notification-body {
        color: #666;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .notification-time {
        font-size: 12px;
        color: #999;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
        document.head.appendChild(styles);
    }

    private createDataUpdateNotification(data: any): void {
        const notification: Notification = {
            id: `data-update-${Date.now()}`,
            type: 'data-update',
            title: 'Data Updated',
            message: `${data.datasource} has been updated`,
            data: data,
            timestamp: Date.now(),
            priority: 'normal'
        };

        this.handleNotification(notification);
    }

    private triggerSubscriptions(notification: Notification): void {
        this.subscriptions.forEach((subs, key) => {
            subs.forEach(sub => {
                if (this.matchesSubscription(notification, sub)) {
                    sub.callback?.(notification);
                }
            });
        });
    }

    private matchesSubscription(notification: Notification, subscription: NotificationSubscription): boolean {
    // Check type filter
        if (subscription.type && !subscription.type.includes(notification.type)) {
            return false;
        }

        // Check user filter
        if (subscription.userId && notification.userId !== subscription.userId) {
            return false;
        }

        // Check group filter
        if (subscription.groupId && notification.groupId !== subscription.groupId) {
            return false;
        }

        // Check datasource filter (for data-update notifications)
        if (subscription.datasource && notification.type === 'data-update') {
            const notificationDatasource = notification.data?.datasource;
            if (notificationDatasource !== subscription.datasource) {
                return false;
            }
        }

        return true;
    }

    private hasSubscription(datasource: string): boolean {
        for (const subs of this.subscriptions.values()) {
            if (subs.some(sub => sub.datasource === datasource)) {
                return true;
            }
        }
        return false;
    }

    // Public API
    public subscribe(id: string, subscription: NotificationSubscription): void {
        if (!this.subscriptions.has(id)) {
            this.subscriptions.set(id, []);
        }
    this.subscriptions.get(id)!.push(subscription);
    }

    public unsubscribe(id: string): void {
        this.subscriptions.delete(id);
    }

    public async sendNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<void> {
        const fullNotification: Notification = {
            ...notification,
            id: `custom-${Date.now()}`,
            timestamp: Date.now()
        };

        if (this.signalRManager && this.isSignalRConnected) {
            await this.signalRManager.sendNotification(fullNotification);
        } else {
            // Send via API
            await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullNotification)
            });
        }
    }

    public getNotifications(filter?: Partial<Notification>): Notification[] {
        const notifications = Array.from(this.notifications.values());
    
        if (!filter) return notifications;

        return notifications.filter(notification => {
            return Object.entries(filter).every(([key, value]) => {
                return (notification as any)[key] === value;
            });
        });
    }

    public markAsRead(notificationId: string): void {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.read = true;
            this.notifications.set(notificationId, notification);
        }
    }

    public clearNotifications(): void {
        this.notifications.clear();
        const container = document.getElementById('annie-notifications-container');
        if (container) {
            container.replaceChildren();
        }
    }

    public async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) return false;

        if (Notification.permission === 'granted') return true;

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    public destroy(): void {
        this.stopPolling();
        this.subscriptions.clear();
        this.notifications.clear();
    
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        // Remove notification container
        const container = document.getElementById('annie-notifications-container');
        if (container) {
            container.remove();
        }

        // Remove styles
        const styles = document.getElementById('annie-notification-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Extend SignalRManager to support notifications
declare module './signalr-manager.js' {
  interface SignalRManager {
    onNotificationReceived(callback: (notification: Notification) => void): void;
    onDataUpdated(callback: (data: any) => void): void;
    sendNotification(notification: Notification): Promise<void>;
    joinGroup(groupName: string): Promise<void>;
    leaveGroup(groupName: string): Promise<void>;
  }
}
