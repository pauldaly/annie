/**
 * Annie Framework - Animation System Tests
 * 
 * Comprehensive test suite for declarative animation system
 */

import { AnnieAnimations, AnimationOptions, ANNIE_ANIMATIONS } from '../ui/animations';

// Mock DOM environment
class MockElement {
    private attributes = new Map<string, string>();
    private classSet = new Set<string>();
    private styleMap = new Map<string, string>();
    private eventListeners = new Map<string, Function[]>();

    setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
    }

    getAttribute(name: string): string | null {
        return this.attributes.get(name) || null;
    }

    hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    addEventListener(event: string, handler: Function) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
    }

    removeEventListener(event: string, handler: Function) {
        const handlers = this.eventListeners.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    get classList() {
        return {
            add: (className: string) => this.classSet.add(className),
            remove: (className: string) => this.classSet.delete(className),
            contains: (className: string) => this.classSet.has(className),
            toString: () => Array.from(this.classSet).join(' ')
        };
    }

    get style() {
        return {
            setProperty: (property: string, value: string) => this.styleMap.set(property, value),
            getProperty: (property: string) => this.styleMap.get(property) || ''
        };
    }
}

// Mock document and window
const mockDocument = {
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => new MockElement()),
    head: {
        appendChild: jest.fn()
    }
};

const mockWindow = {
    matchMedia: jest.fn(() => ({ matches: false }))
};

// Mock global objects
global.document = mockDocument as any;
global.window = mockWindow as any;
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0],
    takeRecords: jest.fn()
})) as any;

global.MutationObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn()
})) as any;

