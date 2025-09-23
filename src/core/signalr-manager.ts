import { ILogger } from './logger.js';
import { 
    SignalRConnection, 
    WindowWithSignalR, 
    NotificationData, 
    DataUpdateEvent 
} from './types.js';

export interface SignalRConfig {
  hubUrl: string;
  sessionId?: string;
  userId?: string;
  enableMouseTracking?: boolean;
  enableRemoteControl?: boolean;
  enableAICommands?: boolean;
}

export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
  sessionId: string;
}

export interface RemoteCommand {
  type: 'navigate' | 'click' | 'input' | 'scroll' | 'ai-command';
  target?: string;
  value?: any;
  coordinates?: { x: number; y: number };
  sessionId: string;
  userId?: string;
  aiPrompt?: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timestamp: number;
}

export class SignalRManager {
    private connection: SignalRConnection | null = null;
    private config: SignalRConfig;
    private logger: ILogger;
    private sessionId: string;
    private isConnected: boolean = false;
    private mouseTracker: MouseTracker | null = null;
    private remoteController: RemoteController | null = null;
    private connectionStateCallbacks: Array<(connected: boolean) => void> = [];
    private notificationCallbacks: Array<(notification: NotificationData) => void> = [];
    private dataUpdateCallbacks: Array<(data: DataUpdateEvent) => void> = [];

    constructor(config: SignalRConfig, logger: ILogger) {
        this.config = config;
        this.logger = logger;
        this.sessionId = config.sessionId || this.generateSessionId();
    }

    async initialize(): Promise<void> {
        try {
            // Load SignalR from CDN if not already loaded
            await this.loadSignalR();
      
            // Create connection
            const signalR = (window as WindowWithSignalR).signalR;
            if (!signalR) {
                throw new Error('SignalR not loaded');
            }
      
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(this.config.hubUrl)
                .build();

            // Set up event handlers
            this.setupEventHandlers();

            // Start connection
            await this.connection.start();
            this.isConnected = true;
            this.notifyConnectionStateChanged(true);

            // Register session
            await this.registerSession();

            // Initialize features
            if (this.config.enableMouseTracking) {
                this.mouseTracker = new MouseTracker(this);
            }

            if (this.config.enableRemoteControl) {
                this.remoteController = new RemoteController(this, this.logger);
            }

            this.logger.info(`SignalR connected with session: ${this.sessionId}`);
        } catch (error) {
            this.logger.error(`SignalR connection failed: ${error}`);
            // Emit custom event for error boundary
            window.dispatchEvent(new CustomEvent('signalr-error', {
                detail: { message: `SignalR connection failed: ${error}`, error, context: 'initialization' }
            }));
            throw error;
        }
    }

