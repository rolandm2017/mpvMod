import { describe, it, expect } from 'vitest';
import { makeThingToBeSaved } from '$lib/utils/hotkey';

// Helper function to create KeyboardEvent objects for testing
function createKeyboardEvent(options: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
}): KeyboardEvent {
    return {
        key: options.key,
        ctrlKey: options.ctrlKey || false,
        shiftKey: options.shiftKey || false,
        altKey: options.altKey || false,
        metaKey: options.metaKey || false,
    } as KeyboardEvent;
}

describe('makeThingToBeSaved', () => {
    describe('single keys without modifiers', () => {
        it('converts lowercase letters to uppercase', () => {
            const event = createKeyboardEvent({ key: 'a' });
            expect(makeThingToBeSaved(event)).toBe('A');
        });

        it('keeps uppercase letters uppercase', () => {
            const event = createKeyboardEvent({ key: 'Z' });
            expect(makeThingToBeSaved(event)).toBe('Z');
        });

        it('handles numbers', () => {
            const event = createKeyboardEvent({ key: '5' });
            expect(makeThingToBeSaved(event)).toBe('5');
        });

        it('handles symbols', () => {
            const event = createKeyboardEvent({ key: '!' });
            expect(makeThingToBeSaved(event)).toBe('!');
        });
    });

    describe('special key normalization', () => {
        it('converts space to "Space"', () => {
            const event = createKeyboardEvent({ key: ' ' });
            expect(makeThingToBeSaved(event)).toBe('Space');
        });

        it('converts Escape to "Esc"', () => {
            const event = createKeyboardEvent({ key: 'Escape' });
            expect(makeThingToBeSaved(event)).toBe('Esc');
        });

        it('keeps other special keys unchanged', () => {
            const event = createKeyboardEvent({ key: 'Enter' });
            expect(makeThingToBeSaved(event)).toBe('Enter');
        });

        it('handles function keys', () => {
            const event = createKeyboardEvent({ key: 'F12' });
            expect(makeThingToBeSaved(event)).toBe('F12');
        });

        it('handles arrow keys', () => {
            const event = createKeyboardEvent({ key: 'ArrowUp' });
            expect(makeThingToBeSaved(event)).toBe('ArrowUp');
        });

        it('handles tab key', () => {
            const event = createKeyboardEvent({ key: 'Tab' });
            expect(makeThingToBeSaved(event)).toBe('Tab');
        });
    });

    describe('modifier keys alone (should return undefined)', () => {
        it('ignores Control key alone', () => {
            const event = createKeyboardEvent({
                key: 'Control',
                ctrlKey: true,
            });
            expect(makeThingToBeSaved(event)).toBeUndefined();
        });

        it('ignores Shift key alone', () => {
            const event = createKeyboardEvent({ key: 'Shift', shiftKey: true });
            expect(makeThingToBeSaved(event)).toBeUndefined();
        });

        it('ignores Alt key alone', () => {
            const event = createKeyboardEvent({ key: 'Alt', altKey: true });
            expect(makeThingToBeSaved(event)).toBeUndefined();
        });

        it('ignores Meta key alone', () => {
            const event = createKeyboardEvent({ key: 'Meta', metaKey: true });
            expect(makeThingToBeSaved(event)).toBeUndefined();
        });
    });

    describe('single modifier combinations', () => {
        it('handles Ctrl + letter', () => {
            const event = createKeyboardEvent({ key: 's', ctrlKey: true });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + S');
        });

        it('handles Shift + letter', () => {
            const event = createKeyboardEvent({ key: 'a', shiftKey: true });
            expect(makeThingToBeSaved(event)).toBe('Shift + A');
        });

        it('handles Alt + letter', () => {
            const event = createKeyboardEvent({ key: 'f', altKey: true });
            expect(makeThingToBeSaved(event)).toBe('Alt + F');
        });

        it('handles Cmd + letter', () => {
            const event = createKeyboardEvent({ key: 'c', metaKey: true });
            expect(makeThingToBeSaved(event)).toBe('Cmd + C');
        });

        it('handles Ctrl + special key', () => {
            const event = createKeyboardEvent({ key: ' ', ctrlKey: true });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + Space');
        });

        it('handles Shift + Escape', () => {
            const event = createKeyboardEvent({
                key: 'Escape',
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Shift + Esc');
        });
    });

    describe('multiple modifier combinations', () => {
        it('handles Ctrl + Shift + letter', () => {
            const event = createKeyboardEvent({
                key: 'p',
                ctrlKey: true,
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + Shift + P');
        });

        it('handles Ctrl + Alt + letter', () => {
            const event = createKeyboardEvent({
                key: 'd',
                ctrlKey: true,
                altKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + Alt + D');
        });

        it('handles Alt + Shift + letter', () => {
            const event = createKeyboardEvent({
                key: 'x',
                altKey: true,
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Shift + Alt + X');
        });

        it('handles Cmd + Shift + letter', () => {
            const event = createKeyboardEvent({
                key: 'z',
                metaKey: true,
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Shift + Cmd + Z');
        });

        it('handles all modifiers + letter', () => {
            const event = createKeyboardEvent({
                key: 'q',
                ctrlKey: true,
                shiftKey: true,
                altKey: true,
                metaKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe(
                'Ctrl + Shift + Alt + Cmd + Q'
            );
        });
    });

    describe('edge cases', () => {
        it('handles modifier + space', () => {
            const event = createKeyboardEvent({
                key: ' ',
                ctrlKey: true,
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + Shift + Space');
        });

        it('handles modifier + number', () => {
            const event = createKeyboardEvent({
                key: '7',
                altKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Alt + 7');
        });

        it('handles modifier + symbol', () => {
            const event = createKeyboardEvent({
                key: '=',
                ctrlKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + =');
        });

        it('handles modifier + function key', () => {
            const event = createKeyboardEvent({
                key: 'F5',
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Shift + F5');
        });

        it('handles modifier + arrow key', () => {
            const event = createKeyboardEvent({
                key: 'ArrowLeft',
                ctrlKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + ArrowLeft');
        });
    });

    describe('real-world common shortcuts', () => {
        it('handles Ctrl+C (copy)', () => {
            const event = createKeyboardEvent({ key: 'c', ctrlKey: true });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + C');
        });

        it('handles Ctrl+Shift+T (reopen tab)', () => {
            const event = createKeyboardEvent({
                key: 't',
                ctrlKey: true,
                shiftKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Ctrl + Shift + T');
        });

        it('handles Alt+F4 (close window)', () => {
            const event = createKeyboardEvent({
                key: 'F4',
                altKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Alt + F4');
        });

        it('handles Cmd+Option+Esc (force quit on Mac)', () => {
            const event = createKeyboardEvent({
                key: 'Escape',
                metaKey: true,
                altKey: true,
            });
            expect(makeThingToBeSaved(event)).toBe('Alt + Cmd + Esc');
        });
    });
});
