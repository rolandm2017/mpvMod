import type {
    PlayerPosition,
    SubtitleTiming,
    TimecodeString,
} from '$lib/types';
import { SubtitleHeights } from './subtitleHeights';
import { Finder } from './subtitleScroll';

import { parseTimecodeToSeconds } from './parsing';

export class SubtitleDatabase {
    /*
     *   Problem statent: It's a gong show trying to wrangle data from one representation
     * into another.
     *   Solution statement: Expose only an interface for accesssing transformations.
     * Don't transform data any other way. Handle it all under the hood.
     *
     */

    subtitles: Subtitle[] = [];

    subtitleHeights: SubtitleHeights;

    subtitleTimingToTimecodesMap = new Map<SubtitleTiming, TimecodeString>();

    // the next two are a pair!
    subtitleCuePointsInSec: SubtitleTiming[] = [];
    timecodes: TimecodeString[] = [];

    constructor(
        segments: Subtitle[],
        timeMap: Map<SubtitleTiming, TimecodeString>,
        subtitleCuePointsInSec: SubtitleTiming[],
        timecodes: TimecodeString[]
    ) {
        // timecodeAsSeconds, height
        this.subtitleHeights = new SubtitleHeights();

        this.subtitles = segments;

        this.subtitleTimingToTimecodesMap = timeMap;

        // the next two are a pair!
        this.subtitleCuePointsInSec = subtitleCuePointsInSec;
        this.timecodes = timecodes;
    }

    // Class covers:
    //      - Get subtitle timecode ->  Height
    //      - Get player timestamp -> Height
    //      - Get player timestamp -> timecode
    //		- Player position -> Subtitle
    // 		- Subtitle -> Player position

    getHeightFromTimecode(timecode: TimecodeString) {
        const timecodeAsSeconds = parseTimecodeToSeconds(
            timecode.split(' --> ')[0]
        );
        return this.subtitleHeights.getHeightInternal(timecodeAsSeconds);
    }

    getHeightFromPlayerPosition(position: PlayerPosition) {
        // FIXME: you're confusing position for timing
        // getHeight works off SRT Timing
        // Actually, does it matter?
        return this.subtitleHeights.getHeightInternal(position);
    }

    setHeight(time: SubtitleTiming, height: number) {
        this.subtitleHeights.setHeightInternal(time, height);
    }

    getTimecodeForPlayerPosition(playerPosition: PlayerPosition) {
        const index = Finder.findSubtitleIndexAtPlayerTime(
            playerPosition,
            this.subtitleCuePointsInSec
        );
        return this.timecodes[index];
    }

    getSubtitleTimingFromTimecode(timecode: TimecodeString): SubtitleTiming {
        /**
         * @returns {SubtitleTiming} the subtitle timing associated with this timecodeString
         */
        // Claude asks, "do you really need 'closest without exceeding' here?"
        // and in truth I'm too tired to say
        const index = this.timecodes.indexOf(timecode);
        return this.subtitleCuePointsInSec[index];
    }
}

export class Subtitle {
    text: string;
    timecode: TimecodeString;
    timecodeInSeconds: SubtitleTiming;
    height: number = 0;

    constructor(
        text: string,
        timecode: TimecodeString,
        timecodeInSeconds: SubtitleTiming
    ) {
        this.text = text;
        this.timecode = timecode;
        this.timecodeInSeconds = timecodeInSeconds;
    }

    setHeight(height: number) {
        this.height = height;
    }
}
