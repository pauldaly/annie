import { ILogger } from '../core/logger.js';
import { SignalRManager } from '../core/signalr-manager.js';

export interface AICommandConfig {
  openAIApiKey?: string;
  enableVoiceCommands?: boolean;
  enableSMSCommands?: boolean;
  twilioConfig?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

export interface AICommand {
  intent: 'navigate' | 'click' | 'input' | 'scroll' | 'wait' | 'complex' | 'select';
  target?: string;
  value?: any;
  coordinates?: { x: number; y: number };
  description: string;
  confidence: number;
  element?: Element; // Reference to actual DOM element
}

export interface MatchCandidate {
  element: Element;
  text: string;
  id?: string;
  score: number;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'phonetic';
}

export class AICommandProcessor {
    private config: AICommandConfig;
    private signalRManager?: SignalRManager;
    private logger: ILogger;
    private recognition: any = null; // SpeechRecognition
    private isListening: boolean = false;
    private hasLoggedReady: boolean = false;
    private manualStop: boolean = false;
    private voiceEnabled: boolean = false; // User wants voice on/off
    private pollingInterval: any = null; // Auto-restart polling
    private pendingDisambiguation: MatchCandidate[] = []; // For "say 1, 2, etc" selection

    constructor(config: AICommandConfig, signalRManager: SignalRManager | undefined, logger: ILogger) {
        this.config = config;
        this.signalRManager = signalRManager;
        this.logger = logger;
    }

    async initialize(): Promise<void> {
        if (this.config.enableVoiceCommands !== false) {  // Initialize unless explicitly disabled
            await this.initializeSpeechRecognition();
            // Voice starts OFF - user controls when to start
        }
        const status = this.config.enableVoiceCommands !== false ? 'ready but OFF' : 'disabled';
        this.logger.info(`AI Command Processor initialization complete - Voice commands ${status}`);
    }

    private async initializeSpeechRecognition(): Promise<void> {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
        if (!SpeechRecognition) {
            this.logger.warn('Speech recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
            console.log('🎙️ Speech result event fired, results length:', event.results.length);
            this.logger.info(`🎙️ Speech result event fired, results length: ${event.results.length}`);
            const last = event.results.length - 1;
            const result = event.results[last];
            
            if (result.isFinal) {
                const transcript = result[0].transcript.trim();
                console.log(`🎤 Voice heard (FINAL): "${transcript}"`);
                this.logger.info(`🎤 Voice heard (FINAL): "${transcript}"`);
                this.processVoiceCommand(transcript);
            } else {
                // Show interim results so you can see speech being captured
                const interim = result[0].transcript.trim();
                if (interim.length > 0) {
                    console.log(`🎙️ Voice capturing: "${interim}" (interim)`);
                    this.logger.info(`🎙️ Voice capturing: "${interim}" (interim)`);
                }
            }
        };

        this.recognition.onerror = (event: any) => {
            this.logger.error(`Speech error: ${event.error}`);
            this.isListening = false;
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.logger.info('🔇 Browser speech recognition ENDED - Microphone stopped');
            // Auto-restart if voice is enabled and not manually stopped
            if (this.voiceEnabled && !this.manualStop) {
                setTimeout(() => {
                    if (this.voiceEnabled && !this.isListening) {
                        this.logger.info('🔄 Auto-restarting speech recognition...');
                        this.recognition.start();
                    }
                }, 100);
            }
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            this.logger.info('🎤 Browser speech recognition STARTED - Microphone is active');
        };

        // Don't auto-start anymore
    }

    startListening(): void {        
        console.log('🎤 AI Command Processor startListening() called');
        console.log('Recognition object exists:', !!this.recognition);
        console.log('Current isListening state:', this.isListening);
        
        if (!this.recognition) {
            console.log('❌ Speech recognition not initialized');
            this.logger.warn('❌ Speech recognition not initialized');
            return;
        }

        this.voiceEnabled = true;
        this.manualStop = false;
        console.log('🎤 Voice recognition STARTED - Listening for commands');
        this.logger.info('🎤 Voice recognition STARTED - Listening for commands');
        
        if (!this.isListening) {
            try {
                console.log('🎤 About to call recognition.start()');
                this.recognition.start();
                console.log('🎤 recognition.start() called successfully');
            } catch (error) {
                console.error('❌ Failed to start speech recognition:', error);
                this.logger.error(`Failed to start speech recognition: ${error}`);
            }
        } else {
            console.log('🎤 Already listening, skipping start');
        }

        // Start polling to monitor status
        this.startPolling();
        console.log('🎤 Polling started');
    }

    stopListening(): void {
        this.voiceEnabled = false;
        this.manualStop = true;
        this.logger.info('🔇 Voice recognition STOPPED');
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }

        // Stop polling
        this.stopPolling();
    }