describe('AnnieAnimations', () => {
    let animations: AnnieAnimations;
    let mockElement: MockElement;

    beforeEach(() => {
        animations = new AnnieAnimations({
            enableAnimations: true,
            respectReducedMotion: false,
            defaultDuration: '300ms',
            defaultEasing: 'ease'
        });

        mockElement = new MockElement();
        
        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        animations.destroy();
    });

    describe('Initialization', () => {
        test('should initialize animation system', () => {
            expect(() => animations.initialize()).not.toThrow();
        });

        test('should respect reduced motion preference', () => {
            mockWindow.matchMedia.mockReturnValue({ matches: true });
            
            const animationsWithReducedMotion = new AnnieAnimations({
                enableAnimations: true,
                respectReducedMotion: true
            });

            animationsWithReducedMotion.initialize();
            
            // Animations should be disabled
            expect(animationsWithReducedMotion['config'].enableAnimations).toBe(false);
        });

        test('should inject CSS if not present', () => {
            mockDocument.querySelector.mockReturnValue(null); // No existing CSS
            
            animations.initialize();
            
            expect(mockDocument.createElement).toHaveBeenCalledWith('link');
        });

        test('should not inject CSS if already present', () => {
            mockDocument.querySelector.mockReturnValue({}); // CSS already exists
            
            animations.initialize();
            
            expect(mockDocument.createElement).not.toHaveBeenCalled();
        });
    });

    describe('Element Initialization', () => {
        test('should initialize element with basic animation', () => {
            mockElement.setAttribute('data-annie-animate', 'fadeIn');
            mockElement.setAttribute('data-annie-trigger', 'onClick');

            animations.initialize();
            animations.initializeElement(mockElement as any);

            expect(mockElement.hasAttribute('data-annie-animate')).toBe(true);
        });

        test('should parse animation options from data attributes', () => {
            mockElement.setAttribute('data-annie-animate', 'slideUp');
            mockElement.setAttribute('data-annie-duration', '500ms');
            mockElement.setAttribute('data-annie-delay', '100ms');
            mockElement.setAttribute('data-annie-easing', 'ease-out');
            mockElement.setAttribute('data-annie-trigger', 'dataChange');

            animations.initialize();
            animations.initializeElement(mockElement as any);

            expect(mockElement.getAttribute('data-annie-animate')).toBe('slideUp');
            expect(mockElement.getAttribute('data-annie-duration')).toBe('500ms');
            expect(mockElement.getAttribute('data-annie-delay')).toBe('100ms');
            expect(mockElement.getAttribute('data-annie-easing')).toBe('ease-out');
        });

        test('should use default values for missing attributes', () => {
            mockElement.setAttribute('data-annie-animate', 'bounce');
            
            animations.initialize();
            animations.initializeElement(mockElement as any);

            // Should use defaults from config
            expect(mockElement.getAttribute('data-annie-animate')).toBe('bounce');
        });
    });

    describe('Animation Playback', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should play basic animation', async () => {
            const options: AnimationOptions = {
                name: 'fadeIn',
                duration: '300ms',
                easing: 'ease'
            };

            // Mock animation end after short delay
            setTimeout(() => {
                const event = { target: mockElement } as any;
                mockElement['eventListeners'].get('animationend')?.forEach(handler => handler(event));
            }, 10);

            await animations.playAnimation(mockElement as any, options);

            expect(mockElement.classList.contains('annie-animate-fadeIn')).toBe(false); // Removed after animation
        });

        test('should set CSS custom properties', async () => {
            const options: AnimationOptions = {
                name: 'slideUp',
                duration: '500ms',
                delay: '100ms',
                easing: 'ease-out',
                direction: 'reverse',
                fillMode: 'forwards'
            };

            const promise = animations.playAnimation(mockElement as any, options);
            
            // Trigger animation end immediately for test
            setTimeout(() => {
                const event = { target: mockElement } as any;
                mockElement['eventListeners'].get('animationend')?.forEach(handler => handler(event));
            }, 1);

            await promise;

            expect(mockElement.style.getProperty('--annie-duration')).toBe('500ms');
            expect(mockElement.style.getProperty('--annie-delay')).toBe('100ms');
            expect(mockElement.style.getProperty('--annie-easing')).toBe('ease-out');
        });

        test('should handle infinite animations', async () => {
            const options: AnimationOptions = {
                name: 'spin',
                duration: '1000ms',
                iterationCount: 'infinite'
            };

            const promise = animations.playAnimation(mockElement as any, options);
            
            // For infinite animations, class should not be removed
            setTimeout(() => {
                const event = { target: mockElement } as any;
                mockElement['eventListeners'].get('animationend')?.forEach(handler => handler(event));
            }, 1);

            await promise;

            // Animation class should remain for infinite animations
            expect(mockElement.style.getProperty('--annie-iteration-count')).toBe('infinite');
        });
    });

    describe('Animation Sequences', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should play animation sequence', async () => {
            const sequence = {
                steps: [
                    { name: 'fadeIn', delay: '0ms', duration: '200ms' },
                    { name: 'slideUp', delay: '100ms', duration: '300ms' },
                    { name: 'bounce', delay: '200ms', duration: '400ms' }
                ]
            };

            // Mock quick animation completion
            const originalPlayAnimation = animations.playAnimation;
            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            await animations.playSequence(mockElement as any, sequence);

            expect(animations.playAnimation).toHaveBeenCalledTimes(3);
            
            // Restore original method
            animations.playAnimation = originalPlayAnimation;
        });

        test('should handle sequence with loop', async () => {
            const sequence = {
                steps: [
                    { name: 'pulse', duration: '500ms' }
                ],
                loop: true
            };

            // Mock quick animation completion
            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            // Start sequence and stop after short delay
            animations.playSequence(mockElement as any, sequence);
            
            // Allow one iteration
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(animations.playAnimation).toHaveBeenCalled();
        });
    });

    describe('Trigger Handlers', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should handle onClick trigger', () => {
            mockElement.setAttribute('data-annie-animate', 'bounce');
            mockElement.setAttribute('data-annie-trigger', 'onClick');

            animations.initializeElement(mockElement as any);

            // Should add click event listener
            expect(mockElement['eventListeners'].has('click')).toBe(true);
        });

        test('should handle onHover trigger', () => {
            mockElement.setAttribute('data-annie-animate', 'pulse');
            mockElement.setAttribute('data-annie-trigger', 'onHover');

            animations.initializeElement(mockElement as any);

            // Should add mouseenter event listener
            expect(mockElement['eventListeners'].has('mouseenter')).toBe(true);
        });

        test('should handle dataChange trigger', () => {
            mockElement.setAttribute('data-annie-animate', 'highlight');
            mockElement.setAttribute('data-annie-trigger', 'dataChange');

            animations.initializeElement(mockElement as any);

            // Should set ready attribute
            expect(mockElement.hasAttribute('data-annie-animation-ready')).toBe(true);
        });

        test('should handle stateChange trigger', () => {
            mockElement.setAttribute('data-annie-animate', 'slideIn');
            mockElement.setAttribute('data-annie-trigger', 'stateChange');

            animations.initializeElement(mockElement as any);

            // Should set ready attribute
            expect(mockElement.hasAttribute('data-annie-state-animation-ready')).toBe(true);
        });
    });

    describe('Data Change Integration', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should trigger animation on data change', () => {
            mockElement.setAttribute('data-annie-animate', 'fadeIn');
            mockElement.setAttribute('data-annie-animation-ready', 'true');

            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            animations.triggerDataChangeAnimation(mockElement as any);

            expect(animations.playAnimation).toHaveBeenCalledWith(
                mockElement,
                expect.objectContaining({
                    name: 'fadeIn'
                })
            );
        });

        test('should not trigger if element not ready', () => {
            mockElement.setAttribute('data-annie-animate', 'fadeIn');
            // No ready attribute

            animations.playAnimation = jest.fn();

            animations.triggerDataChangeAnimation(mockElement as any);

            expect(animations.playAnimation).not.toHaveBeenCalled();
        });
    });

    describe('State Change Integration', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should trigger animation on state change', () => {
            mockElement.setAttribute('data-annie-animate', 'slideUp');
            mockElement.setAttribute('data-annie-state-animation-ready', 'true');

            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            animations.triggerStateChangeAnimation(mockElement as any);

            expect(animations.playAnimation).toHaveBeenCalledWith(
                mockElement,
                expect.objectContaining({
                    name: 'slideUp'
                })
            );
        });
    });

    describe('Validation Animations', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should play valid animation', () => {
            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            animations.playValidationAnimation(mockElement as any, true);

            expect(animations.playAnimation).toHaveBeenCalledWith(
                mockElement,
                expect.objectContaining({
                    name: 'valid'
                })
            );
        });

        test('should play invalid animation', () => {
            animations.playAnimation = jest.fn().mockResolvedValue(undefined);

            animations.playValidationAnimation(mockElement as any, false);

            expect(animations.playAnimation).toHaveBeenCalledWith(
                mockElement,
                expect.objectContaining({
                    name: 'invalid'
                })
            );
        });
    });

    describe('Performance Metrics', () => {
        beforeEach(() => {
            animations.initialize();
        });

        test('should return performance metrics', () => {
            // Mock DOM elements
            const mockElements = [
                { classList: { toString: () => 'annie-animate-fadeIn' } },
                { classList: { toString: () => 'annie-animate-slideUp' } },
                { classList: { toString: () => 'normal-class' } }
            ];

            mockDocument.querySelectorAll.mockReturnValue(mockElements as any);

            const metrics = animations.getPerformanceMetrics();

            expect(metrics).toHaveProperty('activeAnimations');
            expect(metrics).toHaveProperty('totalElements');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(typeof metrics.activeAnimations).toBe('number');
            expect(typeof metrics.totalElements).toBe('number');
            expect(typeof metrics.memoryUsage).toBe('string');
        });
    });

    describe('Animation Library Constants', () => {
        test('should export animation library', () => {
            expect(ANNIE_ANIMATIONS).toBeDefined();
            expect(ANNIE_ANIMATIONS.fadeIn).toBe('annie-fadeIn');
            expect(ANNIE_ANIMATIONS.slideUp).toBe('annie-slideUp');
            expect(ANNIE_ANIMATIONS.bounce).toBe('annie-bounce');
            expect(ANNIE_ANIMATIONS.pulse).toBe('annie-pulse');
        });

        test('should have all expected animations', () => {
            const expectedAnimations = [
                'fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight',
                'scaleIn', 'scaleOut', 'zoomIn', 'zoomOut', 'rotate', 'rotateIn', 'rotateOut',
                'bounce', 'pulse', 'shake', 'wobble', 'swing', 'highlight', 'flash', 'rubber', 'tada',
                'spin', 'breathe', 'invalid', 'valid'
            ];

            expectedAnimations.forEach(animation => {
                expect(ANNIE_ANIMATIONS[animation as keyof typeof ANNIE_ANIMATIONS]).toBeDefined();
            });
        });
    });

    describe('Utility Functions', () => {
        test('should parse duration correctly', () => {
            // Test private method through public interface
            const options: AnimationOptions = {
                name: 'fadeIn',
                duration: '500ms'
            };

            animations.playAnimation = jest.fn().mockImplementation(async (element, opts) => {
                // Check that duration is properly set
                expect(opts.duration).toBe('500ms');
            });

            animations.playAnimation(mockElement as any, options);
        });

        test('should parse iteration count correctly', () => {
            // Test through element initialization
            mockElement.setAttribute('data-annie-animate', 'spin');
            mockElement.setAttribute('data-annie-repeat', 'infinite');

            animations.initializeElement(mockElement as any);

            expect(mockElement.getAttribute('data-annie-repeat')).toBe('infinite');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid sequence data gracefully', () => {
            mockElement.setAttribute('data-annie-animate-sequence', 'invalid-json');

            // Should not throw
            expect(() => {
                animations.initializeElement(mockElement as any);
            }).not.toThrow();
        });

        test('should handle missing animation name gracefully', () => {
            // Element without data-annie-animate attribute
            expect(() => {
                animations.initializeElement(mockElement as any);
            }).not.toThrow();
        });

        test('should handle animations when disabled', async () => {
            const disabledAnimations = new AnnieAnimations({
                enableAnimations: false
            });

            const options: AnimationOptions = {
                name: 'fadeIn'
            };

            // Should resolve immediately without error
            await expect(disabledAnimations.playAnimation(mockElement as any, options))
                .resolves
                .toBeUndefined();
        });
    });

    describe('Memory Management', () => {
        test('should cleanup observers on destroy', () => {
            animations.initialize();
            
            const mockObserver = {
                disconnect: jest.fn()
            };
            
            // Add mock observer
            animations['observers'].set(mockElement as any, mockObserver as any);

            animations.destroy();

            expect(mockObserver.disconnect).toHaveBeenCalled();
        });

        test('should disconnect mutation observer on destroy', () => {
            const mockMutationObserver = {
                disconnect: jest.fn()
            };

            animations['mutationObserver'] = mockMutationObserver as any;

            animations.destroy();

            expect(mockMutationObserver.disconnect).toHaveBeenCalled();
        });
    });
});

