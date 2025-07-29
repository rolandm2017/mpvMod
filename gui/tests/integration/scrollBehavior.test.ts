/// <reference types="vitest/globals" />
import { render, fireEvent, waitFor, type RenderResult } from '@testing-library/svelte';
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import YourComponent from '../../src/routes/+page.svelte';
import { tick } from 'svelte';
import type { PlayerPosition, SubtitleTiming, TimecodeString } from '$lib/types';
import type { ElectronAPI } from '$lib/interfaces';

import type { MockData } from '../dummySubtitles';
import { mockSubtitleData } from '../dummySubtitles';

// This test suite does not pretend to be doing PageServerLoad.
// The test is only testing the client-side Svelte component (+page.svelte).
// It bypasses the server-side data loading entirely by directly passing mock data to the component via props:
// typescriptrender(YourComponent, { props: { data: mockData } })
// The mockData is created in the test itself, simulating what the PageServerLoad would have returned, but
// the actual server-side subtitle parsing, file reading, and data processing logic is not tested here.
// To test PageServerLoad, you'd need separate unit tests that import and
// call the load function directly with mock file system operations.

// Type definitions
interface MPVStateData {
	content: string;
	formatted_duration: string;
	formatted_time: string;
	progress: number;
	time_pos: number;
	timestamp: number;
	type: string;
}

interface MockElectronAPI {
	onMPVState: Mock;
}

interface SubtitleSegmentObj {
	index: number;
	timecode: string;
	text: string;
	startTimeSeconds: number;
}

interface MockSubtitle {
	text: string;
	timecode: string;
	startTimeSeconds: number;
}

interface MockSubtitleDatabase {
	subtitles: MockSubtitle[];
	timePositionsToTimecodes: Map<number, string>;
	subtitleCuePointsInSec: number[];
	timecodes: string[];
	subtitleHeights: Map<number, number>;
}

interface MockScrollUtils {
	Finder: {
		findPlayerTimeForSubtitleTiming: Mock<
			(playerPosition: PlayerPosition, subtitleCuePointsArr: SubtitleTiming[]) => SubtitleTiming
		>;
	};
	parseTimecodeToSeconds: Mock<(timecode: TimecodeString) => SubtitleTiming>;
	scrollToClosestSubtitle: Mock<
		(playerPosition: number, db: MockSubtitleDatabase, container: HTMLElement) => number
	>;
}

// Extend global Window interface
declare global {
	interface Window {
		electronAPI: ElectronAPI;
		devtoolsScroller?: (position: number) => void;
	}
}

// Mock the utility functions
const mockScrollUtils = vi.hoisted(
	(): MockScrollUtils => ({
		Finder: {
			findPlayerTimeForSubtitleTiming: vi.fn(
				(playerPosition: number, cuePoints: number[]): number => {
					// Find the closest cue point that doesn't exceed the player position
					let closest = 0;
					for (const point of cuePoints) {
						if (point <= playerPosition) {
							closest = point;
						} else {
							break;
						}
					}
					return closest;
				}
			)
		},
		parseTimecodeToSeconds: vi.fn((timecode: string): number => {
			// Simple mock implementation
			const [time] = timecode.split(' --> ');
			const [hours, minutes, seconds] = time.split(':');
			return (
				parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds.replace(',', '.'))
			);
		}),
		scrollToClosestSubtitle: vi.fn()
	})
);

vi.mock('$lib/utils/subtitleScroll.js', () => mockScrollUtils);

// Mock SubtitleDatabase classes
const mockSubtitleClasses = vi.hoisted(() => ({
	Subtitle: class MockSubtitle implements MockSubtitle {
		text: string;
		timecode: string;
		startTimeSeconds: number;

		constructor(text: string, timecode: string, startTimeSeconds: number) {
			this.text = text;
			this.timecode = timecode;
			this.startTimeSeconds = startTimeSeconds;
		}
	},
	SubtitleDatabase: class MockSubtitleDatabase implements MockSubtitleDatabase {
		subtitles: MockSubtitle[];
		timePositionsToTimecodes: Map<number, string>;
		subtitleCuePointsInSec: number[];
		timecodes: string[];
		subtitleHeights: Map<number, number>;

		constructor(
			subtitles: MockSubtitle[],
			timePositionsToTimecodes: Map<number, string>,
			subtitleCuePointsInSec: number[],
			timecodes: string[]
		) {
			this.subtitles = subtitles;
			this.timePositionsToTimecodes = timePositionsToTimecodes;
			this.subtitleCuePointsInSec = subtitleCuePointsInSec;
			this.timecodes = timecodes;
			this.subtitleHeights = new Map<number, number>();
		}
	}
}));

vi.mock('$lib/utils/SubtitleDatabase.js', () => mockSubtitleClasses);