    private async loadSignalR(): Promise<void> {
        if ((window as any).signalR) {
            return; // Already loaded
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@microsoft/signalr@latest/dist/browser/signalr.min.js';
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () => reject(new Error('Failed to load SignalR')));
            document.head.appendChild(script);
        });
    }

    private setupEventHandlers(): void {
        if (!this.connection) return;
    
        // Handle incoming remote commands
        this.connection.on('ReceiveRemoteCommand', (...args: unknown[]) => {
            const command = args[0] as RemoteCommand;
            this.handleRemoteCommand(command);
        });

        // Handle AI-generated commands
        this.connection.on('ReceiveAICommand', (...args: unknown[]) => {
            const command = args[0] as RemoteCommand;
            this.handleAICommand(command);
        });

        // Handle mouse positions from other sessions
        this.connection.on('ReceiveMousePosition', (...args: unknown[]) => {
            const position = args[0] as MousePosition;
            this.displayRemoteMouse(position);
        });

        // Handle session management
        this.connection.on('SessionJoined', (...args: unknown[]) => {
            const sessionInfo = args[0] as SessionInfo;
            this.logger.info(`Session joined: ${sessionInfo.sessionId}`);
        });

        this.connection.on('SessionLeft', (...args: unknown[]) => {
            const sessionId = args[0] as string;
            this.logger.info(`Session left: ${sessionId}`);
        });

        // Handle notifications
        this.connection.on('ReceiveNotification', (...args: unknown[]) => {
            const notification = args[0] as NotificationData;
            this.notifyNotificationReceived(notification);
        });

        // Handle data updates
        this.connection.on('DataUpdated', (...args: unknown[]) => {
            const data = args[0] as DataUpdateEvent;
            this.notifyDataUpdated(data);
        });

        // Handle connection events
        this.connection.onclose(() => {
            this.isConnected = false;
            this.notifyConnectionStateChanged(false);
            this.logger.warn('SignalR connection closed');
            this.attemptReconnect();
        });

        this.connection.onreconnecting(() => {
            this.logger.info('SignalR reconnecting...');
        });

        this.connection.onreconnected(() => {
            this.isConnected = true;
            this.notifyConnectionStateChanged(true);
            this.logger.info('SignalR reconnected');
        });
    }

    private async registerSession(): Promise<void> {
        if (!this.connection) {
            throw new Error('SignalR connection not established');
        }

        const sessionInfo: SessionInfo = {
            sessionId: this.sessionId,
            userId: this.config.userId || 'anonymous',
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timestamp: Date.now()
        };

        await this.connection.invoke('RegisterSession', sessionInfo);
    }

    private handleRemoteCommand(command: RemoteCommand): void {
        if (this.remoteController) {
            this.remoteController.executeCommand(command);
        }
    }

    private handleAICommand(command: RemoteCommand): void {
        this.logger.info(`Executing AI command: ${command.aiPrompt}`);
        if (this.remoteController) {
            this.remoteController.executeCommand(command);
        }
    }

    private displayRemoteMouse(position: MousePosition): void {
    // Show remote cursor position
        let remoteCursor = document.getElementById('remote-cursor');
        if (!remoteCursor) {
            remoteCursor = document.createElement('div');
            remoteCursor.id = 'remote-cursor';
            remoteCursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: red;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transition: all 0.1s ease;
      `;
            document.body.appendChild(remoteCursor);
        }

        remoteCursor.style.left = position.x + 'px';
        remoteCursor.style.top = position.y + 'px';
    }

    // Public API
    async sendMousePosition(x: number, y: number): Promise<void> {
        if (!this.isConnected || !this.connection) return;

        const position: MousePosition = {
            x,
            y,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };

        await this.connection.invoke('SendMousePosition', position);
    }

    async sendRemoteCommand(command: RemoteCommand): Promise<void> {
        if (!this.isConnected || !this.connection) return;

        command.sessionId = this.sessionId;
        await this.connection.invoke('SendRemoteCommand', command);
    }

    async sendAICommand(prompt: string, targetSessionId?: string): Promise<void> {
        if (!this.isConnected || !this.connection) return;

        const command: RemoteCommand = {
            type: 'ai-command',
            aiPrompt: prompt,
            sessionId: targetSessionId || this.sessionId,
            userId: this.config.userId
        };

        await this.connection.invoke('SendAICommand', command);
    }

    getSessionId(): string {
        return this.sessionId;
    }

    isConnectionActive(): boolean {
        return this.isConnected;
    }

    private generateSessionId(): string {
        return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    private async attemptReconnect(): Promise<void> {
    // Implement exponential backoff reconnection logic
        let attempts = 0;
        const maxAttempts = 5;
    
        while (attempts < maxAttempts && !this.isConnected) {
            try {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
                if (this.connection) {
                    await this.connection.start();
                    this.isConnected = true;
                    await this.registerSession();
                    this.logger.info('SignalR reconnected successfully');
                    break;
                }
            } catch (error) {
                attempts++;
                this.logger.warn(`Reconnection attempt ${attempts} failed: ${error}`);
                // Emit custom event for error boundary on final failure
                if (attempts >= maxAttempts) {
                    window.dispatchEvent(new CustomEvent('signalr-error', {
                        detail: { message: `All reconnection attempts failed: ${error}`, error, context: 'reconnection-failed' }
                    }));
                }
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.connection && this.isConnected) {
            await this.connection.stop();
            this.isConnected = false;
        }

        if (this.mouseTracker) {
            this.mouseTracker.stop();
        }

        // Remove remote cursor
        const remoteCursor = document.getElementById('remote-cursor');
        if (remoteCursor) {
            remoteCursor.remove();
        }
    }

    // Notification methods for NotificationManager integration
    onConnectionStateChanged(callback: (connected: boolean) => void): void {
        this.connectionStateCallbacks.push(callback);
    }

    onNotificationReceived(callback: (notification: any) => void): void {
        this.notificationCallbacks.push(callback);
    }

    onDataUpdated(callback: (data: any) => void): void {
        this.dataUpdateCallbacks.push(callback);
    }

    async sendNotification(notification: any): Promise<void> {
        if (this.connection && this.isConnected) {
            try {
                await this.connection.invoke('SendNotification', notification);
            } catch (error) {
                this.logger.error(`Failed to send notification: ${error}`);
            }
        }
    }

    async joinGroup(groupName: string): Promise<void> {
        if (this.connection && this.isConnected) {
            try {
                await this.connection.invoke('JoinGroup', groupName);
                this.logger.info(`Joined notification group: ${groupName}`);
            } catch (error) {
                this.logger.error(`Failed to join group ${groupName}: ${error}`);
            }
        }
    }

    async leaveGroup(groupName: string): Promise<void> {
        if (this.connection && this.isConnected) {
            try {
                await this.connection.invoke('LeaveGroup', groupName);
                this.logger.info(`Left notification group: ${groupName}`);
            } catch (error) {
                this.logger.error(`Failed to leave group ${groupName}: ${error}`);
            }
        }
    }

    private notifyConnectionStateChanged(connected: boolean): void {
        this.connectionStateCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                this.logger.error(`Connection state callback error: ${error}`);
                // Emit custom event for error boundary
                window.dispatchEvent(new CustomEvent('signalr-error', {
                    detail: { message: `Connection state callback error: ${error}`, error, context: 'connection-callback' }
                }));
            }
        });
    }

    private notifyNotificationReceived(notification: any): void {
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                this.logger.error(`Notification callback error: ${error}`);
                // Emit custom event for error boundary
                window.dispatchEvent(new CustomEvent('signalr-error', {
                    detail: { message: `Notification callback error: ${error}`, error, context: 'notification-callback' }
                }));
            }
        });
    }

    private notifyDataUpdated(data: any): void {
        this.dataUpdateCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.logger.error(`Data update callback error: ${error}`);
                // Emit custom event for error boundary
                window.dispatchEvent(new CustomEvent('signalr-error', {
                    detail: { message: `Data update callback error: ${error}`, error, context: 'data-update-callback' }
                }));
            }
        });
    }
}

class MouseTracker {
    private signalRManager: SignalRManager;
    private throttleMs: number = 50; // Throttle to 20fps
    private lastSent: number = 0;

    constructor(signalRManager: SignalRManager) {
        this.signalRManager = signalRManager;
        this.start();
    }

    private start(): void {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    private handleMouseMove(event: MouseEvent): void {
        const now = Date.now();
        if (now - this.lastSent < this.throttleMs) {
            return;
        }

        this.lastSent = now;
        this.signalRManager.sendMousePosition(event.clientX, event.clientY);
    }

    stop(): void {
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    }
}

class RemoteController {
    private signalRManager: SignalRManager;
    private logger: ILogger;

    constructor(signalRManager: SignalRManager, logger: ILogger) {
        this.signalRManager = signalRManager;
        this.logger = logger;
    }

    executeCommand(command: RemoteCommand): void {
        this.logger.info(`Executing remote command: ${command.type}`);

        switch (command.type) {
        case 'navigate':
            this.navigate(command.target!);
            break;
        case 'click':
            this.click(command.coordinates!);
            break;
        case 'input':
            this.input(command.target!, command.value);
            break;
        case 'scroll':
            this.scroll(command.coordinates!);
            break;
        case 'ai-command':
            this.executeAICommand(command.aiPrompt!);
            break;
        }
    }

    private navigate(target: string): void {
    // Use Annie's router if available
        if ((window as any).annie) {
            (window as any).annie.navigateTo(target);
        } else {
            // Fallback to manual navigation
            const targetElement = document.getElementById(target);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    private click(coordinates: { x: number; y: number }): void {
        const element = document.elementFromPoint(coordinates.x, coordinates.y);
        if (element) {
            // Highlight the element briefly
            this.highlightElement(element as HTMLElement);
      
            // Simulate click
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: coordinates.x,
                clientY: coordinates.y
            });
            element.dispatchEvent(clickEvent);
        }
    }

    private input(selector: string, value: any): void {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (element) {
            this.highlightElement(element);
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    private scroll(coordinates: { x: number; y: number }): void {
        window.scrollTo({
            left: coordinates.x,
            top: coordinates.y,
            behavior: 'smooth'
        });
    }

    private executeAICommand(prompt: string): void {
    // Parse AI command and execute appropriate action
        const lowerPrompt = prompt.toLowerCase();
    
        if (lowerPrompt.includes('navigate to') || lowerPrompt.includes('go to')) {
            const match = lowerPrompt.match(/(?:navigate to|go to)\s+(\w+)/);
            if (match) {
                this.navigate(match[1]);
            }
        } else if (lowerPrompt.includes('click')) {
            const match = lowerPrompt.match(/click\s+(.+)/);
            if (match) {
                const selector = match[1].trim();
                const element = document.querySelector(selector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    this.click({
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    });
                }
            }
        } else if (lowerPrompt.includes('type') || lowerPrompt.includes('enter')) {
            const match = lowerPrompt.match(/(?:type|enter)\s+"([^"]+)"\s+(?:in|into)\s+(.+)/);
            if (match) {
                this.input(match[2].trim(), match[1]);
            }
        }
    }

    private highlightElement(element: HTMLElement): void {
        const originalStyle = element.style.cssText;
        element.style.cssText += `
      outline: 3px solid #ff4444 !important;
      outline-offset: 2px !important;
      background-color: rgba(255, 68, 68, 0.1) !important;
    `;

        setTimeout(() => {
            element.style.cssText = originalStyle;
        }, 1000);
    }
}
