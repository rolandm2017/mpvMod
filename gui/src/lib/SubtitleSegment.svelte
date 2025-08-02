<script lang="ts">
    import { onMount } from 'svelte';

    let { index, timecode, text, emitTopOfContainer } = $props();

    let el: HTMLDivElement;

    let isHighlighted = $state(false);

    // // Export function to be called from parent
    // export function highlight() {
    //     isHighlighted = true;
    // }

    // export function unhighlight() {
    //     isHighlighted = false;
    // }

    // let componentInstance = $state();

    onMount(() => {
        // const y = el.getBoundingClientRect().top;
        // // console.log(`Segment ${timecode} top Y:`, y);
        // emitTopOfContainer(y);

        // componentInstance = {
        //     highlight,
        //     unhighlight,
        //     getDomElement: () => el,
        //     timecode,
        // };

        // Use a small delay to ensure element is fully rendered
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const containerRect = el.closest('.subtitle-content')?.getBoundingClientRect();

            if (containerRect) {
                // Get position relative to the scroll container
                const relativeY = rect.top - containerRect.top;
                emitTopOfContainer(timecode, relativeY, el);
            }
        }, 10);
    });
</script>

<div
    class="subtitle-segment"
    class:highlighted={false}
    bind:this={el}
    data-testid="subtitle-segment-{index}"
    data-timecode={timecode}
>
    <div class="subtitle-text">{text}</div>
</div>

<style>
    /* for when the subtitle is, well, highlighted */
    .subtitle-segment.highlighted {
        /* background-color: #ffeb3b; */
        background-color: #404040;
        border-left: 4px solid #0077cc;
        /* or whatever highlight style you want */
    }

    .subtitle-segment.highlighted:hover {
        /* background-color: #ffeb3b; */
        background-color: #4c4c5a;
        border-left: 4px solid #0098ff;
        /* or whatever highlight style you want */
    }

    .subtitle-segment {
        margin-bottom: 15px;
        padding: 12px 15px;
        background: #333;
        border-radius: 8px;
        border-left: 3px solid #555;
        transition: all 0.2s ease;
    }

    .subtitle-segment:hover {
        background: #3a3a3a;
        border-left-color: #007acc;
    }

    /* A nice color for the SRT timing text */
    /* .subtitle-time {
        font-size: 11px;
        color: #888;
        margin-bottom: 5px;
        font-family: monospace;
    } */

    .subtitle-text {
        line-height: 1.4;
        color: #e0e0e0;
    }
</style>
