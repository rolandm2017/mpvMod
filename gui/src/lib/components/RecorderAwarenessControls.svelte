<!-- RecorderAwarenessControls.svelte -->
<script lang="ts">
    import { onMount } from "svelte";

    export let recordingState: "idle" | "recording" | "finished" = "idle";

    let showFinished = false;
    let fadeTimeout: NodeJS.Timeout;

    // Handle the fade effect for the "finished" state
    $: if (recordingState === "finished") {
        showFinished = true;
        clearTimeout(fadeTimeout);
        fadeTimeout = setTimeout(() => {
            showFinished = false;
        }, 1000);
    }

    // Cleanup timeout on component destroy
    onMount(() => {
        return () => {
            clearTimeout(fadeTimeout);
        };
    });
</script>

<div class="min-h-[24px] flex items-center">
    {#if recordingState === "recording"}
        <div class="flex items-center gap-2 text-red-600">
            <!-- Recording dot -->
            <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium">Recording...</span>
        </div>
    {:else if recordingState === "finished"}
        <div
            class="flex items-center gap-2 text-green-600 transition-opacity duration-1000"
            class:opacity-100={showFinished}
            class:opacity-0={!showFinished}
        >
            <!-- Check circle icon -->
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                />
            </svg>
            <span class="text-sm font-medium">Recorded!</span>
        </div>
    {:else}
        <div class="flex items-center gap-2 text-gray-400">
            <!-- Microphone off icon -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2-2-2" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12H9" />
            </svg>
            <span class="text-sm">Ready to record</span>
        </div>
    {/if}
</div>
