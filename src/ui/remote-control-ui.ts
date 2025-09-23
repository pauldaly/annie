import { SignalRManager, SessionInfo } from '../core/signalr-manager.js';
import { AICommandProcessor } from './ai-command-processor.js';
import { ILogger } from '../core/logger.js';

export interface RemoteControlConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsed: boolean;
  showMouseCursor: boolean;
  enableVoiceControl: boolean;
}

export class RemoteControlUI {
    private signalRManager: SignalRManager;
    private aiProcessor: AICommandProcessor;
    private logger: ILogger;
    private config: RemoteControlConfig;
    private container: HTMLElement | null = null;
    private isCollapsed: boolean;
    private activeSessions: Map<string, SessionInfo> = new Map();

    constructor(
        signalRManager: SignalRManager, 
        aiProcessor: AICommandProcessor, 
        config: RemoteControlConfig,
        logger: ILogger
    ) {
        this.signalRManager = signalRManager;
        this.aiProcessor = aiProcessor;
        this.logger = logger;
        this.config = config;
        this.isCollapsed = config.collapsed;
    }

    initialize(): void {
        this.createUI();
        this.setupEventListeners();
        this.logger.info('Remote Control UI initialized');
    }

    private createUI(): void {
    // Create main container
        this.container = document.createElement('div');
        this.container.id = 'annie-remote-control';
        this.container.innerHTML = this.getUITemplate();
    
        // Apply styles
        this.applyStyles();
    
        // Position the container
        this.positionContainer();
    
        document.body.appendChild(this.container);
    }

    private getUITemplate(): string {
        return `
      <div data-component="arc-header">
        <div data-component="arc-title">
          <span data-icon="arc">🎮</span>
          Annie Remote Control
        </div>
        <div data-component="arc-controls">
          <button data-button="voice" data-action="toggle-voice">
            <span data-icon="voice">🎤</span>
          </button>
          <button data-button="collapse" data-action="toggle-collapse">
            <span data-icon="collapse">${this.isCollapsed ? '📖' : '📕'}</span>
          </button>
        </div>
      </div>
      
      <div data-component="arc-content" data-state="${this.isCollapsed ? 'collapsed' : 'expanded'}">
        <!-- Session Status -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">Session Status</div>
          <div data-component="arc-session-info">
            <div data-component="arc-status">
              <span data-status="${this.signalRManager.isConnectionActive() ? 'connected' : 'disconnected'}"></span>
              <span data-component="arc-status-text">
                ${this.signalRManager.isConnectionActive() ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div data-component="arc-session-id">
              Session: <code>${this.signalRManager.getSessionId()}</code>
              <button data-button="small" data-action="copy-session">📋</button>
            </div>
          </div>
        </div>

        <!-- Quick Commands -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">Quick Commands</div>
          <div data-component="arc-quick-commands">
            <button data-button data-action="demo">🎯 Run Demo</button>
            <button data-button data-action="show-mouse">👆 Toggle Mouse</button>
            <button data-button data-action="take-screenshot">📸 Screenshot</button>
          </div>
        </div>

        <!-- Command Input -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">AI Commands</div>
          <div data-component="arc-command-input">
            <input type="text" 
                   data-input="command" 
                   placeholder="Enter command (e.g., 'navigate to home')"
                   data-input="command">
            <button data-button data-action="execute-command">▶️</button>
          </div>
          <div data-component="arc-voice-status"></div>
        </div>

        <!-- Active Sessions -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">Active Sessions</div>
          <div data-component="arc-sessions-list">
            <div data-component="arc-no-sessions">No other sessions active</div>
          </div>
        </div>

        <!-- Demo Commands -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">Demo Commands</div>
          <div data-component="arc-demo-commands">
            ${this.aiProcessor.getDemoCommands().map((cmd, index) => 
        `<button data-button="demo" data-demo-command="${cmd}">${index + 1}. ${cmd}</button>`
    ).join('')}
          </div>
        </div>

        <!-- Help -->
        <div data-component="arc-section">
          <div data-component="arc-section-title">Help</div>
          <div data-component="arc-help">
            <div data-component="arc-help-item">
              <strong>Voice Commands:</strong> Click microphone to start/stop
            </div>
            <div data-component="arc-help-item">
              <strong>SMS Commands:</strong> Text commands to configured number
            </div>
            <div data-component="arc-help-item">
              <strong>Session Control:</strong> Share session ID for remote control
            </div>
          </div>
        </div>
      </div>
    `;
    }

