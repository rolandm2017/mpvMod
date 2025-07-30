import type { SubtitleTiming } from '$lib/types';

export class SubtitleHeights {
    private entries: [SubtitleTiming, number][] = []; // [time, height]

    public size: number = 0;

    /*
     * Problem statement: I need to be able to fuzzy match a timing to a height.
     * So timings 9, 14, 22, 38 are in the entries. I have a timing "20." How can I get a height?
     * So I need a fuzzy match because just a map doesn't work: Maps don't give you the nearest match.
     *
     * Works with interpolation. Exact value MIA? Return the average of the closest two values.
     *
     * Note that the array should be sorted, and always matched 1 to 1, as subtitles are linear in order.
     */

    // Time = Timecode as seconds

    // FIXME How can there be updates? The subtitles never change height

    set(time: SubtitleTiming, height: number) {
        /**
         *  Insert in sorted order or update existing
         * */
        // Find the index where the first entry's time is greater than OR EQUAL TO the input time
        const index = this.entries.findIndex(([t]) => t >= time);

        const newEntryWouldBeHighestValue = index === -1;
        const preciseTimeAlreadyExists =
            index !== -1 && this.entries[index][0] === time;
        if (newEntryWouldBeHighestValue) {
            this.entries.push([time, height]);
        } else if (preciseTimeAlreadyExists) {
            this.entries[index][1] = height; // update
        } else {
            // bool would be "shouldInsertBetween"
            this.entries.splice(index, 0, [time, height]); // insert
        }
    }

    findFirstGrea() {}

    // Time = Timecode as seconds

    getHeight(time: SubtitleTiming): number {
        if (this.entries.length === 0) return 0;

        // Binary search for insertion point
        let left = 0,
            right = this.entries.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.entries[mid][0] === time) {
                return this.entries[mid][1]; // exact match
            } else if (this.entries[mid][0] < time) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        // Interpolate between right and left
        if (right < 0) return this.entries[0][1]; // before first
        if (left >= this.entries.length)
            return this.entries[this.entries.length - 1][1]; // after last

        const [t1, h1] = this.entries[right];
        const [t2, h2] = this.entries[left];
        const ratio = (time - t1) / (t2 - t1);
        return h1 + (h2 - h1) * ratio;
    }
}
