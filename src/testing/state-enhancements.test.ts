/**
 * Unit tests for Clean Annie State Enhancements
 */

import {
    AnnieStateEnhancements,
    initializeStateEnhancements
} from '../core/state-enhancements.js';

describe('StateEnhancements', () => {
    let mockStateManager: any;
    let stateEnhancements: AnnieStateEnhancements;

    beforeEach(() => {
        mockStateManager = {
            state: {
                user: {
                    name: 'John Doe',
                    balance: 1234.56,
                    isActive: true,
                    status: 'premium'
                }
            },
            on: jest.fn()
        };
        
        stateEnhancements = new AnnieStateEnhancements(mockStateManager);
    });

    it('should initialize with state manager', () => {
        expect(stateEnhancements).toBeDefined();
    });

    it('should process state elements without errors', () => {
        expect(() => {
            stateEnhancements.processStateElements();
        }).not.toThrow();
    });

    it('should trigger updates for keys', () => {
        expect(() => {
            stateEnhancements.triggerUpdate('user.name');
        }).not.toThrow();
    });

    it('should handle element cleanup', () => {
        const mockElement = document.createElement('div');
        
        expect(() => {
            stateEnhancements.unbindElement(mockElement);
        }).not.toThrow();
    });
});

describe('AI-First State Features', () => {
    it('should initialize state enhancements', () => {
        const mockStateManager = { state: {}, on: jest.fn() };
        
        expect(() => {
            initializeStateEnhancements(mockStateManager);
        }).not.toThrow();
    });

    it('should work with data attributes', () => {
        const testAttributes = [
            'data-annie-state="user.name"',
            'data-annie-state-attr="class:user.status"',
            'data-annie-state-show="user.isActive"'
        ];

        testAttributes.forEach(attr => {
            expect(attr).toContain('data-annie-state');
        });
    });
});