/**
 * Annie Framework - Animation System
 * 
 * Provides declarative CSS-based animations through data attributes.
 * Integrates with Annie's data-observe and state management systems.
 * 
 * Philosophy: AI-first, zero-compilation, performance-optimized animations
 */

import { Logger } from '../core/logger.js';

// Animation configuration interfaces
export interface AnimationOptions {
    name: string;
    duration?: string;
    delay?: string;
    easing?: string;
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
    iterationCount?: number | 'infinite';
    trigger?: AnimationTrigger;
    condition?: string; // JsonLogic expression
}

export interface AnimationStep {
    name: string;
    delay?: string;
    duration?: string;
    easing?: string;
}

export interface AnimationSequence {
    steps: AnimationStep[];
    loop?: boolean;
    onComplete?: () => void;
}

export type AnimationTrigger = 
    | 'dataChange'
    | 'stateChange' 
    | 'onClick'
    | 'onHover'
    | 'onVisible'
    | 'onLoad'
    | 'validation'
    | 'manual';

export interface AnimationConfig {
    enableAnimations: boolean;
    respectReducedMotion: boolean;
    defaultDuration: string;
    defaultEasing: string;
    performanceMode: boolean;
    cssPath?: string; // Optional custom CSS path
    autoInjectCSS?: boolean; // Whether to auto-inject CSS (default: true)
}

// Pre-defined animation library
export const ANNIE_ANIMATIONS = {
    // Basic transitions
    fadeIn: 'annie-fadeIn',
    fadeOut: 'annie-fadeOut',
    slideUp: 'annie-slideUp',
    slideDown: 'annie-slideDown',
    slideLeft: 'annie-slideLeft',
    slideRight: 'annie-slideRight',
    
    // Scale animations
    scaleIn: 'annie-scaleIn',
    scaleOut: 'annie-scaleOut',
    zoomIn: 'annie-zoomIn',
    zoomOut: 'annie-zoomOut',
    
    // Rotation
    rotate: 'annie-rotate',
    rotateIn: 'annie-rotateIn',
    rotateOut: 'annie-rotateOut',
    
    // Attention seekers
    bounce: 'annie-bounce',
    pulse: 'annie-pulse',
    shake: 'annie-shake',
    wobble: 'annie-wobble',
    swing: 'annie-swing',
    
    // Special effects
    highlight: 'annie-highlight',
    flash: 'annie-flash',
    rubber: 'annie-rubber',
    tada: 'annie-tada',
    
    // Loading states
    spin: 'annie-spin',
    breathe: 'annie-breathe',
    
    // Form feedback
    invalid: 'annie-invalid',
    valid: 'annie-valid'
} as const;

/**
 * Annie Animation Engine
 * 
 * Manages CSS-based animations through data attributes with zero JavaScript overhead
 */
export class AnnieAnimations {
    private logger: Logger;
    private config: AnimationConfig;
    private animatedElements = new WeakMap<HTMLElement, Set<string>>();
    private observers = new Map<HTMLElement, IntersectionObserver>();
    private mutationObserver?: MutationObserver;
    private isInitialized = false;

    constructor(config: Partial<AnimationConfig> = {}) {
        this.logger = new Logger('AnnieAnimations');
        
        this.config = {
            enableAnimations: true,
            respectReducedMotion: true,
            defaultDuration: '300ms',
            defaultEasing: 'ease',
            performanceMode: false,
            autoInjectCSS: true,
            ...config
        };
    }

    /**
     * Initialize the animation system
     */
    public initialize(): void {
        if (this.isInitialized) {
            this.logger.warn('Animation system already initialized');
            return;
        }

        this.logger.info('Initializing Annie Animation System...');
        
        // Check for reduced motion preference
        if (this.config.respectReducedMotion && this.prefersReducedMotion()) {
            this.logger.info('Reduced motion detected - disabling animations');
            this.config.enableAnimations = false;
        }

        // Inject CSS if not already present and auto-inject is enabled
        if (this.config.autoInjectCSS !== false) {
            this.injectAnimationCSS();
        }
        
        // Initialize existing elements
        this.initializeExistingElements();
        
        // Set up mutation observer for dynamic elements
        this.setupMutationObserver();
        
        this.isInitialized = true;
        this.logger.info('Annie Animation System initialized successfully');
    }

    /**
     * Initialize animations for existing DOM elements
     */
    private initializeExistingElements(): void {
        const elements = document.querySelectorAll('[data-annie-animate]');
        elements.forEach(element => {
            this.initializeElement(element as HTMLElement);
        });

        // Initialize sequence animations
        const sequenceElements = document.querySelectorAll('[data-annie-animate-sequence]');
        sequenceElements.forEach(element => {
            this.initializeSequenceElement(element as HTMLElement);
        });
    }

