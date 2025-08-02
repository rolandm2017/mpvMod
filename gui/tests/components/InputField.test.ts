import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InputField from '$lib/components/InputField.svelte';

describe('InputField', () => {
    it('accepts an id', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        const inputField = screen.getByRole('textbox');
        expect(inputField).toHaveAttribute('id', 'foo');
    });

    it('has a label', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        // Option 1: Find by text content
        const labelElement = screen.getByText('sentence');
        expect(labelElement).toBeInTheDocument();

        // Option 2: Verify the input has the accessible name
        const inputField = screen.getByLabelText('sentence');
        expect(inputField).toBeInTheDocument();
    });

    it('contains the right text, right place', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        const inputField = screen.getByPlaceholderText('Sentence here');
        expect(inputField).toHaveAttribute('id', 'foo');
    });
});
