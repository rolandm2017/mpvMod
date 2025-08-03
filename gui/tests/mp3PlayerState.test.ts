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

    describe('Context switch', () => {
        //
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

            expect(mockWaveSurfer.seekTo).toHaveBeenCalledWith(10 / 30); // 0.333...
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
    // Test for the position inheritance bug
    describe('Position Inheritance Bug', () => {
        let player: MP3PlayerState;

        beforeEach(() => {
            vi.clearAllMocks();
            mockWaveSurfer.getCurrentTime.mockReturnValue(0);
            mockWaveSurfer.getDuration.mockReturnValue(30);
            player = new MP3PlayerState(30, mockWaveSurfer as any);
            player.setRegion(10, 15); // 5-second region from 10s to 15s
        });

        it('should preserve main playback position after region handoff and progression', () => {
            // Step 1: Play region to 60% through (13 seconds)
            player.playRegion();
            mockWaveSurfer.getCurrentTime.mockReturnValue(13); // 60% through region
            player.pauseRegion();

            // Verify region paused at correct position
            expect(player.getState().region.currentTime).toBe(13);

            // Step 2: Switch to main (inherits position)
            player.playMain();
            expect(player.getState().main.currentTime).toBe(13); // inherited from region

            // Step 3: Let main play past region boundary (to 18 seconds)
            mockWaveSurfer.getCurrentTime.mockReturnValue(18);
            player.handleTimeUpdate(18);
            expect(player.getState().main.currentTime).toBe(18);

            // Step 4: Pause main
            player.pauseMain();
            expect(player.getState().main.currentTime).toBe(18); // should preserve 18s

            // Step 5: Resume main - should start from 18s, NOT jump back to 15s
            player.playMain();
            expect(mockWaveSurfer.seekTo).toHaveBeenLastCalledWith(18 / 30); // 0.6
            expect(player.getState().main.currentTime).toBe(18);
        });

        it('should not be affected by region boundaries during main playback', () => {
            // Start main at 8 seconds (before region)
            mockWaveSurfer.getCurrentTime.mockReturnValue(8);
            player.playMain();
            player.pauseMain();

            // Resume and play through region boundary
            player.playMain();

            // Progress past region end
            mockWaveSurfer.getCurrentTime.mockReturnValue(20);
            player.handleTimeUpdate(20);

            // Pause and resume - should stay at 20s
            player.pauseMain();
            player.playMain();

            expect(mockWaveSurfer.seekTo).toHaveBeenLastCalledWith(20 / 30);
            expect(player.getState().main.currentTime).toBe(20);
        });

        it('should handle multiple region->main switches correctly', () => {
            // Play region, switch to main, play past region, switch back to region, then back to main

            // Region at 12s
            player.playRegion();
            mockWaveSurfer.getCurrentTime.mockReturnValue(12);

            // Switch to main (inherits 12s)
            player.playMain();

            // Progress to 20s
            mockWaveSurfer.getCurrentTime.mockReturnValue(20);
            player.handleTimeUpdate(20);
            player.pauseMain();

            // Play region again (should start from region start, not 20s)
            player.playRegion();
            expect(mockWaveSurfer.seekTo).toHaveBeenLastCalledWith(12 / 30); // region currentTime

            // Progress region to 14s
            mockWaveSurfer.getCurrentTime.mockReturnValue(14);

            // Switch back to main - should NOT inherit region position since main was at 20s
            player.playMain();
            expect(player.getState().main.currentTime).toBe(14); // THIS MIGHT BE THE BUG
            // Should it be 20s (preserved main position) or 14s (inherited from region)?
        });
    });
});

// Debug helper for manual testing
export function debugPositionBug(player: MP3PlayerState) {
    console.log('🐛 Testing position inheritance bug...');

    player.setRegion(10, 15);

    // Log each step
    console.log('1. Playing region...');
    player.playRegion();

    console.log('2. Pausing region at 13s...');
    // Simulate getCurrentTime returning 13
    player.handleTimeUpdate(13);
    player.pauseRegion();
    console.log('Region position:', player.getState().region.currentTime);

    console.log('3. Switching to main...');
    player.playMain();
    console.log('Main inherited position:', player.getState().main.currentTime);

    console.log('4. Progressing to 18s...');
    player.handleTimeUpdate(18);
    console.log('Main current position:', player.getState().main.currentTime);

    console.log('5. Pausing main...');
    player.pauseMain();
    console.log('Main paused at:', player.getState().main.currentTime);

    console.log('6. Resuming main...');
    player.playMain();
    console.log('Main should resume at 18s, actually at:', player.getState().main.currentTime);

    // Check for the bug
    if (player.getState().main.currentTime !== 18) {
        console.error('🚨 BUG DETECTED: Main jumped back instead of resuming at 18s');
    } else {
        console.log('✅ Behavior correct: Main resumed at proper position');
    }
}