    /**
     * Initialize animation for a single element
     */
    public initializeElement(element: HTMLElement): void {
        if (!this.config.enableAnimations) return;

        const animationName = element.getAttribute('data-annie-animate');
        if (!animationName) return;

        const trigger = element.getAttribute('data-annie-trigger') as AnimationTrigger || 'manual';
        const condition = element.getAttribute('data-annie-when');
        
        // Parse animation options
        const options: AnimationOptions = {
            name: animationName,
            duration: element.getAttribute('data-annie-duration') || this.config.defaultDuration,
            delay: element.getAttribute('data-annie-delay') || '0ms',
            easing: element.getAttribute('data-annie-easing') || this.config.defaultEasing,
            direction: element.getAttribute('data-annie-direction') as any || 'normal',
            fillMode: element.getAttribute('data-annie-fill-mode') as any || 'both',
            iterationCount: this.parseIterationCount(element.getAttribute('data-annie-repeat')),
            trigger,
            condition: condition || undefined
        };

        // Set up trigger handlers
        this.setupTriggerHandlers(element, options);

        // Auto-trigger for certain triggers
        if (trigger === 'onLoad') {
            this.playAnimation(element, options);
        } else if (trigger === 'onVisible') {
            this.setupVisibilityTrigger(element, options);
        }
    }

    /**
     * Initialize sequence animation for an element
     */
    private initializeSequenceElement(element: HTMLElement): void {
        if (!this.config.enableAnimations) return;

        try {
            const sequenceData = element.getAttribute('data-annie-animate-sequence');
            if (!sequenceData) return;

            const steps: AnimationStep[] = JSON.parse(sequenceData);
            const sequence: AnimationSequence = { steps };

            // Set up sequence trigger
            const trigger = element.getAttribute('data-annie-trigger') as AnimationTrigger || 'manual';
            
            if (trigger === 'onLoad') {
                this.playSequence(element, sequence);
            } else {
                this.setupSequenceTriggerHandlers(element, sequence, trigger);
            }
        } catch (error) {
            this.logger.error('Failed to parse animation sequence: ' + String(error));
        }
    }

    /**
     * Set up trigger handlers for animations
     */
    private setupTriggerHandlers(element: HTMLElement, options: AnimationOptions): void {
        const { trigger } = options;

        switch (trigger) {
            case 'onClick':
                element.addEventListener('click', () => this.playAnimation(element, options));
                break;
                
            case 'onHover':
                element.addEventListener('mouseenter', () => this.playAnimation(element, options));
                break;
                
            case 'dataChange':
                // This will be called by the data observer system
                element.setAttribute('data-annie-animation-ready', 'true');
                break;
                
            case 'stateChange':
                // This will be called by the state management system
                element.setAttribute('data-annie-state-animation-ready', 'true');
                break;
                
            case 'validation':
                // Set up form validation listeners
                this.setupValidationTrigger(element);
                break;
        }
    }

    /**
     * Set up sequence trigger handlers
     */
    private setupSequenceTriggerHandlers(element: HTMLElement, sequence: AnimationSequence, trigger: AnimationTrigger): void {
        switch (trigger) {
            case 'onClick':
                element.addEventListener('click', () => this.playSequence(element, sequence));
                break;
                
            case 'onHover':
                element.addEventListener('mouseenter', () => this.playSequence(element, sequence));
                break;
                
            case 'dataChange':
                element.setAttribute('data-annie-sequence-animation-ready', 'true');
                break;
        }
    }

    /**
     * Set up visibility-based trigger
     */
    private setupVisibilityTrigger(element: HTMLElement, options: AnimationOptions): void {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.playAnimation(entry.target as HTMLElement, options);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(element);
        this.observers.set(element, observer);
    }

