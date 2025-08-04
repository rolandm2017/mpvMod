<script lang="ts">
    import { availableHotkeys, formatAvailableHotkeys, type HotkeyStructure } from "../config/hotkeys";

    const formattedHotkeys = formatAvailableHotkeys(availableHotkeys);
</script>

<div class="available-hotkeys-section">
    <h3>Available Hotkeys</h3>
    <p class="section-description">These hotkeys are generally available in MPV Player:</p>
    <pre class="hotkey-display">{formattedHotkeys}</pre>
</div>

<style>
    .available-hotkeys-section {
        margin: 24px 0;
        padding: 20px;
        background: #333;
        border-radius: 8px;
        border: 1px solid #444;
    }

    .available-hotkeys-section h3 {
        margin: 0 0 8px 0;
        color: #e0e0e0;
        font-size: 16px;
        font-weight: 600;
    }

    .section-description {
        margin: 0 0 16px 0;
        color: #aaa;
        font-size: 14px;
    }

    .hotkey-display {
        font-family: "Courier New", Consolas, Monaco, monospace;
        font-size: 13px;
        line-height: 1.5;
        color: #e0e0e0;
        background: #2a2a2a;
        padding: 16px;
        border-radius: 6px;
        border: 1px solid #555;
        margin: 0;
        overflow-x: auto;
        white-space: pre;
    }
</style>