    private startPolling(): void {
        // Clear any existing polling
        this.stopPolling();
        
        this.pollingInterval = setInterval(() => {
            if (this.voiceEnabled && !this.isListening && !this.manualStop) {
                // Silently restart - no logging to avoid spam
                try {
                    this.recognition.start();
                } catch {
                    // Ignore restart errors
                }
            }
        }, 1000); // Check every second
    }

    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Add method to toggle listening
    toggleListening(): void {
        if (this.voiceEnabled) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    // Add method to check if voice is enabled
    isVoiceEnabled(): boolean {
        return this.voiceEnabled;
    }

    // Test the matching system with a target phrase
    testMatching(target: string, intent: string = 'click'): MatchCandidate[] {
        this.logger.info(`🧪 Testing matches for "${target}" with intent "${intent}"`);
        const matches = this.findElementMatches(target, intent);
        
        console.log(`🧪 Testing matches for "${target}":`);
        matches.forEach((match, index) => {
            console.log(`  ${index + 1}: "${match.text}" (${match.matchType}, score: ${match.score.toFixed(3)})`);
        });

        return matches;
    }

    // Get current page elements for testing
    getPageElements(): { menuItems: string[], buttons: string[], inputs: string[] } {
        const result = {
            menuItems: [] as string[],
            buttons: [] as string[],
            inputs: [] as string[]
        };

        // Get navigation elements
        const navElements = this.getAllElements(['nav a', '[role="menuitem"]', '.nav-link', 'header a']);
        result.menuItems = navElements.map(el => this.getElementText(el)).filter(text => text.length > 0);

        // Get clickable elements
        const clickElements = this.getAllElements(['button', '[role="button"]', '.btn']);
        result.buttons = clickElements.map(el => this.getElementText(el)).filter(text => text.length > 0);

        // Get input elements
        const inputElements = this.getAllElements(['input', 'textarea', 'select']);
        result.inputs = inputElements.map(el => {
            const text = this.getElementText(el);
            const name = el.getAttribute('name') || el.getAttribute('id') || '';
            return text || name;
        }).filter(text => text.length > 0);

        console.log('📄 Current page elements:', result);
        return result;
    }

    // Clear any pending disambiguation
    clearDisambiguation(): void {
        this.pendingDisambiguation = [];
        this.logger.info('🧹 Cleared pending disambiguation');
    }

    async processTextCommand(text: string): Promise<AICommand[]> {
        try {
            // Parse natural language into structured commands
            const commands = await this.parseNaturalLanguage(text);
      
            // Log and execute commands
            if (commands.length > 0) {
                this.logger.info(`🎙️ Recognized commands: ${commands.map(c => c.description).join(', ')}`);
                
                // Execute each command
                for (const command of commands) {
                    if (command.intent !== 'select') { // Don't execute disambiguation prompts
                        await this.executeCommand(command);
                    }
                }
            } else {
                this.logger.info(`🎙️ Voice heard but no commands recognized: "${text}"`);
            }

            return commands;
        } catch (error) {
            this.logger.error(`Failed to process text command: ${error}`);
            return [];
        }
    }

    // Execute a parsed command
    private async executeCommand(command: AICommand): Promise<void> {
        this.logger.info(`🎯 Executing: ${command.description}`);
        
        try {
            switch (command.intent) {
                case 'navigate':
                case 'click':
                    await this.executeClick(command);
                    break;
                case 'input':
                    await this.executeInput(command);
                    break;
                case 'scroll':
                    await this.executeScroll(command);
                    break;
                case 'wait':
                    await this.executeWait(command);
                    break;
                default:
                    this.logger.warn(`Unknown command intent: ${command.intent}`);
            }
        } catch (error) {
            this.logger.error(`Failed to execute command: ${error}`);
        }
    }

    private async executeClick(command: AICommand): Promise<void> {
        // Use the matched element if available, otherwise fall back to selector
        const element = command.element || 
                       (command.target ? document.querySelector(command.target) : null);

        if (element && element instanceof HTMLElement) {
            this.logger.info(`👆 Clicking: "${element.textContent?.trim() || command.target}"`);
            element.click();
        } else {
            this.logger.warn(`❌ Click target not found: ${command.target}`);
        }
    }

    private async executeInput(command: AICommand): Promise<void> {
        if (!command.target || command.value === undefined) return;

        const element = command.element || document.querySelector(command.target);
        if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
            this.logger.info(`⌨️ Typing "${command.value}" into ${command.target}`);
            element.focus();
            element.value = command.value;
            
            // Trigger input events to notify frameworks
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            this.logger.warn(`❌ Input target not found: ${command.target}`);
        }
    }