    /**
     * Set up form validation trigger
     */
    private setupValidationTrigger(element: HTMLElement): void {
        const form = element.closest('form');
        if (!form) return;

        // Listen for validation events
        form.addEventListener('submit', (e) => {
            const isValid = form.checkValidity();
            if (!isValid) {
                e.preventDefault();
                this.playValidationAnimation(element, false);
            }
        });

        // Listen for input validation
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.addEventListener('blur', () => {
                const input = element as HTMLInputElement;
                const isValid = input.checkValidity();
                this.playValidationAnimation(element, isValid);
            });
        }
    }

    /**
     * Play animation on an element
     */
    public async playAnimation(element: HTMLElement, options: AnimationOptions): Promise<void> {
        if (!this.config.enableAnimations) return;

        // Check condition if specified
        if (options.condition && !this.evaluateCondition(options.condition)) {
            return;
        }

        return new Promise<void>((resolve) => {
            // Set CSS custom properties
            this.setCSSProperties(element, options);

            // Get animation class name
            const animationClass = this.getAnimationClass(options.name);
            
            // Track animated elements
            if (!this.animatedElements.has(element)) {
                this.animatedElements.set(element, new Set());
            }
            this.animatedElements.get(element)!.add(animationClass);

            // Apply animation class
            element.classList.add(animationClass);

            // Listen for animation end
            const handleAnimationEnd = (event: AnimationEvent) => {
                if (event.target === element) {
                    element.removeEventListener('animationend', handleAnimationEnd);
                    
                    // Remove animation class if not infinite
                    if (options.iterationCount !== 'infinite') {
                        element.classList.remove(animationClass);
                        this.animatedElements.get(element)?.delete(animationClass);
                    }
                    
                    resolve();
                }
            };

            element.addEventListener('animationend', handleAnimationEnd);
            
            // Fallback timeout
            const duration = this.parseDuration(options.duration || this.config.defaultDuration);
            const delay = this.parseDuration(options.delay || '0ms');
            setTimeout(() => {
                handleAnimationEnd({ target: element } as unknown as AnimationEvent);
            }, duration + delay + 100); // Add small buffer
        });
    }

    /**
     * Play animation sequence
     */
    public async playSequence(element: HTMLElement, sequence: AnimationSequence): Promise<void> {
        if (!this.config.enableAnimations) return;

        for (const step of sequence.steps) {
            const stepOptions: AnimationOptions = {
                name: step.name,
                duration: step.duration || this.config.defaultDuration,
                delay: step.delay || '0ms',
                easing: step.easing || this.config.defaultEasing
            };

            // Wait for delay before starting step
            if (step.delay) {
                await this.sleep(this.parseDuration(step.delay));
            }

            await this.playAnimation(element, stepOptions);
        }

        if (sequence.onComplete) {
            sequence.onComplete();
        }

        if (sequence.loop) {
            setTimeout(() => this.playSequence(element, sequence), 100);
        }
    }

    /**
     * Play validation animation based on validation result
     */
    public playValidationAnimation(element: HTMLElement, isValid: boolean): void {
        const animationName = isValid ? 'valid' : 'invalid';
        const options: AnimationOptions = {
            name: animationName,
            duration: '600ms',
            easing: 'ease-out'
        };

        this.playAnimation(element, options);
    }

    /**
     * Trigger animation for data change (called by data observer)
     */
    public triggerDataChangeAnimation(element: HTMLElement): void {
        if (!element.hasAttribute('data-annie-animation-ready')) return;

        const animationName = element.getAttribute('data-annie-animate');
        if (!animationName) return;

        const options: AnimationOptions = {
            name: animationName,
            duration: element.getAttribute('data-annie-duration') || this.config.defaultDuration,
            delay: element.getAttribute('data-annie-delay') || '0ms',
            easing: element.getAttribute('data-annie-easing') || this.config.defaultEasing
        };

        this.playAnimation(element, options);
    }

    /**
     * Trigger animation for state change (called by state manager)
     */
    public triggerStateChangeAnimation(element: HTMLElement): void {
        if (!element.hasAttribute('data-annie-state-animation-ready')) return;

        const animationName = element.getAttribute('data-annie-animate');
        if (!animationName) return;

        const options: AnimationOptions = {
            name: animationName,
            duration: element.getAttribute('data-annie-duration') || this.config.defaultDuration,
            delay: element.getAttribute('data-annie-delay') || '0ms',
            easing: element.getAttribute('data-annie-easing') || this.config.defaultEasing
        };

        this.playAnimation(element, options);
    }

    /**
     * Trigger sequence animation for data/state change
     */
    public triggerSequenceAnimation(element: HTMLElement): void {
        if (!element.hasAttribute('data-annie-sequence-animation-ready')) return;

        try {
            const sequenceData = element.getAttribute('data-annie-animate-sequence');
            if (!sequenceData) return;

            const steps: AnimationStep[] = JSON.parse(sequenceData);
            const sequence: AnimationSequence = { steps };

            this.playSequence(element, sequence);
        } catch (error) {
            this.logger.error('Failed to trigger sequence animation: ' + String(error));
        }
    }

    /**
     * Set CSS custom properties for animation
     */
    private setCSSProperties(element: HTMLElement, options: AnimationOptions): void {
        element.style.setProperty('--annie-duration', options.duration || this.config.defaultDuration);
        element.style.setProperty('--annie-delay', options.delay || '0ms');
        element.style.setProperty('--annie-easing', options.easing || this.config.defaultEasing);
        element.style.setProperty('--annie-direction', options.direction || 'normal');
        element.style.setProperty('--annie-fill-mode', options.fillMode || 'both');
        
        if (options.iterationCount !== undefined) {
            element.style.setProperty('--annie-iteration-count', 
                typeof options.iterationCount === 'number' ? options.iterationCount.toString() : options.iterationCount
            );
        }
    }

    /**
     * Get CSS class name for animation
     */
    private getAnimationClass(animationName: string): string {
        // Check if it's a predefined animation
        const predefinedClass = ANNIE_ANIMATIONS[animationName as keyof typeof ANNIE_ANIMATIONS];
        if (predefinedClass) {
            return `annie-animate-${animationName}`;
        }
        
        // Custom animation
        return `annie-animate-${animationName}`;
    }

    /**
     * Parse iteration count from string
     */
    private parseIterationCount(value: string | null): number | 'infinite' {
        if (!value) return 1;
        if (value === 'infinite') return 'infinite';
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 1 : parsed;
    }

    /**
     * Parse duration string to milliseconds
     */
    private parseDuration(duration: string): number {
        const match = duration.match(/^([\d.]+)(ms|s)$/);
        if (!match) return 300;
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        
        return unit === 's' ? value * 1000 : value;
    }

    /**
     * Evaluate condition (basic implementation - could be enhanced with JsonLogic)
     */
    private evaluateCondition(condition: string): boolean {
        try {
            // Simple condition evaluation - could be enhanced
            return new Function('return ' + condition)();
        } catch {
            return true;
        }
    }

    /**
     * Check if user prefers reduced motion
     */
    private prefersReducedMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Sleep utility for sequence delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Inject animation CSS if not already present
     */
    private injectAnimationCSS(): void {
        if (document.querySelector('#annie-animations-css')) return;

        const link = document.createElement('link');
        link.id = 'annie-animations-css';
        link.rel = 'stylesheet';
        
        // Determine CSS path based on configuration or environment
        const cssPath = this.config.cssPath || this.getAnimationCSSPath();
        link.href = cssPath;
        
        document.head.appendChild(link);

        this.logger.info(`Annie animation CSS injected: ${cssPath}`);
    }

    /**
     * Get the correct path for animation CSS based on environment
     */
    private getAnimationCSSPath(): string {
        // Check if we're in development (src folder structure exists)
        const isDevelopment = document.querySelector('script[src*="/src/"]') !== null ||
                            window.location.href.includes('/src/') ||
                            document.querySelector('link[href*="/src/"]') !== null;

        if (isDevelopment) {
            // Development: use src path
            return '/src/styles/annie-animations.css';
        } else {
            // Production: try multiple common paths
            const possiblePaths = [
                '/dist/annie-animations.css',      // Same folder as annie.umd.js
                './annie-animations.css',          // Relative to current page
                '/annie-animations.css',           // Root of site
                '/assets/annie-animations.css',    // Common assets folder
                '/css/annie-animations.css',       // Common CSS folder
                '/styles/annie-animations.css'     // Common styles folder
            ];

            // For production, we'll try the first path and let it fail gracefully if not found
            // Users should ensure the CSS is available at one of these locations
            return possiblePaths[0];
        }
    }

    /**
     * Set up mutation observer for dynamic elements
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        
                        // Check if the element has animation attributes
                        if (element.hasAttribute('data-annie-animate')) {
                            this.initializeElement(element);
                        }
                        
                        if (element.hasAttribute('data-annie-animate-sequence')) {
                            this.initializeSequenceElement(element);
                        }
                        
                        // Check child elements
                        const animatedChildren = element.querySelectorAll('[data-annie-animate]');
                        animatedChildren.forEach(child => {
                            this.initializeElement(child as HTMLElement);
                        });
                        
                        const sequenceChildren = element.querySelectorAll('[data-annie-animate-sequence]');
                        sequenceChildren.forEach(child => {
                            this.initializeSequenceElement(child as HTMLElement);
                        });
                    }
                });
            });
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Get animation performance metrics
     */
    public getPerformanceMetrics(): {
        activeAnimations: number;
        totalElements: number;
        memoryUsage: string;
    } {
        let activeAnimations = 0;
        let totalElements = 0;
        
        // Count animations manually since WeakMap doesn't have size/values
        // This is an approximation for performance monitoring
        const elements = document.querySelectorAll('[data-annie-animate], [data-annie-animate-sequence]');
        totalElements = elements.length;
        
        elements.forEach(element => {
            if (element.classList.toString().includes('annie-animate-')) {
                activeAnimations++;
            }
        });
        
        return {
            activeAnimations,
            totalElements,
            memoryUsage: `~${totalElements * 50}B` // Rough estimate
        };
    }

    /**
     * Cleanup animation system
     */
    public destroy(): void {
        this.logger.info('Destroying Annie Animation System...');
        
        // Clear all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // Clear animated elements tracking
        this.animatedElements = new WeakMap();
        
        this.isInitialized = false;
        this.logger.info('Annie Animation System destroyed');
    }
}

// Export animation utilities
export { ANNIE_ANIMATIONS as AnimationLibrary };

// Default animation instance
export const annieAnimations = new AnnieAnimations();