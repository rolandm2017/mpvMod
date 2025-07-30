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
    import { SegmentMountingTracker } from '$lib/utils/mountingTracker.js';

    export let data;

    let scrollContainer: HTMLDivElement;

    let currentHighlightedElement: HTMLDivElement | null = null;
    let currentHighlightedTimecode = '';

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
                    highlightPlayerPositionSegment(playerPosition);
                    console.log(
                        'Time to scroll again! going to: ',
                        playerPosition
                    );
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
        const indexToHighlight = Finder.findSubtitleIndexAtPlayerTime(
            playerPosition,
            db.subtitleCuePointsInSec
        );
        console.log(
            'highlighting target: ',
            playerPosition,
            indexToHighlight,
            '112ru'
        );
        const timecodeStringOfTargetEl =
            db.subtitles[indexToHighlight].timecode;
        // FIXME: timecode's are not found. the timePositions are never loaded
        // FIXME: the problem is i'm doing "get" for a precise value, when I want fuzzy matching

        if (timecodeStringOfTargetEl) {
            console.log('Trying to highlight: ', timecodeStringOfTargetEl);
            highlightSegment(timecodeStringOfTargetEl);
        } else {
            console.log(timecodeStringOfTargetEl, 'not found');
        }
    }

    function debugHighlightStyles(el: any) {
        console.log('=== DEBUGGING ELEMENT STYLES ===');
        console.log('Element:', el);
        console.log('Classes:', el.className);
        console.log(
            'Has highlighted class:',
            el.classList.contains('highlighted')
        );

        // Check computed styles
        const computedStyle = window.getComputedStyle(el);
        console.log('Background color:', computedStyle.backgroundColor);
        console.log('Border left:', computedStyle.borderLeft);

        // Check if CSS is loaded
        const stylesheets = document.styleSheets;
        console.log('Number of stylesheets:', stylesheets.length);

        // Force style by directly setting it
        console.log('Setting style directly...');
        el.style.backgroundColor = '#ffeb3b';
        el.style.borderLeft = '4px solid #ff9800';
        console.log('Direct style applied');

        // Check if element is visible
        const rect = el.getBoundingClientRect();
        console.log('Element bounds:', rect);
        console.log('Element visible:', rect.width > 0 && rect.height > 0);
    }

    function highlightAll() {
        // made as a sanity check
        console.log('Highllighting all!');
        console.log('Highllighting all!');
        console.log('Highllighting all!');
        const triedToUse = [];
        for (const subtitle of db.subtitles) {
            console.log(subtitle.timecode, 'HERE , 23432984324 137ru');
            const el = mountingTracker.getElement(subtitle.timecode);
            triedToUse.push(subtitle.timecode);
            if (el) {
                console.log('ADDING HIHGLIGHTI TO EL to el', el);
                el.classList.add('highlighted');

                // FORCE the visual styles directly
                // el.style.backgroundColor = '#ffeb3b';
                // el.style.borderLeft = '4px solid #ff9800';
                // el.style.transition = 'all 0.2s ease';

                if (triedToUse.length === 1) {
                    // debugHighlightStyles(el);
                }

                console.log(
                    'does el have highlighted',
                    el.classList.contains('highlighted')
                );
            } else {
                console.log('No el found', el, subtitle.timecode);
                throw new Error('No el found error');
            }
        }
        mountingTracker.inspectElements();

        // FOUND ELEMENTS IS ZERO
        console.log(foundElements.length, 'IS IT DONE? 148ru');
        console.log('Tried to use: ', triedToUse);
    }

    const foundElements = [];

    export function highlightSegment(timecode: TimecodeString) {
        /*
         * Timecodes are a subtitle thing, timestamps are a player position thing.
         */

        if (currentHighlightedElement) {
            currentHighlightedElement.classList.remove('highlighted');
        }
        console.log(
            'Is this the full Timing with ---> or is it just the first half?',
            timecode
        );
        const element = mountingTracker.getElement(timecode);

        if (element) {
            foundElements.push(element);
            element.classList.add('highlighted');
            console.log(element, 'receiving HIGHLIGHT');
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
            console.log(result.isComplete, '12382193213ru');
            // highlightAll();
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
