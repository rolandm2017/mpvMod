<!-- RecorderAwarenessControls.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { Icon } from "@steeze-ui/svelte-icon";
    import { CheckCircle, Microphone } from "@steeze-ui/heroicons";

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
            <Icon src={CheckCircle} width={24} height={24} />
            <span class="text-sm font-medium">Recorded!</span>
        </div>
    {:else}
        <div class="flex items-center gap-2 text-gray-400">
            <Icon src={Microphone} width={24} height={24} />
            <span class="text-sm">Ready to record</span>
        </div>
    {/if}
</div>

<style>
    .w-3 {
        width: 12px;
    }
    .h-3 {
        height: 12px;
    }
    .w-4 {
        width: 14px;
    }
    .h-4 {
        height: 14px;
    }
    .min-h-\[24px\] {
        min-height: 24px;
    }
    .flex {
        display: flex;
    }
    .items-center {
        align-items: center;
    }
    .gap-2 {
        gap: 0.5rem;
    }
    .text-red-600 {
        color: #dc2626;
    }
    .text-green-600 {
        color: #16a34a;
    }
    .text-gray-400 {
        color: #9ca3af;
    }
    .text-sm {
        font-size: 0.875rem;
    }
    .font-medium {
        font-weight: 500;
    }
    .bg-red-600 {
        background-color: #dc2626;
    }
    .rounded-full {
        border-radius: 9999px;
    }
    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .transition-opacity {
        transition-property: opacity;
    }
    .duration-1000 {
        transition-duration: 1000ms;
    }
    .opacity-100 {
        opacity: 1;
    }
    .opacity-0 {
        opacity: 0;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
</style>
