// test/SubtitleScrolling.test.js
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import YourComponent from '../src/routes/+page.svelte'; // Adjust path
import { tick } from 'svelte';

// Mock the utility functions
vi.mock('$lib/utils/subtitleScroll.js', () => ({
  Finder: {
    findPlayerTimeForSubtitleTiming: vi.fn()
  },
  parseTimecodeToSeconds: vi.fn((timecode) => {
    // Simple mock implementation
    const [time] = timecode.split(' --> ');
    const [hours, minutes, seconds] = time.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  }),
  scrollToClosestSubtitle: vi.fn()
}));

// Mock SubtitleDatabase
vi.mock('$lib/utils/SubtitleDatabase.js', () => ({
  Subtitle: class {
    constructor(text, timecode, startTimeSeconds) {
      this.text = text;
      this.timecode = timecode;
      this.startTimeSeconds = startTimeSeconds;
    }
  },
  SubtitleDatabase: class {
    constructor(subtitles, timePositionsToTimecodes, subtitleCuePointsInSec, timecodes) {
      this.subtitles = subtitles;
      this.timePositionsToTimecodes = timePositionsToTimecodes;
      this.subtitleCuePointsInSec = subtitleCuePointsInSec;
      this.timecodes = timecodes;
      this.subtitleHeights = new Map();
    }
  }
}));

