<script lang="ts">
    interface Props {
        name: string;
        title: string;
        description: string;
        value: string;
        isActive: boolean;
        onCapture: (name: string) => void;
        onClear: (name: string) => void;
    }

    let {
        name,
        title,
        description,
        value,
        isActive,
        onCapture, // hi
        onClear
    }: Props = $props();
</script>

<div class="hotkey-item">
    <div class="hotkey-description">
        <strong>{title}</strong>
        <span>{description}</span>
    </div>
    <div class="hotkey-input-group">
        <button
            class="hotkey-input"
            class:active={isActive}
            class:has-value={value !== 'Not set'}
            onclick={() => onCapture(name)}
        >
            {isActive ? 'Press a key...' : value}
        </button>
        {#if value !== 'Not set'}
            <button class="clear-btn" onclick={() => onClear(name)} title="Clear hotkey"> × </button>
        {:else}
            <div class="spacer-div"></div>
        {/if}
    </div>
</div>

<style>
    .hotkey-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 0;
        border-bottom: 1px solid #444;
    }

    .hotkey-item:last-child {
        border-bottom: none;
    }

    .hotkey-description {
        flex: 1;
        margin-right: 20px;
    }

    .hotkey-description strong {
        display: block;
        color: #e0e0e0;
        font-size: 14px;
        margin-bottom: 4px;
    }

    .hotkey-description span {
        color: #aaa;
        font-size: 12px;
        line-height: 1.3;
    }

    .hotkey-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .hotkey-input {
        min-width: 120px;
        padding: 8px 12px;
        background: #404040;
        border: 2px solid #555;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 13px;
        font-family: monospace;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
    }

    .hotkey-input:hover {
        background: #4a4a4a;
        border-color: #007acc;
    }

    .hotkey-input.active {
        background: #0077cc;
        border-color: #0098ff;
        color: white;
        animation: pulse 1.5s infinite;
    }

    .hotkey-input.has-value {
        border-color: #007acc;
    }

    .clear-btn {
        width: 24px;
        height: 24px;
        background: #555;
        border: none;
        border-radius: 50%;
        color: #aaa;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .clear-btn:hover {
        background: #666;
        color: #e0e0e0;
    }

    .spacer-div {
        width: 24px;
        height: 24px;
    }

    @keyframes pulse {
        0%,
        100% {
            box-shadow: 0 0 0 0 rgba(0, 119, 204, 0.4);
        }
        50% {
            box-shadow: 0 0 0 8px rgba(0, 119, 204, 0);
        }
    }
</style>