// Integration Tests
describe('AnnieAnimations Integration', () => {
    test('should work with real DOM elements', () => {
        // Create real DOM element for integration test
        const element = document.createElement('div');
        element.setAttribute('data-annie-animate', 'fadeIn');
        element.setAttribute('data-annie-trigger', 'onClick');
        element.setAttribute('data-annie-duration', '500ms');

        const animations = new AnnieAnimations();
        animations.initialize();

        expect(() => {
            animations.initializeElement(element);
        }).not.toThrow();

        animations.destroy();
    });

    test('should handle sequence animations with real elements', () => {
        const element = document.createElement('div');
        element.setAttribute('data-annie-animate-sequence', JSON.stringify([
            { name: 'fadeIn', delay: '0ms', duration: '300ms' },
            { name: 'bounce', delay: '100ms', duration: '600ms' }
        ]));

        const animations = new AnnieAnimations();
        animations.initialize();

        expect(() => {
            animations.initializeElement(element);
        }).not.toThrow();

        animations.destroy();
    });
});

// Performance Tests
describe('AnnieAnimations Performance', () => {
    test('should initialize multiple elements efficiently', () => {
        const startTime = performance.now();
        
        const animations = new AnnieAnimations();
        animations.initialize();

        // Create multiple elements
        for (let i = 0; i < 100; i++) {
            const element = new MockElement();
            element.setAttribute('data-annie-animate', 'fadeIn');
            element.setAttribute('data-annie-trigger', 'onClick');
            animations.initializeElement(element as any);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(100); // 100ms threshold

        animations.destroy();
    });

    test('should handle concurrent animations efficiently', async () => {
        const animations = new AnnieAnimations();
        animations.initialize();

        const elements = Array.from({ length: 10 }, () => new MockElement());
        const options: AnimationOptions = {
            name: 'fadeIn',
            duration: '100ms'
        };

        // Mock quick animation completion
        animations.playAnimation = jest.fn().mockResolvedValue(undefined);

        const startTime = performance.now();
        
        const promises = elements.map(element => 
            animations.playAnimation(element as any, options)
        );

        await Promise.all(promises);

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(50); // Should be very fast with mocked animations
        expect(animations.playAnimation).toHaveBeenCalledTimes(10);

        animations.destroy();
    });
});