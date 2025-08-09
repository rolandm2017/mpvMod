<!-- TimeControl.svelte -->
<script lang="ts">
    let {
        label,
        value,
        onNudgeLeft,
        onNudgeRight,
        leftDisabled = false,
        rightDisabled = false,
        formatValue = (v: number) => v
    } = $props();
</script>

<div class="time-group half-container-fill">
    <div class="time-display">
        <span>{label}:</span>
        <button class="btn-compact btn-nudge" class:disabled-text={leftDisabled} onclick={() => onNudgeLeft()}>←</button
        >
        <span class="time-value">{formatValue(value)}</span>
        <button class="btn-compact btn-nudge" class:disabled-text={rightDisabled} onclick={() => onNudgeRight()}
            >→</button
        >
    </div>
</div>

<style>
    /* Nudge buttons - even smaller */
    .btn-nudge {
        padding: 2px 8px;
        font-size: 12px;
        min-height: 24px;
        background: white;
        border-color: #ccc;
        color: #666;
    }

    .btn-nudge:hover:not(:disabled) {
        background: #f0f0f0;
        border-color: #999;
    }

    .btn-nudge:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .time-value {
        font-family: "Courier New", monospace;
        background: #efefef;
        padding: 2px 6px;
        border-radius: 3px;
        min-width: 45px;
        text-align: center;
    }
</style>