    private async executeScroll(command: AICommand): Promise<void> {
        if (command.coordinates) {
            this.logger.info(`📜 Scrolling to ${command.coordinates.x}, ${command.coordinates.y}`);
            window.scrollTo(command.coordinates.x, command.coordinates.y);
        }
    }

    private async executeWait(command: AICommand): Promise<void> {
        if (command.value) {
            this.logger.info(`⏳ Waiting ${command.value}ms`);
            await new Promise(resolve => setTimeout(resolve, command.value));
        }
    }

    private async processVoiceCommand(transcript: string): Promise<void> {
        await this.processTextCommand(transcript);
    }

    private async parseNaturalLanguage(text: string): Promise<AICommand[]> {
        const commands: AICommand[] = [];
        const lowerText = text.toLowerCase().trim();

        // Handle disambiguation responses first (1, 2, 3, "select one", etc.)
        if (this.pendingDisambiguation.length > 0) {
            const disambiguationResult = this.handleDisambiguation(lowerText);
            if (disambiguationResult) {
                this.pendingDisambiguation = []; // Clear pending
                return [disambiguationResult];
            }
        }

        // Parse command intent and target
        const intent = this.extractIntent(lowerText);
        if (!intent) {
            this.logger.info(`🤷 No recognizable command intent in: "${text}"`);
            return commands;
        }

        const target = this.extractTarget(lowerText, intent.type);
        if (!target) {
            this.logger.info(`🎯 No target specified for ${intent.type} command: "${text}"`);
            return commands;
        }

        // Find matching elements based on the target
        const matches = this.findElementMatches(target, intent.type);
        
        if (matches.length === 0) {
            this.logger.warn(`❌ No matches found for "${target}"`);
            return commands;
        }

        if (matches.length === 1) {
            // Single match - execute directly
            const match = matches[0];
            commands.push({
                intent: intent.type,
                target: match.text,
                element: match.element,
                description: `${intent.type} "${match.text}" (${match.matchType} match, score: ${match.score.toFixed(2)})`,
                confidence: match.score
            });
        } else {
            // Multiple matches - present options for disambiguation
            this.presentDisambiguationOptions(matches, intent.type);
            this.pendingDisambiguation = matches;
            
            commands.push({
                intent: 'select',
                description: `Found ${matches.length} options for "${target}". Say a number to select.`,
                confidence: 0.9
            });
        }

        return commands;
    }

