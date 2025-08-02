// mp3PlayerState.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MP3PlayerState } from '../src/lib/utils/mp3PlayerState';

// Mock WaveSurfer
const mockWaveSurfer = {
  getCurrentTime: vi.fn(),
  seekTo: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  getDuration: vi.fn()
};

describe('MP3PlayerState', () => {
  let player: MP3PlayerState;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaveSurfer.getCurrentTime.mockReturnValue(0);
    mockWaveSurfer.getDuration.mockReturnValue(30);
    player = new MP3PlayerState(30, mockWaveSurfer as any);
  });

  describe('Region Setting', () => {
    it('should set region boundaries correctly', () => {
      player.setRegion(10, 20);
      const state = player.getState();
      
      expect(state.region.startTime).toBe(10);
      expect(state.region.endTime).toBe(20);
      expect(state.region.currentTime).toBe(10); // resets to start
    });

	it('handles multiple boundary changes', () => {
      player.setRegion(10, 20);
      player.setRegion(3, 13);
      player.setRegion(20, 23);
      const state = player.getState();
      
      expect(state.region.startTime).toBe(20);
      expect(state.region.endTime).toBe(23);
      expect(state.region.currentTime).toBe(20);
    });
  });

  describe('Main Playback', () => {
    it('should start main playback from beginning', () => {
      player.playMain();
      
      expect(mockWaveSurfer.seekTo).toHaveBeenCalledWith(0); // 0/30 = 0
      expect(mockWaveSurfer.play).toHaveBeenCalled();
      expect(player.getState().main.isPlaying).toBe(true);
      expect(player.getState().activeContext).toBe('main');
    });

    it('should pause main playback', () => {
      mockWaveSurfer.getCurrentTime.mockReturnValue(15);
      player.playMain();
      player.pauseMain();
      
      expect(mockWaveSurfer.pause).toHaveBeenCalled();
      expect(player.getState().main.isPlaying).toBe(false);
      expect(player.getState().main.currentTime).toBe(15);
      expect(player.getState().activeContext).toBe(null);
    });

    it('should resume main from saved position', () => {
      // Simulate having played and paused at 15 seconds
      mockWaveSurfer.getCurrentTime.mockReturnValue(15);
      player.playMain();
      player.pauseMain();
      
      // Now resume
      player.playMain();
      expect(mockWaveSurfer.seekTo).toHaveBeenLastCalledWith(0.5); // 15/30 = 0.5
    });
  });

  describe('Region Playback', () => {
    beforeEach(() => {
      player.setRegion(10, 20);
    });

    it('should start region playback from region start', () => {
      player.playRegion();
      
      expect(mockWaveSurfer.seekTo).toHaveBeenCalledWith(10/30); // 0.333...
      expect(mockWaveSurfer.play).toHaveBeenCalled();
      expect(player.getState().region.isPlaying).toBe(true);
      expect(player.getState().activeContext).toBe('region');
    });

    it('should pause region playback', () => {
      mockWaveSurfer.getCurrentTime.mockReturnValue(15);
      player.playRegion();
      player.pauseRegion();
      
      expect(mockWaveSurfer.pause).toHaveBeenCalled();
      expect(player.getState().region.isPlaying).toBe(false);
      expect(player.getState().region.currentTime).toBe(15);
    });
  });

  describe('Context Switching', () => {
    beforeEach(() => {
      player.setRegion(10, 20);
    });

    it('should switch from main to region (main paused)', () => {
      // Start main, then pause
      mockWaveSurfer.getCurrentTime.mockReturnValue(5);
      player.playMain();
      player.pauseMain();
      
      // Start region - main should stay paused
      player.playRegion();
      
      const state = player.getState();
      expect(state.main.isPlaying).toBe(false);
      expect(state.main.currentTime).toBe(5); // preserved
      expect(state.region.isPlaying).toBe(true);
      expect(state.activeContext).toBe('region');
    });

    it('should switch from region to main (inherit position)', () => {
      // Start region playback
      player.playRegion();
      mockWaveSurfer.getCurrentTime.mockReturnValue(15); // playing at 15 seconds
      
      // Switch to main - should inherit position
      player.playMain();
      
      const state = player.getState();
      expect(state.region.isPlaying).toBe(false);
      expect(state.main.isPlaying).toBe(true);
      expect(state.main.currentTime).toBe(15); // inherited from region
      expect(mockWaveSurfer.seekTo).toHaveBeenLastCalledWith(0.5); // 15/30
    });

    it('should switch from playing main to region', () => {
      // Start main playback
      player.playMain();
      
      // Switch to region - main should be paused
      player.playRegion();
      
      const state = player.getState();
      expect(state.main.isPlaying).toBe(false);
      expect(state.region.isPlaying).toBe(true);
      expect(state.activeContext).toBe('region');
    });

    it('should switch from playing region to main', () => {
      // Start region playback
      player.playRegion();
      mockWaveSurfer.getCurrentTime.mockReturnValue(15);
      
      // Switch to main - should inherit and pause region
      player.playMain();
      
      const state = player.getState();
      expect(state.region.isPlaying).toBe(false);
      expect(state.main.isPlaying).toBe(true);
      expect(state.main.currentTime).toBe(15);
    });
  });

  describe('Time Updates', () => {
    beforeEach(() => {
      player.setRegion(10, 20);
    });

    it('should auto-pause main at end of file', () => {
      player.playMain();
      player.handleTimeUpdate(30); // reached end
      
      expect(player.getState().main.isPlaying).toBe(false);
    });

    it('should auto-pause region at region boundary', () => {
      player.playRegion();
      player.handleTimeUpdate(20); // reached region end
      
      const state = player.getState();
      expect(state.region.isPlaying).toBe(false);
      expect(state.region.currentTime).toBe(10); // reset to region start
    });

    it('should update currentTime during main playback', () => {
      player.playMain();
      player.handleTimeUpdate(15);
      
      expect(player.getState().main.currentTime).toBe(15);
    });

    it('should update currentTime during region playback', () => {
      player.playRegion();
      player.handleTimeUpdate(15);
      
      expect(player.getState().region.currentTime).toBe(15);
    });
  });

  describe('File End Handling', () => {
    it('should reset main on file end', () => {
      player.playMain();
      player.handleEnded();
      
      const state = player.getState();
      expect(state.main.isPlaying).toBe(false);
      expect(state.main.currentTime).toBe(0);
      expect(state.activeContext).toBe(null);
    });

    it('should reset region to start on file end', () => {
      player.setRegion(10, 20);
      player.playRegion();
      player.handleEnded();
      
      const state = player.getState();
      expect(state.region.isPlaying).toBe(false);
      expect(state.region.currentTime).toBe(10); // back to region start
      expect(state.activeContext).toBe(null);
    });
  });

  describe('getCurrentTime()', () => {
    beforeEach(() => {
      player.setRegion(10, 20);
    });

    it('should return main time when main is active', () => {
      player.playMain();
      player.handleTimeUpdate(15);
      
      expect(player.getCurrentTime()).toBe(15);
    });

    it('should return region time when region is active', () => {
      player.playRegion();
      player.handleTimeUpdate(12);
      
      expect(player.getCurrentTime()).toBe(12);
    });

    it('should return main time when both paused', () => {
      mockWaveSurfer.getCurrentTime.mockReturnValue(8);
      player.playMain();
      player.pauseMain();
      
      expect(player.getCurrentTime()).toBe(8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid play/pause cycles', () => {
      player.playMain();
      player.pauseMain();
      player.playMain();
      player.pauseMain();
      
      expect(player.getState().activeContext).toBe(null);
      expect(mockWaveSurfer.play).toHaveBeenCalledTimes(2);
      expect(mockWaveSurfer.pause).toHaveBeenCalledTimes(2);
    });

    it('should ignore play when already playing same context', () => {
      player.playMain();
      const playCallCount = mockWaveSurfer.play.mock.calls.length;
      
      player.playMain(); // should be ignored
      
      expect(mockWaveSurfer.play).toHaveBeenCalledTimes(playCallCount);
    });

    it('should handle zero-length regions gracefully', () => {
      player.setRegion(10, 10); // zero length
      player.playRegion();
      player.handleTimeUpdate(10);
      
      expect(player.getState().region.isPlaying).toBe(false);
    });
  });
});