    private applyStyles(): void {
        if (!document.getElementById('annie-remote-control-styles')) {
            const styles = document.createElement('style');
            styles.id = 'annie-remote-control-styles';
            styles.textContent = `
        #annie-remote-control {
          position: fixed;
          width: 320px;
          max-height: 80vh;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          z-index: 999999;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .arc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: move;
        }

        .arc-title {
          display: flex;
          align-items: center;
          font-weight: 600;
          gap: 8px;
        }

        .arc-controls {
          display: flex;
          gap: 4px;
        }

        .arc-btn {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        .arc-btn:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .arc-btn-small {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px 4px;
          font-size: 10px;
        }

        .arc-content {
          max-height: 70vh;
          overflow-y: auto;
          transition: all 0.3s ease;
        }

        .arc-content.collapsed {
          max-height: 0;
          overflow: hidden;
        }

        .arc-section {
          padding: 12px;
          border-bottom: 1px solid #f1f3f4;
        }

        .arc-section:last-child {
          border-bottom: none;
        }

        .arc-section-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: #495057;
        }

        .arc-session-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .arc-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .arc-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc3545;
        }

        .arc-status-indicator.connected {
          background: #28a745;
        }

        .arc-session-id {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
        }

        .arc-session-id code {
          background: #f8f9fa;
          padding: 2px 4px;
          border-radius: 2px;
          font-family: monospace;
        }

        .arc-quick-commands {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }

        .arc-command-input {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }

        .arc-input {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 11px;
        }

        .arc-voice-status {
          font-size: 10px;
          color: #6c757d;
          min-height: 14px;
        }

        .arc-voice-status.listening {
          color: #dc3545;
        }

        .arc-demo-commands {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .arc-demo-btn {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 3px;
          padding: 4px 6px;
          cursor: pointer;
          font-size: 10px;
          text-align: left;
          transition: all 0.2s ease;
        }

        .arc-demo-btn:hover {
          background: #e3f2fd;
          border-color: #2196f3;
        }

        .arc-sessions-list {
          font-size: 10px;
          color: #6c757d;
        }

        .arc-help {
          font-size: 10px;
          color: #6c757d;
        }

        .arc-help-item {
          margin-bottom: 4px;
        }

        .arc-voice-btn.active {
          background: #dc3545;
          color: white;
        }
      `;
            document.head.appendChild(styles);
        }
    }

    private positionContainer(): void {
        if (!this.container) return;

        const positions = {
            'top-left': { top: '20px', left: '20px' },
            'top-right': { top: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' }
        };

        const pos = positions[this.config.position];
        Object.assign(this.container.style, pos);
    }

    private setupEventListeners(): void {
        if (!this.container) return;

        // Make draggable
        this.makeDraggable();

        // Button click handlers
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');
      
            if (action) {
                this.handleAction(action, target);
            }

            // Demo command buttons
            const demoCommand = target.getAttribute('data-demo-command');
            if (demoCommand) {
                this.executeDemoCommand(demoCommand);
            }
        });

