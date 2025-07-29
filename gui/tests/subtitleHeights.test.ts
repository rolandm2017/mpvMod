import { describe, it, expect, vi } from 'vitest';
import { SubtitleHeights } from '../src/lib/utils/subtitleHeights';

describe('SubtitleHeights', () => {
	it('stores a variety of different timecode-height pairs', () => {
		const pairs = [
			[1, 10],
			[5, 35],
			[9, 660]
		];

		const heights = new SubtitleHeights();

		heights.set(pairs[0][0], pairs[0][1]);
		heights.set(pairs[1][0], pairs[1][1]);
		heights.set(pairs[2][0], pairs[2][1]);

		expect(heights.getHeight(pairs[0][0])).toBe(pairs[0][1]);
		expect(heights.getHeight(pairs[1][0])).toBe(pairs[1][1]);
		expect(heights.getHeight(pairs[2][0])).toBe(pairs[2][1]);
	});

	it('returns 0 when the array is empty', () => {
		const heights = new SubtitleHeights();

		expect(heights.getHeight(10)).toBe(0);
		expect(heights.getHeight(55)).toBe(0);
	});

	it('gives the average of the two closest values when no exact match is found', () => {
		const pairs = [
			[1, 10],
			[5, 35],
			[9, 660],
			[19, 888]
		];

		const heights = new SubtitleHeights();

		heights.set(pairs[0][0], pairs[0][1]);
		heights.set(pairs[1][0], pairs[1][1]);
		heights.set(pairs[2][0], pairs[2][1]);
		heights.set(pairs[3][0], pairs[3][1]);

		const middleOfTwoVals = (9 + 19) / 2;

		expect(heights.getHeight(middleOfTwoVals)).toBe((660 + 888) / 2);
	});
});
