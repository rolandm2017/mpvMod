<script lang="ts">
    import { onMount, onDestroy, getContext } from 'svelte'

    import CardBuilder from '$lib/CardBuilder.svelte'
    import SubtitleSegment from '$lib/SubtitleSegment.svelte'

    import {
        Finder,
        parseTimecodeToSeconds,
        scrollToClosestSubtitle,
    } from '$lib/utils/subtitleScroll.js'
    import { Subtitle, SubtitleDatabase } from '$lib/utils/subtitleDatabase.js'
    import type { TimecodeString } from '$lib/types.js'

    export let data

    let scrollContainer: HTMLDivElement

    let currentHighlightedElement: HTMLDivElement | null = null
    let currentHighlightedTimecode = ''
    let segmentElements = new Map<string, HTMLDivElement>() // timecode -> element reference

    // let timePositionsToTimecodes = new Map<number, string>();

    let db: SubtitleDatabase

    let pageReadyResolver: (value: any) => void
    let pageReadyPromise = new Promise((resolve) => {
        pageReadyResolver = resolve
    })

    // Expose the promise to window immediately
    if (typeof window !== 'undefined') {
        window.testInteger = 99

        window.pageReadyPromise = pageReadyPromise
    }

    // Expose the promise to window immediately
    // Update your existing reactive statement:
    $: if (typeof window !== 'undefined' && db && allSegmentsMounted) {
        const testData = { db, allSegmentsMounted }
        window.testData = testData

        // Resolve the promise when everything is ready
        if (pageReadyResolver) {
            pageReadyResolver(testData)
        }
    }

    // Also update when allSegmentsMounted changes:
    $: if (allSegmentsMounted && db && typeof window !== 'undefined') {
        const testData = { db, allSegmentsMounted }
        window.testData = testData

        if (pageReadyResolver) {
            pageReadyResolver(testData)
        }
    }

    let content = ''
    let playerPosition = 0
    let formattedTime = ''

    let lastScrollTime = 0

    // scrollToLocation(heightForSub);
    let mountedSegments = new Set<number>() // track which segments have reported their position
    let allSegmentsMounted = false

    // TODO: Color the subtitle in question

    onMount(() => {
        ;(window as any).devtoolsScroller = devtoolsScroller

        let subtitles: Subtitle[] = []

        // Use the pre-built arrays from server
        data.segments.forEach((s) => {
            let newSub = new Subtitle(s.text, s.timecode, s.startTimeSeconds)
            subtitles.push(newSub)
        })

        console.log('It goes in: ', data.timePositionsToTimecodes)
        db = new SubtitleDatabase(
            subtitles,
            data.timePositionsToTimecodes,
            data.subtitleCuePointsInSec,
            data.timecodes
        )

        console.log('Window object:', window)
        console.log('electronAPI available:', !!window.electronAPI)

        if (window.electronAPI) {
            console.log('Running onMPVstate')
            window.electronAPI.onMPVState((data) => {
                // content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
                // formatted_duration :  "22:35.7"
                // formatted_time :  "0:13.6"
                // progress :  1
                // time_pos :  13.555
                // timestamp :  1753652691.9598007
                // type :  "time_update"
                content = data.content
                playerPosition = data.time_pos
                formattedTime = data.formatted_time

                // Auto-scroll to current position (throttled)
                const now = Date.now()
                if (now - lastScrollTime > 2000) {
                    // Throttle to every 500ms
                    // highlightPlayerPositionSegment(playerPosition);
                    scrollToClosestSubtitle(playerPosition, db, scrollContainer)

                    lastScrollTime = now
                }
            })
        } else {
            console.error('electronAPI not available')
        }

        // Initial scroll after mount
        setTimeout(() => {
            // console.log(allSegmentsMounted, '104ru');

            // console.log('SIZE: ', mountedSegments.size, '115ru');
            // console.log(db.subtitleCuePointsInSec.slice(-3), 'final 3 values 115ru');
            // console.log(db.timePositionsToTimecodes.size, mountedSegments.size, '++ 172ru');

            // const entries = Array.from(db.timePositionsToTimecodes.entries());
            // console.log('First 3:', entries.slice(0, 3));
            // console.log('Last 3:', entries.slice(-3));
            if (allSegmentsMounted) {
                // highlightPlayerPositionSegment(playerPosition);
                scrollToClosestSubtitle(playerPosition, db, scrollContainer)
            }
        }, 150)
    })

    /*
     * I have to go from, so, the timestamp, i'm using that to decide which subtitle to highlight.
     * The timecode shows in the little box in small text.
     * The highlight thing, it's the one that is zoomed to. So whatever gets zoomed to, should also be highlighted.
     * So anywhere scrollToClosestSubtitle is called, I want to also highlightSegment.
     * So scrollToClosestSubtitle uses timePos.
     */

    function highlightPlayerPositionSegment(playerPosition: number) {
        const corresponding: number = Finder.findPlayerTimeForSubtitleTiming(
            playerPosition,
            db.subtitleCuePointsInSec
        )
        // FIXME: timecode's are not found. the timePositions are never loaded
        // FIXME: the problem is i'm doing "get" for a precise value, when I want fuzzy matching
        const timecode = db.timePositionsToTimecodes.get(corresponding)
        if (timecode) {
            highlightSegment(timecode)
        } else {
            console.log(timecode, 'not found')
        }
    }

    export function highlightSegment(timecode: TimecodeString) {
        /*
         * Note that timecodes are a subtitle thing, timestamps are a player position thing.
         */

        // why did i need that? i know i need it, but why?
        const timecodeAsSeconds = parseTimecodeToSeconds(timecode)

        // Remove highlight from previous element
        if (currentHighlightedElement) {
            currentHighlightedElement.classList.remove('highlighted')
        }

        // Add highlight to new element
        const element = segmentElements.get(timecode)
        if (element) {
            element.classList.add('highlighted')
            currentHighlightedElement = element
            currentHighlightedTimecode = timecode
        }
    }

    function storeSegmentPosition(
        timecode: string,
        y: number,
        element: HTMLDivElement
    ) {
        /* Used to transmit a component's Y height into the holder arr.
         */

        const timecodeAsSeconds = parseTimecodeToSeconds(timecode)

        mountedSegments.add(timecodeAsSeconds)
        db.subtitleHeights.set(timecodeAsSeconds, y)
        // is now "db.subtitleCuePointsInSec"
        // subtitleStartTimes.push(timecodeAsSeconds);

        segmentElements.set(timecode, element)

        // Check if all segments have mounted
        if (mountedSegments.size === data.segments.length) {
            allSegmentsMounted = true
            console.log('All segments mounted, positions ready')
        }
    }

    // export function devtoolsScroller(timestamp: number) {
    export function devtoolsScroller(playerPosition: number) {
        console.log('SCROLLING!', playerPosition)
        // highlightPlayerPositionSegment(playerPosition);
        scrollToClosestSubtitle(playerPosition, db, scrollContainer)
    }
</script>

<div class="container">
    <div class="subtitle-panel">
        <div class="subtitle-header">Subtitles</div>
        <div class="subtitle-content" bind:this={scrollContainer}>
            {#if data.segments.length > 0}
                {#each data.segments as segment}
                    <SubtitleSegment
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
