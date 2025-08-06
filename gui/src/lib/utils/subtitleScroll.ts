import type { PlayerPosition, SubtitleTiming, TimecodeString } from "$lib/types";
import type { SubtitleDatabase } from "./subtitleDatabase";
import type { SubtitleHeights } from "./subtitleHeights";

export class Finder {
    static findPlayerTimeForSubtitleTiming(
        playerPosition: PlayerPosition,
        subtitleCuePointsArr: SubtitleTiming[]
    ): SubtitleTiming {
        /**
         * For finding a subtitle that goes with a playerPosition.
         *
         * Match the biggest timestamp subtitle still smaller than the playerPosition.
         * Said another way, the subtitle plays until it is over!
         * The subtitle's start time is smaller than the playerPosition, hence it still plays,
         * until there is another subtitle with a start time smaller than the playerPosition.
         *
         * @returns {SubtitleTiming} the subtitle associated with that playerPosition
         */
        let left = 0,
            right = subtitleCuePointsArr.length - 1;
        let result = -1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);

            if (subtitleCuePointsArr[mid] <= playerPosition) {
                result = mid; // This could be our answer
                left = mid + 1; // Look for something larger
            } else {
                right = mid - 1; // Look for something smaller
            }
        }

        return result === -1 ? 0 : subtitleCuePointsArr[result];
    }

    static findSubtitleIndexAtPlayerTime(playerPosition: PlayerPosition, cuePointsInSecArr: SubtitleTiming[]): number {
        /**
         * Used to take the position of a subtitle cue point in sec and find the most relevant subtitle.
         *
         * @returns {number} the index of the subtitle associated with that player position
         */
        let left = 0,
            right = cuePointsInSecArr.length - 1;
        let result = -1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (cuePointsInSecArr[mid] <= playerPosition) {
                result = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return result === -1 ? 0 : result;
    }
}

// Usage
// const index = findTimestampIndex(n, data.timestamps);
// const timecode = data.timecodes[index];

export function scrollToClosestSubtitle(
    playerPosition: PlayerPosition,
    // subtitleCuePointsArr: SubtitleTiming[],
    // subtitleHeights: SubtitleHeights,
    db: SubtitleDatabase,
    scrollContainer: HTMLDivElement
) {
    /*
     * @param playerPosition - the playerPosition of the frame
     * @param subtitleCuePointsArr - an arr of all subtitle's start times
     */
    if (!scrollContainer) {
        // console.log(scrollContainer);
        throw new Error("Scroll Container was null");
    }
    // PLAYER POSITION -> ??? ->
    // ?? -> SubtitleTiming
    // SubtitleTiming -> Height
    const corresponding: SubtitleTiming = Finder.findPlayerTimeForSubtitleTiming(
        playerPosition,
        db.subtitleCuePointsInSec
    );
    // const correspondingSubtitleIndex = Finder.findSubtitleIndexAtPlayerTime(playerPosition, db.subtitleCuePointsInSec);
    // FIXME: HAVE: Lots of stuff
    // FIXME: WANT: The height of the subtitle that is just like, "a few units" away.
    const heightForSub = db.getHeightFromPlayerPosition(corresponding) ?? 0;

    const heightForCenteringSubtitle = scrollContainer.clientHeight / 2;
    const finalHeight = heightForSub - heightForCenteringSubtitle;
    // TODO: "GetHeightOfContainer", subtract half

    // WANT: viewport at position of related subtitle
    scrollToLocation(finalHeight, scrollContainer);
    return finalHeight;
}

export function scrollContainerTopToClosestSubtitle(
    playerPosition: PlayerPosition,
    // subtitleCuePointsArr: SubtitleTiming[],
    // subtitleHeights: SubtitleHeights,
    db: SubtitleDatabase,
    scrollContainer: HTMLDivElement
) {
    /** PROBLEM: This moves the current subtitle to the very top of the container!
     *      -> I want it to scroll that subtitle to the middle of it.
     * @param playerPosition - the playerPosition of the frame
     * @param subtitleCuePointsArr - an arr of all subtitle's start times
     */
    if (!scrollContainer) {
        // console.log(scrollContainer);
        throw new Error("Scroll Container was null");
    }
    // PLAYER POSITION -> ??? ->
    // ?? -> SubtitleTiming
    // SubtitleTiming -> Height
    const corresponding: SubtitleTiming = Finder.findPlayerTimeForSubtitleTiming(
        playerPosition,
        db.subtitleCuePointsInSec
    );
    // const correspondingSubtitleIndex = Finder.findSubtitleIndexAtPlayerTime(playerPosition, db.subtitleCuePointsInSec)
    const heightForSub = db.getHeightFromPlayerPosition(corresponding) ?? 0;

    // WANT: viewport at position of related subtitle
    scrollToLocation(heightForSub, scrollContainer);
    return heightForSub; // TODO: Try "corresponding", try storing parseTimecodeToSeconds(timecode)
}

export function scrollToLocation(location: number, scrollContainer: HTMLDivElement) {
    scrollContainer.scrollTo({
        top: location,
        behavior: "auto" // "auto", or "smooth"
    });
}
