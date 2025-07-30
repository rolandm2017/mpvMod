<script lang="ts">
    import { onMount, onDestroy, getContext } from 'svelte';

    import CardBuilder from '$lib/CardBuilder.svelte';
    import SubtitleSegment from '$lib/SubtitleSegment.svelte';

    import { parseTimecodeToSeconds } from '$lib/utils/parsing.js';
    import {
        Finder,
        scrollToClosestSubtitle,
        scrollToLocation,
    } from '$lib/utils/subtitleScroll.js';
    import { Subtitle, SubtitleDatabase } from '$lib/utils/subtitleDatabase.js';
    import type { PlayerPosition, TimecodeString } from '$lib/types.js';
    import { SegmentMountingTracker } from '$lib/utils/SegmentMountingTracker.js';

    export let data;

    let scrollContainer: HTMLDivElement;

    let currentHighlightedElement: HTMLDivElement | null = null;
    let currentHighlightedTimecode = '';
    let segmentElements = new Map<string, HTMLDivElement>(); // timecode -> element reference

    let db: SubtitleDatabase;
    let mountingTracker: SegmentMountingTracker;

    let content = '';
    let playerPosition = 0;
    let formattedTime = '';

    let lastScrollTime = 0;

    // scrollToLocation(heightForSub);
    let allSegmentsMounted = false;

    // TODO: Color the subtitle in question

    onMount(() => {
        (window as any).playerPositionDevTool = playerPositionDevTool;
        (window as any).timecodeDevTool = timecodeDevTool;

        let subtitles: Subtitle[] = [];

        // Use the pre-built arrays from server
        data.segments.forEach((s) => {
            let newSub = new Subtitle(s.text, s.timecode, s.startTimeSeconds);
            subtitles.push(newSub);
        });

        db = new SubtitleDatabase(
            subtitles,
            data.subtitleTimingToTimecodesMap,
            data.subtitleCuePointsInSec,
            data.timecodes
        );
        mountingTracker = new SegmentMountingTracker(data.segments.length);

        // Expose for testing
        if (typeof window !== 'undefined') {
            window.allSegmentsMounted = false;
            window.testInteger = 99;
            window.tracker = mountingTracker;
            window.db = db;
        }

        // console.log('Window object:', window);
        // console.log('electronAPI available:', !!window.electronAPI);

        if (window.electronAPI) {
            console.log('Running onMPVstate');
            window.electronAPI.onMPVState((data) => {
                // content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
                // formatted_duration :  "22:35.7"
                // formatted_time :  "0:13.6"
                // progress :  1
                // time_pos :  13.555
                // timestamp :  1753652691.9598007
                // type :  "time_update"
                content = data.content;
                playerPosition = data.time_pos;
                formattedTime = data.formatted_time;

                // Auto-scroll to current position (throttled)
                const now = Date.now();
                if (now - lastScrollTime > 2000) {
                    // Throttle to every 500ms
                    // highlightPlayerPositionSegment(playerPosition);
                    scrollToClosestSubtitle(
                        playerPosition,
                        db,
                        scrollContainer
                    );

                    lastScrollTime = now;
                }
            });
        } else {
            console.error('electronAPI not available');
        }
    });

    function highlightPlayerPositionSegment(playerPosition: number) {
        const corresponding: number = Finder.findPlayerTimeForSubtitleTiming(
            playerPosition,
            db.subtitleCuePointsInSec
        );
        // FIXME: timecode's are not found. the timePositions are never loaded
        // FIXME: the problem is i'm doing "get" for a precise value, when I want fuzzy matching
        const timecode = db.subtitleTimingToTimecodesMap.get(corresponding);
        if (timecode) {
            highlightSegment(timecode);
        } else {
            console.log(timecode, 'not found');
        }
    }

    export function highlightSegment(timecode: TimecodeString) {
        /*
         * Timecodes are a subtitle thing, timestamps are a player position thing.
         */

        if (currentHighlightedElement) {
            currentHighlightedElement.classList.remove('highlighted');
        }

        const element = segmentElements.get(timecode);
        if (element) {
            element.classList.add('highlighted');
            currentHighlightedElement = element;
            currentHighlightedTimecode = timecode;
        }
    }

    let callcount = 0;

    export function storeSegmentPosition(
        timecode: TimecodeString,
        y: number,
        element: HTMLDivElement
    ) {
        if (!mountingTracker) {
            console.error('mountingTracker not initialized');
            return;
        }

        callcount += 1;

        window.callcount = callcount;

        const result = mountingTracker.storeSegmentPosition(
            timecode,
            y,
            element,
            db
        );

        // Handle completion
        if (result.isComplete) {
            // console.log('All segments mounted:', mountingTracker.getStats());

            allSegmentsMounted = true;
            // console.log('All segments mounted, positions ready');
            // Expose to window for testing
            if (typeof window !== 'undefined') {
                window.allSegmentsMounted = true;
            }
        }
    }

    // export function devtoolsScroller(timestamp: number) {
    export function playerPositionDevTool(playerPosition: PlayerPosition) {
        // highlightPlayerPositionSegment(playerPosition);
        scrollToClosestSubtitle(playerPosition, db, scrollContainer);
    }
    export function timecodeDevTool(timecode: TimecodeString) {
        // tiumecode to player position
        const height = db.getHeightFromTimecode(timecode);
        scrollToLocation(height, scrollContainer);
    }
</script>

<div class="container">
    <div class="subtitle-panel">
        <div class="subtitle-header">Subtitles</div>
        <div
            class="subtitle-content"
            data-testid="scroll-container"
            bind:this={scrollContainer}
        >
            {#if data.segments.length > 0}
                {#each data.segments as segment}
                    <SubtitleSegment
                        index={segment.index}
                        timecode={segment.timecode}
                        text={segment.text}
                        emitTopOfContainer={storeSegmentPosition}
                    />
                {/each}
            {:else}
                <div class="loading">No subtitles found</div>
            {/if}
        </div>
    </div>
    <CardBuilder />
</div>

<style>
    .container {
        display: flex;
        height: 100vh;
        font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .subtitle-panel {
        width: 400px;
        background: #2a2a2a;
        display: flex;
        flex-direction: column;
        color: white;
    }

    .subtitle-header {
        padding: 15px 20px;
        background: #333;
        border-bottom: 1px solid #444;
        font-weight: 600;
    }

    .subtitle-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
    }

    .loading {
        color: #888;
        text-align: center;
        padding: 50px 20px;
    }

    .subtitle-content::-webkit-scrollbar {
        width: 8px;
    }

    .subtitle-content::-webkit-scrollbar-track {
        background: #1a1a1a;
    }

    .subtitle-content::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }

    .subtitle-content::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
</style>
