import WaveSurfer from 'wavesurfer.js';

interface PlaybackContext {
    isPlaying: boolean;
    currentTime: number;
    startTime: number;
    endTime: number;
}

type ActiveContext = 'main' | 'region' | null;

interface PlayerState {
    main: PlaybackContext;
    region: PlaybackContext;
    activeContext: ActiveContext;
    currentTime: number;
    duration: number;
}

// Core state management for MP3 player with region selection

class MP3PlayerState {
    private surfer: WaveSurfer;
    private audio: HTMLAudioElement;
    private duration: number = 0;
    private main: PlaybackContext;
    private region: PlaybackContext;
    private activeContext: ActiveContext = null;

    constructor(audioElement: HTMLAudioElement, surfer: WaveSurfer) {
        this.surfer = surfer;
        this.audio = audioElement;
        this.duration = audioElement.duration;

        // Listen for time updates
        this.audio.addEventListener('timeupdate', () =>
            this.handleTimeUpdate()
        );
        this.audio.addEventListener('ended', () => this.handleEnded());
        this.duration = 0;

        // Two separate playback contexts
        this.main = {
            isPlaying: false,
            currentTime: 0,
            startTime: 0,
            endTime: this.duration, // will be set to duration
        };

        this.region = {
            isPlaying: false,
            currentTime: 0,
            startTime: 0, // left bracket position
            endTime: 0, // right bracket position
        };

        this.activeContext = null; // 'main' or 'region' - only one can play at a time
    }

    // Set region boundaries (in seconds)
    setRegion(startTime: number, endTime: number): void {
        this.region.startTime = startTime;
        this.region.endTime = endTime;
        this.region.currentTime = startTime; // reset region playhead
    }

    // Main playback controls
    playMain() {
        // If region is playing, inherit its current position
        if (this.activeContext === 'region') {
            this.main.currentTime = this.audio.currentTime;
        }

        this.pauseRegion(); // Stop region if playing

        if (this.main.isPlaying) return; // Already playing

        this.audio.currentTime = this.main.currentTime;
        this.audio.play();
        this.main.isPlaying = true;
        this.activeContext = 'main';
    }

    pauseMain() {
        if (!this.main.isPlaying) return;

        this.surfer.pause();
        this.main.isPlaying = false;
        this.main.currentTime = this.audio.currentTime;
        this.activeContext = null;
    }

    // Region playback controls
    playRegion() {
        this.pauseMain(); // Stop main if playing

        if (this.region.isPlaying) return; // Already playing

        this.surfer.currentTime = this.region.currentTime;
        // todo: make be, this.waveshaper.play()
        this.surfer.play();
        this.region.isPlaying = true;
        this.activeContext = 'region';
    }

    pauseRegion() {
        if (!this.region.isPlaying) return;

        // todo: make be, this.waveshaper.pause()
        this.surfer.pause();
        this.region.isPlaying = false;
        this.region.currentTime = this.surfer.getCurrentTime();
        this.activeContext = null;
    }

    // Universal pause (pauses whatever is playing)
    pause() {
        if (this.activeContext === 'main') {
            this.pauseMain();
        } else if (this.activeContext === 'region') {
            this.pauseRegion();
        }
    }

    // Handle audio timeupdate events
    handleTimeUpdate() {
        // FIXME: Instead it's, "take current time as argument, from outside"
        const currentTime = this.surfer.getCurrentTime();

        if (this.activeContext === 'main') {
            this.main.currentTime = currentTime;

            // Check if we've reached the end
            if (currentTime >= this.main.endTime) {
                this.pauseMain();
            }
        } else if (this.activeContext === 'region') {
            this.region.currentTime = currentTime;

            // Check if we've gone past the region end
            if (currentTime >= this.region.endTime) {
                this.pauseRegion();
                this.region.currentTime = this.region.startTime; // Reset to region start
            }
        }
    }

    // Handle audio ended event
    handleEnded() {
        if (this.activeContext === 'main') {
            this.main.isPlaying = false;
            this.main.currentTime = 0; // Reset to beginning
        } else if (this.activeContext === 'region') {
            this.region.isPlaying = false;
            this.region.currentTime = this.region.startTime; // Reset to region start
        }
        this.activeContext = null;
    }

    // Get current playhead position for UI display
    getCurrentTime(): number {
        if (this.activeContext === 'main') {
            return this.main.currentTime;
        } else if (this.activeContext === 'region') {
            return this.region.currentTime;
        } else {
            // When paused, show the respective context's saved position
            return this.main.isPlaying === false &&
                this.region.isPlaying === false
                ? this.main.currentTime
                : this.audio.currentTime;
        }
    }

    // Get state for UI updates
    getState() {
        return {
            main: { ...this.main },
            region: { ...this.region },
            activeContext: this.activeContext,
            currentTime: this.getCurrentTime(),
            duration: this.duration,
        };
    }
}

// Usage example:

// Initialize with audio element
// const audio = document.getElementById('audioElement');
// const player = new MP3PlayerState(audio);

// // Set region (e.g., from 10 seconds to 25 seconds)
// player.setRegion(10, 25);

// // UI event handlers
// document.getElementById('playMainBtn').addEventListener('click', () => {
//   if (player.main.isPlaying) {
//     player.pauseMain();
//   } else {
//     player.playMain();
//   }
//   updateUI();
// });

// document.getElementById('playRegionBtn').addEventListener('click', () => {
//   if (player.region.isPlaying) {
//     player.pauseRegion();
//   } else {
//     player.playRegion();
//   }
//   updateUI();
// });

// function updateUI() {
//   const state = player.getState();

//   // Update play/pause button states
//   document.getElementById('playMainBtn').textContent =
//     state.main.isPlaying ? 'Pause Main' : 'Play Main';

//   document.getElementById('playRegionBtn').textContent =
//     state.region.isPlaying ? 'Pause Region' : 'Play Region';

//   // Update progress indicators
//   updateProgressBar(state.currentTime, state.duration);
//   updateRegionIndicator(state.region.startTime, state.region.endTime, state.currentTime);
// }
