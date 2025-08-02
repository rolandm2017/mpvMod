import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InputField from '$lib/components/InputField.svelte';

describe('InputField', () => {
    it('accepts an id', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        const labelSegment = screen.getByRole('label');
        expect(labelSegment).toHaveAttribute('id', 'foo');
    });
    it('has a label', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        const labelSegment = screen.getByRole('label');
        expect(labelSegment).toHaveTextContent('sentence');
    });
    it('contains the right text, right place', () => {
        render(InputField, { props: { id: 'foo', label: 'sentence', value: undefined, placeholder: 'Sentence here' } });

        const inputFieldItself = screen.getByPlaceholderText('Sentence here');
        expect(inputFieldItself).toHaveAttribute('id', 'foo');
    });
});
