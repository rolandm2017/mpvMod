import { describe, it, expect, vi } from 'vitest';
import {
	scrollToClosestSubtitle,
	scrollToLocation,
	Finder,
	parseTimecodeToSeconds
} from './subtitleScroll';
import { SubtitleHeights } from './SubtitleHeights';

describe('Finder', () => {
	describe('findCorrespondingSubtitleTime', () => {
		it('should find the largest time that does not exceed timestamp', () => {
			const times = [1.0, 5.5, 10.0, 15.5];

			expect(Finder.findSubtitleIndexAtPlayerTime(7.0, times)).toBe(5.5);
			expect(Finder.findSubtitleIndexAtPlayerTime(5.5, times)).toBe(5.5);
			expect(Finder.findSubtitleIndexAtPlayerTime(0.5, times)).toBe(0);
			expect(Finder.findSubtitleIndexAtPlayerTime(20.0, times)).toBe(15.5);
		});

		it('should handle empty array', () => {
			expect(Finder.findSubtitleIndexAtPlayerTime(5.0, [])).toBe(0);
		});
	});
	describe('');
});

describe('parseTimecodeToSeconds', () => {
	it('should parse standard timecode format', () => {
		expect(parseTimecodeToSeconds('00:05:23.450')).toBe(323.45);
		expect(parseTimecodeToSeconds('01:30:45.200')).toBe(5445.2);
		expect(parseTimecodeToSeconds('00:00:10.000')).toBe(10);
	});

	it('should handle invalid formats', () => {
		expect(parseTimecodeToSeconds('invalid')).toBe(0);
		expect(parseTimecodeToSeconds('5:30')).toBe(0);
	});
});

describe('scrollToLocation', () => {
	it('should call scrollTo on the container', () => {
		const mockScrollContainer = {
			scrollTo: vi.fn()
		} as unknown as HTMLDivElement;

		scrollToLocation(100, mockScrollContainer);

		expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
			top: 100,
			behavior: 'auto'
		});
	});
});

describe('scrollToClosestSubtitle', () => {
	it('should scroll to the correct subtitle height', () => {
		const mockScrollContainer = {
			scrollTo: vi.fn()
		} as unknown as HTMLDivElement;

		const subtitleHeights = new SubtitleHeights();
		subtitleHeights.set(5.5, 250);

		const times = [1.0, 5.5, 10.0, 15.5];

		// Mock console.log to avoid test output noise
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		scrollToClosestSubtitle(7.0, times, subtitleHeights, mockScrollContainer);

		expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
			top: 250,
			behavior: 'auto'
		});

		consoleSpy.mockRestore();
	});

	it('should use 0 height when subtitle not found in heights map', () => {
		const mockScrollContainer = {
			scrollTo: vi.fn()
		} as unknown as HTMLDivElement;

		const subtitleHeights = new SubtitleHeights();

		const times = [1.0, 5.5, 10.0, 15.5];

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		scrollToClosestSubtitle(7.0, times, subtitleHeights, mockScrollContainer);

		expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
			top: 0,
			behavior: 'auto'
		});

		consoleSpy.mockRestore();
	});
});
