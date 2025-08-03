import WaveSurfer from "wavesurfer.js";

interface PlaybackContext {
    isPlaying: boolean; //
    currentTime: number;
    startTime: number;
    endTime: number;
}

// fdsfds
type ActiveContext = "main" | "region" | null;

interface PlayerState {
    main: PlaybackContext;
    region: PlaybackContext;
    activeContext: ActiveContext;
    currentTime: number;
    duration: number;
}

// Core state management for MP3 player with region selection

export class MP3PlayerState {
    private surfer: WaveSurfer;
    private duration: number = 0;
    private main: PlaybackContext;
    private region: PlaybackContext;
    private activeContext: ActiveContext = null;

    constructor(duration: number, surfer: WaveSurfer) {
        this.surfer = surfer;
        this.duration = duration;

        // Two separate playback contexts
        this.main = {
            isPlaying: false,
            currentTime: 0,
            startTime: 0,
            endTime: this.duration // will be set to duration
        };

        this.region = {
            isPlaying: false,
            currentTime: 0,
            startTime: 0, // left bracket position
            endTime: 0 // right bracket position
        };

        this.activeContext = null; // 'main' or 'region' - only one can play at a time
    }

    // Set region boundaries (in seconds)
    setRegion(startTime: number, endTime: number): void {
        // fixme: I move left bracket to the right past cursor, cursor stays where it is. Shoudl be, "is moved with it"
        this.region.startTime = startTime;
        this.region.endTime = endTime;
        const initCondition = this.region.currentTime === 0;
        const cursorIsPastStart = this.region.currentTime > startTime + 1;
        if (initCondition) {
            this.region.currentTime = startTime;
        } else if (cursorIsPastStart) {
            this.region.currentTime = this.region.currentTime; // null change
        }
        const cursorIsPastNewEndTime = this.region.currentTime > endTime;
        if (cursorIsPastNewEndTime) {
            // "If cursor is past new End Time, Wavesurfer cursor is moved back"
            this.surfer.seekTo(startTime / this.duration);
            this.region.currentTime = startTime;
        }
        const startBracketIsAheadOfCursor = this.region.currentTime < startTime;
        if (startBracketIsAheadOfCursor) {
            this.surfer.seekTo(startTime / this.duration);
            this.region.currentTime = startTime;
        }
    }

    // Main playback controls
    playMain() {
        // If region is playing, inherit its current position
        if (this.activeContext === "region") {
            this.main.currentTime = this.surfer.getCurrentTime();
        }

        this.pauseRegion(); // Stop region if playing

        if (this.main.isPlaying) return; // Already playing

        console.log("seek to: ", this.main.currentTime, "81ru");

        this.surfer.seekTo(this.main.currentTime / this.duration);
        this.surfer.play();
        this.main.isPlaying = true;
        this.activeContext = "main";
    }

    pauseMain() {
        if (!this.main.isPlaying) return;

        this.surfer.pause();
        this.main.isPlaying = false;
        this.main.currentTime = this.surfer.getCurrentTime();
        this.activeContext = null;
    }

    // Region playback controls
    playRegion() {
        console.log(this.region, "THIS.region");
        this.pauseMain(); // Stop main if playing

        if (this.region.isPlaying) return; // Already playing

        this.main.startTime = this.region.currentTime;
        this.surfer.seekTo(this.region.currentTime / this.duration);

        this.surfer.play();
        this.region.isPlaying = true;
        this.activeContext = "region";
    }

    pauseRegion() {
        if (!this.region.isPlaying) return;

        this.surfer.pause();
        this.region.isPlaying = false;
        const currentTime = this.surfer.getCurrentTime();
        this.region.currentTime = currentTime;
        this.activeContext = "region"; // still

        // update main context
        this.main.startTime = currentTime;
    }

    // Universal pause (pauses whatever is playing)
    pause() {
        if (this.activeContext === "main") {
            this.pauseMain();
        } else if (this.activeContext === "region") {
            this.pauseRegion();
        }
    }

    // Handle audio timeupdate events
    handleTimeUpdate(currentTime: number) {
        console.log("HANDLE TIME UPATE:", currentTime);
        console.log("context:", this.activeContext);
        // FIXME: Instead it's, "take current time as argument, from outside"

        if (this.activeContext === "main") {
            this.main.currentTime = currentTime;

            // Check if we've reached the end
            if (currentTime >= this.main.endTime) {
                this.pauseMain();
            }
        } else if (this.activeContext === "region") {
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
        /**
         * It's the "ran out of audio data" event, not a manual pause or stop
         */
        if (this.activeContext === "main") {
            this.main.isPlaying = false;
            this.main.currentTime = 0; // Reset to beginning
        } else if (this.activeContext === "region") {
            this.region.isPlaying = false;
            this.region.currentTime = this.region.startTime; // Reset to region start
        }
        this.activeContext = null;
    }

    acknowledgeEvent(eventTime: number) {
        // used to check that play/pause occurred as expected
    }

    // Get current playhead position for UI display
    getCurrentTime(): number {
        if (this.activeContext === "main") {
            return this.main.currentTime;
        } else if (this.activeContext === "region") {
            return this.region.currentTime;
        } else {
            // When paused, show the respective context's saved position
            return this.main.isPlaying === false && this.region.isPlaying === false
                ? this.main.currentTime
                : this.surfer.getCurrentTime();
        }
    }

    // Get state for UI updates
    getState(): PlayerState {
        return {
            main: { ...this.main },
            region: { ...this.region },
            activeContext: this.activeContext,
            currentTime: this.getCurrentTime(),
            duration: this.duration
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