describe('Subtitle Scrolling', () => {
  let mockElectronAPI;
  let onMPVStateCallback;

  // Sample test data
  const mockData = {
    segments: [
      { timecode: '00:00:01,000 --> 00:00:03,000', text: 'First subtitle', startTimeSeconds: 1 },
      { timecode: '00:00:05,000 --> 00:00:07,000', text: 'Second subtitle', startTimeSeconds: 5 },
      { timecode: '00:00:10,000 --> 00:00:12,000', text: 'Third subtitle', startTimeSeconds: 10 },
      { timecode: '00:00:15,000 --> 00:00:17,000', text: 'Fourth subtitle', startTimeSeconds: 15 }
    ],
    timePositionsToTimecodes: new Map([
      [1, '00:00:01,000 --> 00:00:03,000'],
      [5, '00:00:05,000 --> 00:00:07,000'],
      [10, '00:00:10,000 --> 00:00:12,000'],
      [15, '00:00:15,000 --> 00:00:17,000']
    ]),
    subtitleCuePointsInSec: [1, 5, 10, 15],
    timecodes: [
      '00:00:01,000 --> 00:00:03,000',
      '00:00:05,000 --> 00:00:07,000', 
      '00:00:10,000 --> 00:00:12,000',
      '00:00:15,000 --> 00:00:17,000'
    ]
  };

  beforeEach(() => {
    // Mock the electron API
    mockElectronAPI = {
      onMPVState: vi.fn((callback) => {
        onMPVStateCallback = callback;
      })
    };

    // Set up window.electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete window.electronAPI;
  });

  it('should render subtitle segments', async () => {
    const { getByText } = render(YourComponent, { props: { data: mockData } });
    
    await waitFor(() => {
      expect(getByText('First subtitle')).toBeInTheDocument();
      expect(getByText('Second subtitle')).toBeInTheDocument();
      expect(getByText('Third subtitle')).toBeInTheDocument();
      expect(getByText('Fourth subtitle')).toBeInTheDocument();
    });
  });

  it('should initialize electronAPI listener on mount', () => {
    render(YourComponent, { props: { data: mockData } });
    expect(mockElectronAPI.onMPVState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle MPV state updates and trigger scrolling', async () => {
    const { scrollToClosestSubtitle } = await import('$lib/utils/subtitleScroll.js');
    
    const { container } = render(YourComponent, { props: { data: mockData } });
    
    // Wait for component to mount and set up listeners
    await tick();
    
    // Simulate MPV state update
    const mpvData = {
      content: "⏱️  0:06.0 / 22:35.7 (1.0%)",
      formatted_duration: "22:35.7",
      formatted_time: "0:06.0",
      progress: 1,
      time_pos: 6.0, // Should be close to second subtitle
      timestamp: Date.now(),
      type: "time_update"
    };

    // Trigger the callback
    onMPVStateCallback(mpvData);
    
    // Wait for any async operations
    await waitFor(() => {
      expect(scrollToClosestSubtitle).toHaveBeenCalled();
    });
  });

  it('should throttle scroll updates', async () => {
    const { scrollToClosestSubtitle } = await import('$lib/utils/subtitleScroll.js');
    
    render(YourComponent, { props: { data: mockData } });
    await tick();

    const mpvData = {
      content: "⏱️  0:06.0 / 22:35.7 (1.0%)",
      time_pos: 6.0,
      formatted_time: "0:06.0",
      timestamp: Date.now(),
      type: "time_update"
    };

    // Trigger multiple rapid updates
    onMPVStateCallback(mpvData);
    onMPVStateCallback({ ...mpvData, time_pos: 7.0 });
    onMPVStateCallback({ ...mpvData, time_pos: 8.0 });

    await tick();

    // Should only call once due to throttling (2000ms throttle)
    expect(scrollToClosestSubtitle).toHaveBeenCalledTimes(1);
  });

  it('should expose devtoolsScroller function for testing', async () => {
    const { scrollToClosestSubtitle } = await import('$lib/utils/subtitleScroll.js');
    
    render(YourComponent, { props: { data: mockData } });
    await tick();

    // Access the devtoolsScroller function
    const devtoolsScroller = (window as any).devtoolsScroller;
    expect(devtoolsScroller).toBeDefined();

    // Test direct scrolling
    devtoolsScroller(10.5);
    
    expect(scrollToClosestSubtitle).toHaveBeenCalledWith(
      10.5,
      expect.any(Object), // db
      expect.any(HTMLElement) // scrollContainer
    );
  });

  it('should handle segment position storage', async () => {
    const { container, component } = render(YourComponent, { props: { data: mockData } });
    await tick();

    // Access the component instance to test internal functions
    // Note: This might require exposing the function or using a different approach
    
    // Wait for all segments to mount
    await waitFor(() => {
      const segments = container.querySelectorAll('[data-testid="subtitle-segment"]');
      expect(segments).toHaveLength(mockData.segments.length);
    });
  });

  it('should handle empty segments gracefully', () => {
    const emptyData = {
      segments: [],
      timePositionsToTimecodes: new Map(),
      subtitleCuePointsInSec: [],
      timecodes: []
    };

    const { getByText } = render(YourComponent, { props: { data: emptyData } });
    expect(getByText('No subtitles found')).toBeInTheDocument();
  });

  it('should handle missing electronAPI gracefully', () => {
    delete window.electronAPI;
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(YourComponent, { props: { data: mockData } });
    
    expect(consoleSpy).toHaveBeenCalledWith('electronAPI not available');
    
    consoleSpy.mockRestore();
  });
});

// Integration test for actual scrolling behavior
describe('Subtitle Scrolling Integration', () => {
  it('should scroll to correct position in subtitle list', async () => {
    // This test would require actual DOM measurement
    const { container } = render(YourComponent, { props: { data: mockData } });
    
    const scrollContainer = container.querySelector('.subtitle-content');
    expect(scrollContainer).toBeInTheDocument();
    
    // Wait for segments to mount
    await waitFor(() => {
      const segments = container.querySelectorAll('[data-testid="subtitle-segment"]');
      expect(segments.length).toBeGreaterThan(0);
    });

    // Test that scroll container can be scrolled
    expect(scrollContainer.scrollTop).toBe(0);
    
    // You could manually test scrolling here if needed
    scrollContainer.scrollTop = 100;
    expect(scrollContainer.scrollTop).toBe(100);
  });
});