    // Extract command intent from text
    private extractIntent(text: string): { type: AICommand['intent'], confidence: number } | null {
        const patterns = {
            navigate: /(?:navigate to|go to|visit|open)/,
            click: /(?:click|press|tap|select|choose)/,
            input: /(?:type|enter|input|fill)/,
            scroll: /(?:scroll|page)/,
            wait: /(?:wait|pause|delay)/
        };

        for (const [intent, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return { type: intent as AICommand['intent'], confidence: 0.9 };
            }
        }

        return null;
    }

    // Extract target from text based on intent
    private extractTarget(text: string, intent: string): string | null {
        const patterns = {
            navigate: /(?:navigate to|go to|visit|open)\s+(.+?)(?:\s+(?:page|section))?$/,
            click: /(?:click|press|tap|select|choose)(?:\s+on)?\s+(.+?)(?:\s+(?:button|link|item))?$/,
            input: /(?:type|enter|input|fill)\s+"?([^"]+)"?(?:\s+(?:in|into|to))?/,
            scroll: /scroll\s+(up|down|to|top|bottom)/,
            wait: /wait\s+(\d+)/
        };

        const pattern = patterns[intent as keyof typeof patterns];
        if (!pattern) return null;

        const match = text.match(pattern);
        return match ? match[1].trim() : null;
    }

    // Find matching elements using multiple strategies
    private findElementMatches(target: string, intent: string): MatchCandidate[] {
        const matches: MatchCandidate[] = [];
        const selectors = this.getSelectorsForIntent(intent);

        // Get all potential elements
        const elements = this.getAllElements(selectors);

        for (const element of elements) {
            const elementText = this.getElementText(element);
            const elementId = element.id;
            
            if (!elementText && !elementId) continue;

            // 1. Exact match (highest priority)
            if (elementText.toLowerCase() === target.toLowerCase() || 
                elementId.toLowerCase() === target.toLowerCase()) {
                matches.push({
                    element,
                    text: elementText || elementId,
                    id: elementId,
                    score: 1.0,
                    matchType: 'exact'
                });
                continue;
            }

            // 2. Normalized match
            const normalizedScore = this.calculateNormalizedMatch(target, elementText, elementId);
            if (normalizedScore > 0.8) {
                matches.push({
                    element,
                    text: elementText || elementId,
                    id: elementId,
                    score: normalizedScore,
                    matchType: 'normalized'
                });
                continue;
            }

            // 3. Fuzzy match
            const fuzzyScore = this.calculateFuzzyMatch(target, elementText);
            if (fuzzyScore > 0.6) {
                matches.push({
                    element,
                    text: elementText || elementId,
                    id: elementId,
                    score: fuzzyScore,
                    matchType: 'fuzzy'
                });
                continue;
            }

            // 4. Phonetic match
            const phoneticScore = this.calculatePhoneticMatch(target, elementText);
            if (phoneticScore > 0.7) {
                matches.push({
                    element,
                    text: elementText || elementId,
                    id: elementId,
                    score: phoneticScore,
                    matchType: 'phonetic'
                });
            }
        }

        // Sort by score (highest first) and return top 5
        return matches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }

    // Get appropriate selectors based on command intent
    private getSelectorsForIntent(intent: string): string[] {
        const selectorMap = {
            navigate: ['nav a', '[role="menuitem"]', '.nav-link', 'header a', 'a[href]'],
            click: ['button', '[role="button"]', '.btn', 'a', '[clickable]', '[onclick]'],
            input: ['input', 'textarea', 'select', '[contenteditable]'],
            scroll: ['body'], // Special case
            wait: ['body'] // Special case
        };

        return selectorMap[intent as keyof typeof selectorMap] || ['*'];
    }

    // Get all elements matching selectors
    private getAllElements(selectors: string[]): Element[] {
        const elements: Element[] = [];
        for (const selector of selectors) {
            const nodeList = document.querySelectorAll(selector);
            for (let i = 0; i < nodeList.length; i++) {
                elements.push(nodeList[i]);
            }
        }
        return elements;
    }

    // Extract meaningful text from element
    private getElementText(element: Element): string {
        const text = element.textContent?.trim() || 
                    element.getAttribute('title') || 
                    element.getAttribute('aria-label') ||
                    element.getAttribute('placeholder') ||
                    (element as HTMLInputElement).value ||
                    '';
        
        return text.substring(0, 100); // Limit length
    }

    // Calculate normalized match score
    private calculateNormalizedMatch(target: string, text: string, id?: string): number {
        const normalize = (str: string) => {
            return str.toLowerCase()
                     .replace(/[^\w\s]/g, '') // Remove punctuation
                     .replace(/\s+/g, ' ')    // Collapse spaces
                     .trim();
        };

        const normalizedTarget = normalize(target);
        const normalizedText = normalize(text);
        const normalizedId = id ? normalize(id) : '';

        // Check if normalized strings match
        if (normalizedText === normalizedTarget || normalizedId === normalizedTarget) {
            return 0.95;
        }

        // Check if target is contained in text (token order insensitive)
        const targetTokens = normalizedTarget.split(' ');
        const textTokens = normalizedText.split(' ');
        
        const matchingTokens = targetTokens.filter(token => 
            textTokens.some(textToken => textToken.includes(token) || token.includes(textToken))
        );

        return matchingTokens.length / targetTokens.length * 0.9;
    }

    // Calculate fuzzy match score using Levenshtein distance
    private calculateFuzzyMatch(target: string, text: string): number {
        const levenshteinDistance = (a: string, b: string): number => {
            const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
            
            for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
            
            for (let j = 1; j <= b.length; j++) {
                for (let i = 1; i <= a.length; i++) {
                    const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                    matrix[j][i] = Math.min(
                        matrix[j][i - 1] + 1,     // deletion
                        matrix[j - 1][i] + 1,     // insertion
                        matrix[j - 1][i - 1] + indicator // substitution
                    );
                }
            }
            
            return matrix[b.length][a.length];
        };

        const distance = levenshteinDistance(target.toLowerCase(), text.toLowerCase());
        const maxLength = Math.max(target.length, text.length);
        
        return maxLength > 0 ? 1 - (distance / maxLength) : 0;
    }

    // Calculate phonetic match score using simplified Double Metaphone
    private calculatePhoneticMatch(target: string, text: string): number {
        const metaphone = (word: string): string => {
            // Simplified version - remove vowels except first letter and consonant clusters
            let result = word.toLowerCase().replace(/[^a-z]/g, '');
            if (result.length === 0) return '';
            
            // Keep first letter
            let metaphoneCode = result[0];
            
            // Process rest, keeping only consonants and reducing clusters
            for (let i = 1; i < result.length; i++) {
                const char = result[i];
                if (!'aeiou'.includes(char)) {
                    // Don't duplicate consonants
                    if (metaphoneCode[metaphoneCode.length - 1] !== char) {
                        metaphoneCode += char;
                    }
                }
            }
            
            return metaphoneCode.substring(0, 4); // Limit to 4 chars
        };

        const targetMeta = metaphone(target);
        const textMeta = metaphone(text);
        
        if (targetMeta === textMeta) return 0.8;
        if (targetMeta.length > 0 && textMeta.includes(targetMeta)) return 0.7;
        if (textMeta.length > 0 && targetMeta.includes(textMeta)) return 0.7;
        
        return 0;
    }

    // Present disambiguation options to user
    private presentDisambiguationOptions(matches: MatchCandidate[], intent: string): void {
        this.logger.info(`🔍 Found ${matches.length} options for ${intent}:`);
        console.log(`🔍 Found ${matches.length} options for ${intent}:`);
        
        matches.forEach((match, index) => {
            const message = `${index + 1}: ${match.text} (${match.matchType}, ${match.score.toFixed(2)})`;
            this.logger.info(message);
            console.log(message);
        });
        
        this.logger.info('Say a number (1, 2, 3...) or "select one", "choose two", etc.');
        console.log('Say a number (1, 2, 3...) or "select one", "choose two", etc.');
    }

    // Handle disambiguation response
    private handleDisambiguation(text: string): AICommand | null {
        // Match number patterns
        const numberPatterns = [
            /^(\d+)$/,  // Just "1", "2", etc.
            /(?:select|choose|pick|number)\s+(\d+)/,  // "select 1", "choose 2"
            /(?:select|choose|pick)\s+(one|two|three|four|five)/,  // "select one"
        ];

        const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5 };

        for (const pattern of numberPatterns) {
            const match = text.match(pattern);
            if (match) {
                let index = parseInt(match[1]);
                
                // Convert word to number if needed
                if (isNaN(index) && match[1] in numberWords) {
                    index = numberWords[match[1] as keyof typeof numberWords];
                }

                // Validate index
                if (index >= 1 && index <= this.pendingDisambiguation.length) {
                    const selected = this.pendingDisambiguation[index - 1];
                    this.logger.info(`✅ Selected: ${selected.text}`);
                    
                    return {
                        intent: 'click', // Default to click for disambiguation
                        target: selected.text,
                        element: selected.element,
                        description: `Selected option ${index}: ${selected.text}`,
                        confidence: selected.score
                    };
                }
            }
        }

        return null;
    }

    private async processWithOpenAI(text: string): Promise<AICommand[]> {
        if (!this.config.openAIApiKey) {
            return [];
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.openAIApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a web automation assistant. Convert natural language commands into structured JSON commands for web interaction. 
              
              Available commands:
              - navigate: {intent: "navigate", target: "page_name"}
              - click: {intent: "click", target: "css_selector"}
              - input: {intent: "input", target: "css_selector", value: "text"}
              - scroll: {intent: "scroll", coordinates: {x: 0, y: 100}}
              - wait: {intent: "wait", value: milliseconds}
              
              Return an array of commands. Be specific with CSS selectors.`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                })
            });

            const data = await response.json();
            const commandsText = data.choices[0].message.content;
      
            try {
                const parsedCommands = JSON.parse(commandsText);
                return Array.isArray(parsedCommands) ? parsedCommands : [parsedCommands];
            } catch (parseError) {
                this.logger.error(`Failed to parse OpenAI response: ${parseError}`);
                return [];
            }
        } catch (error) {
            this.logger.error(`OpenAI API error: ${error}`);
            return [];
        }
    }

    // SMS Command Processing (would integrate with Twilio webhook)
    async processSMSCommand(message: string, fromNumber: string): Promise<void> {
        this.logger.info(`SMS command from ${fromNumber}: ${message}`);
    
        // Remove session prefix from command if present
        const command = message.replace(/session:\w+\s*/i, '').trim();
    
        await this.processTextCommand(command);
    }

    // Create demo commands for showcasing
    getDemoCommands(): string[] {
        return [
            "Navigate to home page",
            "Click on login button", 
            "Type 'demo@example.com' into email field",
            "Type 'password123' into password field",
            "Click submit button",
            "Scroll down to footer",
            "Navigate to profile page",
            "Wait 2 seconds",
            "Click on settings tab"
        ];
    }

    // Execute a sequence of demo commands
    async runDemo(commands: string[], delayMs: number = 2000): Promise<void> {
        this.logger.info('Starting demo sequence...');
    
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            this.logger.info(`Demo step ${i + 1}: ${command}`);
      
            await this.processTextCommand(command);
      
            if (i < commands.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    
        this.logger.info('Demo sequence completed');
    }
}