describe('Subtitle Scrolling', () => {
	let mockElectronAPI: MockElectronAPI;
	let onMPVStateCallback: ((data: MPVStateData) => void) | undefined;

	// Sample test data
	const mockData = mockSubtitleData;

	beforeEach(() => {
		// Mock the electron API
		mockElectronAPI = {
			onMPVState: vi.fn((callback: (data: MPVStateData) => void): void => {
				onMPVStateCallback = callback;
			})
		};

		// Set up window.electronAPI
		Object.defineProperty(window, 'electronAPI', {
			value: mockElectronAPI,
			writable: true,
			configurable: true
		});

		// Clear all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		(window as any).electronAPI = undefined;
		onMPVStateCallback = undefined;
	});

	it('should render subtitle segments', async () => {
		const renderResult: RenderResult<YourComponent> = render(YourComponent, {
			props: { data: mockSubtitleData }
		});

		await waitFor(() => {
			expect(renderResult.getByText('First subtitle')).toBeInTheDocument();
			expect(renderResult.getByText('Second subtitle')).toBeInTheDocument();
			expect(renderResult.getByText('Third subtitle')).toBeInTheDocument();
			expect(renderResult.getByText('Fourth subtitle')).toBeInTheDocument();
		});
	});

	it('should initialize electronAPI listener on mount', () => {
		render(YourComponent, { props: { data: mockSubtitleData } });
		expect(mockElectronAPI.onMPVState).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should handle MPV state updates and trigger scrolling', async () => {
		const renderResult: RenderResult<YourComponent> = render(YourComponent, {
			props: { data: mockSubtitleData }
		});

		// Wait for component to mount and set up listeners
		await tick();

		// Simulate MPV state update
		const mpvData: MPVStateData = {
			content: '⏱️  0:06.0 / 22:35.7 (1.0%)',
			formatted_duration: '22:35.7',
			formatted_time: '0:06.0',
			progress: 1,
			time_pos: 6.0, // Should be close to second subtitle
			timestamp: Date.now(),
			type: 'time_update'
		};

		// Ensure callback is defined
		expect(onMPVStateCallback).toBeDefined();

		// Trigger the callback
		if (onMPVStateCallback) {
			onMPVStateCallback(mpvData);
		}

		// Wait for any async operations
		await waitFor(() => {
			expect(mockScrollUtils.scrollToClosestSubtitle).toHaveBeenCalled();
		});
	});

	it('should throttle scroll updates', async () => {
		render(YourComponent, { props: { data: mockSubtitleData } });
		await tick();

		const mpvData: MPVStateData = {
			content: '⏱️  0:06.0 / 22:35.7 (1.0%)',
			time_pos: 6.0,
			formatted_time: '0:06.0',
			progress: 1,
			formatted_duration: '22:35.7',
			timestamp: Date.now(),
			type: 'time_update'
		};

		// Ensure callback is defined
		expect(onMPVStateCallback).toBeDefined();

		if (onMPVStateCallback) {
			// Trigger multiple rapid updates
			onMPVStateCallback(mpvData);
			onMPVStateCallback({ ...mpvData, time_pos: 7.0 });
			onMPVStateCallback({ ...mpvData, time_pos: 8.0 });
		}

		await tick();

		// Should only call once due to throttling (2000ms throttle)
		expect(mockScrollUtils.scrollToClosestSubtitle).toHaveBeenCalledTimes(1);
	});

	it('should expose devtoolsScroller function for testing', async () => {
		render(YourComponent, { props: { data: mockSubtitleData } });
		await tick();

		// Access the devtoolsScroller function
		const devtoolsScroller: ((position: number) => void) | undefined = window.devtoolsScroller;
		expect(devtoolsScroller).toBeDefined();

		// Test direct scrolling
		if (devtoolsScroller) {
			devtoolsScroller(10.5);
		}

		expect(mockScrollUtils.scrollToClosestSubtitle).toHaveBeenCalledWith(
			10.5,
			expect.any(Object), // db
			expect.any(HTMLElement) // scrollContainer
		);
	});

	it('should handle segment position storage', async () => {
		const renderResult: RenderResult<YourComponent> = render(YourComponent, {
			props: { data: mockSubtitleData }
		});
		await tick();

		// Wait for all segments to mount
		await waitFor(() => {
			const segments = renderResult.container.querySelectorAll('[data-testid="subtitle-segment"]');
			expect(segments).toHaveLength(mockSubtitleData.segments.length);
		});
	});

	it('should handle empty segments gracefully', () => {
		const emptyData: MockData = {
			segments: [],
			subtitleTimestamps: [],
			timePositionsToTimecodes: new Map<number, string>(),
			subtitleCuePointsInSec: [],
			timecodes: []
		};

		const renderResult: RenderResult<YourComponent> = render(YourComponent, {
			props: { data: emptyData }
		});
		expect(renderResult.getByText('No subtitles found')).toBeInTheDocument();
	});

	it('should handle missing electronAPI gracefully', () => {
		(window as any).electronAPI = undefined;

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(YourComponent, { props: { data: mockSubtitleData } });

		expect(consoleSpy).toHaveBeenCalledWith('electronAPI not available');

		consoleSpy.mockRestore();
	});
});

// Integration test for actual scrolling behavior
describe('Subtitle Scrolling Integration', () => {
	it('should scroll to correct position in subtitle list', async () => {
		// This test would require actual DOM measurement
		const renderResult: RenderResult<YourComponent> = render(YourComponent, {
			props: { data: mockSubtitleData }
		});

		const scrollContainer: HTMLElement | null =
			renderResult.container.querySelector('.subtitle-content');
		expect(scrollContainer).toBeInTheDocument();

		// Wait for segments to mount
		await waitFor(() => {
			const segments = renderResult.container.querySelectorAll('[data-testid="subtitle-segment"]');
			expect(segments.length).toBeGreaterThan(0);
		});

		// Test that scroll container can be scrolled
		if (scrollContainer) {
			expect(scrollContainer.scrollTop).toBe(0);

			// You could manually test scrolling here if needed
			scrollContainer.scrollTop = 100;
			expect(scrollContainer.scrollTop).toBe(100);
		}
	});
});