        // Command input
        const commandInput = this.container.querySelector('[data-input="command"]') as HTMLInputElement;
        if (commandInput) {
            commandInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.executeCommand(commandInput.value);
                    commandInput.value = '';
                }
            });
        }
    }

    private makeDraggable(): void {
        if (!this.container) return;

        const header = this.container.querySelector('[data-component="arc-header"]') as HTMLElement;
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;

        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
            isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.container) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
        
                this.container.style.left = currentX + 'px';
                this.container.style.top = currentY + 'px';
                this.container.style.right = 'auto';
                this.container.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    private async handleAction(action: string, target: HTMLElement): Promise<void> {
        switch (action) {
        case 'toggle-collapse':
            this.toggleCollapse();
            break;
        case 'toggle-voice':
            this.toggleVoiceControl(target);
            break;
        case 'copy-session':
            await this.copySessionId();
            break;
        case 'demo':
            await this.runDemo();
            break;
        case 'show-mouse':
            this.toggleMouseDisplay();
            break;
        case 'take-screenshot':
            await this.takeScreenshot();
            break;
        case 'execute-command':
            const input = this.container!.querySelector('[data-input="command"]') as HTMLInputElement;
            await this.executeCommand(input.value);
            input.value = '';
            break;
        }
    }

    private toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
        const content = this.container!.querySelector('[data-component="arc-content"]') as HTMLElement;
        const icon = this.container!.querySelector('[data-icon="collapse"]') as HTMLElement;
    
        content.setAttribute('data-state', this.isCollapsed ? 'collapsed' : 'expanded');
        icon.textContent = this.isCollapsed ? '📖' : '📕';
    }

    private toggleVoiceControl(button: HTMLElement): void {
        if (button.getAttribute('data-state') === 'active') {
            this.aiProcessor.stopListening();
            button.setAttribute('data-state', 'inactive');
            this.updateVoiceStatus('');
        } else {
            this.aiProcessor.startListening();
            button.setAttribute('data-state', 'active');
            this.updateVoiceStatus('🎤 Listening for voice commands...');
        }
    }

    private async copySessionId(): Promise<void> {
        const sessionId = this.signalRManager.getSessionId();
        await navigator.clipboard.writeText(sessionId);
    
        // Show feedback
        const button = this.container!.querySelector('[data-action="copy-session"]') as HTMLElement;
        const originalText = button.textContent;
        button.textContent = '✅';
        setTimeout(() => {
            button.textContent = originalText;
        }, 1000);
    }

    private async runDemo(): Promise<void> {
        const demoCommands = this.aiProcessor.getDemoCommands();
        await this.aiProcessor.runDemo(demoCommands, 2000);
    }

    private toggleMouseDisplay(): void {
        this.config.showMouseCursor = !this.config.showMouseCursor;
        // Implementation would toggle mouse cursor visibility
        this.logger.info(`Mouse cursor display: ${this.config.showMouseCursor ? 'ON' : 'OFF'}`);
    }

    private async takeScreenshot(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true,
                audio: false
            });
      
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
      
            video.addEventListener('loadedmetadata', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
        
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(video, 0, 0);
        
                // Convert to blob and send via SignalR
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        // Would send screenshot via SignalR
                        this.logger.info('Screenshot captured');
                    }
                });
        
                stream.getTracks().forEach(track => track.stop());
            });
        } catch (error) {
            this.logger.error(`Screenshot failed: ${error}`);
        }
    }

    private async executeCommand(command: string): Promise<void> {
        if (!command.trim()) return;
    
        this.logger.info(`Executing command: ${command}`);
        await this.aiProcessor.processTextCommand(command);
    }

    private async executeDemoCommand(command: string): Promise<void> {
        await this.aiProcessor.processTextCommand(command);
    }

    private updateVoiceStatus(status: string): void {
        const statusElement = this.container!.querySelector('[data-component="arc-voice-status"]') as HTMLElement;
        statusElement.textContent = status;
        statusElement.setAttribute('data-state', status ? 'listening' : 'idle');
    }

    updateConnectionStatus(connected: boolean): void {
        if (!this.container) return;

        const indicator = this.container.querySelector('[data-status]') as HTMLElement;
        const statusText = this.container.querySelector('[data-component="arc-status-text"]') as HTMLElement;
    
        indicator.setAttribute('data-status', connected ? 'connected' : 'disconnected');
        statusText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    addActiveSession(sessionInfo: SessionInfo): void {
        this.activeSessions.set(sessionInfo.sessionId, sessionInfo);
        this.updateSessionsList();
    }

    removeActiveSession(sessionId: string): void {
        this.activeSessions.delete(sessionId);
        this.updateSessionsList();
    }

    private updateSessionsList(): void {
        if (!this.container) return;

        const sessionsList = this.container.querySelector('[data-component="arc-sessions-list"]') as HTMLElement;
    
        if (this.activeSessions.size === 0) {
            sessionsList.innerHTML = '<div data-component="arc-no-sessions">No other sessions active</div>';
        } else {
            const sessionsHtml = Array.from(this.activeSessions.values()).map(session => `
        <div data-component="arc-session-item">
          <strong>${session.userId}</strong>
          <div>Session: ${session.sessionId}</div>
          <div>URL: ${session.url}</div>
        </div>
      `).join('');
      
            sessionsList.innerHTML = sessionsHtml;
        }
    }

    destroy(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        const styles = document.getElementById('annie-remote-control-styles');
        if (styles) {
            styles.remove();
        }
    }
}
