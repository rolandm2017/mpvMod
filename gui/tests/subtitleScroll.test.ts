import { describe, it, expect, vi } from 'vitest';
import {
	scrollToClosestSubtitle,
	scrollToLocation,
	Finder,
	parseTimecodeToSeconds
} from '../src/lib/utils/subtitleScroll';
import { SubtitleHeights } from '../src/lib/utils/subtitleHeights';
import { SubtitleDatabase } from '../src/lib/utils/subtitleDatabase';
import type { SubtitleTiming, TimecodeString } from '$lib/types';

describe('Finder', () => {
	describe('findPlayerTimeForSubtitleTiming', () => {
		it('should find the largest time that does not exceed timestamp', () => {
			const times = [1.0, 5.5, 10.0, 15.5];

			expect(Finder.findPlayerTimeForSubtitleTiming(7.0, times)).toBe(5.5);
			expect(Finder.findPlayerTimeForSubtitleTiming(5.5, times)).toBe(5.5);
			expect(Finder.findPlayerTimeForSubtitleTiming(0.5, times)).toBe(0);
			expect(Finder.findPlayerTimeForSubtitleTiming(20.0, times)).toBe(15.5);
		});

		it('should handle empty array', () => {
			expect(Finder.findPlayerTimeForSubtitleTiming(5.0, [])).toBe(0);
		});
	});
	describe('findSubtitleIndexAtPlayerTime', () => {
		it('should find the largest time that does not exceed timestamp', () => {
			const times = [1.0, 5.5, 10.0, 15.5];

			expect(Finder.findSubtitleIndexAtPlayerTime(7.0, times)).toBe(1); // 7 closest to 5.5, hence 1
			expect(Finder.findSubtitleIndexAtPlayerTime(5.5, times)).toBe(1); // 5.5 closest to 5.5, hence 1
			expect(Finder.findSubtitleIndexAtPlayerTime(0.5, times)).toBe(0);
			expect(Finder.findSubtitleIndexAtPlayerTime(20.0, times)).toBe(3); // 20 closest to 15.5, hence 3
		});

		it('should handle empty array', () => {
			expect(Finder.findSubtitleIndexAtPlayerTime(5.0, [])).toBe(0);
		});
	});
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

		const timecodes: TimecodeString[] = ['1.0', '5.5', '10.5', '15.5'];
		const timings: SubtitleTiming[] = [1.0, 5.5, 10.0, 15.5];
		const timePositionsToTimecodes = new Map<SubtitleTiming, TimecodeString>();
		timePositionsToTimecodes.set(timings[0], '1.0');
		timePositionsToTimecodes.set(timings[1], '5.5');
		timePositionsToTimecodes.set(timings[2], '10.5');
		timePositionsToTimecodes.set(timings[2], '15.5');

		const db = new SubtitleDatabase([], timePositionsToTimecodes, timings, timecodes);
		db.setHeight(5.5, 250);

		// Mock console.log to avoid test output noise
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		scrollToClosestSubtitle(7.0, db, mockScrollContainer);

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

		const timecodes: TimecodeString[] = ['1.0', '5.5', '10.5', '15.5'];
		const timings: SubtitleTiming[] = [1.0, 5.5, 10.0, 15.5];
		const timePositionsToTimecodes = new Map<SubtitleTiming, TimecodeString>();
		timePositionsToTimecodes.set(timings[0], '1.0');
		timePositionsToTimecodes.set(timings[1], '5.5');
		timePositionsToTimecodes.set(timings[2], '10.5');
		timePositionsToTimecodes.set(timings[2], '15.5');

		const db = new SubtitleDatabase([], timePositionsToTimecodes, timings, timecodes);

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		scrollToClosestSubtitle(7.0, db, mockScrollContainer);

		expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
			top: 0,
			behavior: 'auto'
		});

		consoleSpy.mockRestore();
	});
});
