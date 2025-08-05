<!-- hotkeyConfig.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { HotkeyRegister } from "./interfaces";
    import HotkeyItem from "./components/HotkeyItem.svelte";
    import FormattedHotkeys from "./components/FormattedHotkeys.svelte";

    let { showOptions, toggleOptions, updateMainPageHotkeys, switchPageType } = $props();

    // Hotkey configuration state
    let hotkeys: HotkeyRegister = $state({
        screenshot: "Not set",
        audioClip: "Not set",
        copySubtitle: "Not set",
        copyWord: "Not set"
    });

    // FIXME: Should NOT be able to bind the same key twice!
    //      -> Correct behavior is, "Double bind key -> Original key is unbound"
    //      -> Another option is, Double Bind Key -> Get override prompt. "Override?"
    // TODO:

    // Track which hotkey is currently being set
    let activeHotkey: string | null = $state(null);
    let keyListener: ((e: KeyboardEvent) => void) | null = null;

    // Hotkey definitions for easier management
    const hotkeyDefinitions = [
        {
            name: "copyWord",
            title: "Copy Target Word",
            description: "Copy selected word/phrase to Target word field"
        },
        {
            name: "copySubtitle",
            title: "Copy Selected Subtitle",
            description: "Copy selected text from subtitles to Example sentence field"
        },
        {
            name: "screenshot",
            title: "Take Screenshot",
            description: "Capture current MPV frame to Image field"
        },
        {
            name: "audioClip",
            title: "Start/Stop Audio Clip",
            description: "Record audio from current position to Sentence audio field"
        }
    ];

    // TODO-LATER: Add setup for automatic ChatGPT prompting based on sentence, word.
    // TODO-LATER: Add setup for automatic translation using DeepL, Google Translate, etc.

    // Load saved hotkeys on mount
    onMount(() => {
        loadHotkeys();
    });

    onDestroy(() => {
        if (keyListener) {
            document.removeEventListener("keydown", keyListener);
        }
    });

    async function loadHotkeys() {
        // Load from electron store or localStorage
        if (window.electronAPI?.getHotkeys) {
            const saved: HotkeyRegister = await window.electronAPI.getHotkeys();
            if (saved) {
                hotkeys = { ...hotkeys, ...saved };
            }
        }
    }

    async function saveHotkeys() {
        // Save to electron store
        if (window.electronAPI?.saveHotkeys) {
            await window.electronAPI.saveHotkeys({ ...hotkeys });
        }
    }

    function startHotkeyCapture(hotkeyName: string) {
        // Clear any existing listener
        if (keyListener) {
            document.removeEventListener("keydown", keyListener);
        }

        activeHotkey = hotkeyName;

        keyListener = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Build hotkey string
            const parts: string[] = [];
            if (e.ctrlKey) parts.push("Ctrl");
            if (e.shiftKey) parts.push("Shift");
            if (e.altKey) parts.push("Alt");
            if (e.metaKey) parts.push("Cmd");

            // Handle special keys
            let key = e.key;
            console.log("KEY FOR HOTKEY: ", key);
            if (key === " ") key = "Space";
            else if (key === "Escape") key = "Esc";
            else if (key.length === 1) key = key.toUpperCase();

            // Don't capture modifier keys alone
            if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
                return;
            }

            parts.push(key);
            const hotkeyString = parts.join(" + ");

            // Update the hotkey
            console.log("FOO ", hotkeyString);
            hotkeys[hotkeyName as keyof typeof hotkeys] = hotkeyString;

            // Clear capture state
            activeHotkey = null;
            document.removeEventListener("keydown", keyListener!);
            keyListener = null;

            // Save the updated hotkeys
            saveHotkeys();
            updateMainPageHotkeys(hotkeys);
        };

        document.addEventListener("keydown", keyListener);
    }

    function clearHotkey(hotkeyName: string) {
        hotkeys[hotkeyName as keyof typeof hotkeys] = "Not set";
        saveHotkeys();
        updateMainPageHotkeys(hotkeys);
    }

    function cancelCapture() {
        if (keyListener) {
            document.removeEventListener("keydown", keyListener);
            keyListener = null;
        }
        activeHotkey = null;
    }

    // Handle escape key to cancel capture
    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && activeHotkey) {
            cancelCapture();
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="hotkey-config">
    <div class="flex-row">
        <div class="config-header">
            <h2>Hotkey Configuration</h2>
            <p>Click on a hotkey field and press your desired key combination</p>
        </div>
        <div id="position-buttons-container">
            <div id="position-buttons">
                <div>
                    <button class="secondary-btn" onclick={switchPageType}> Field Mappings </button>
                </div>
                <div>
                    <button class="primary-btn" onclick={toggleOptions}>
                        {showOptions ? "Back" : "Options"}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="hotkey-list">
        {#each hotkeyDefinitions as hotkey}
            <HotkeyItem
                name={hotkey.name}
                title={hotkey.title}
                description={hotkey.description}
                value={hotkeys[hotkey.name as keyof typeof hotkeys]}
                isActive={activeHotkey === hotkey.name}
                onCapture={startHotkeyCapture}
                onClear={clearHotkey}
            />
        {/each}
    </div>

    // TODO: Claude

    <!-- Recommended Hotkeys Section -->
    <FormattedHotkeys />

    {#if activeHotkey}
        <div class="capture-overlay">
            <div class="capture-message">
                Press your desired key combination for <strong>{activeHotkey}</strong>
                <br />
                <small>Press Escape to cancel</small>
            </div>
        </div>
    {/if}
</div>

<style>
    button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    #position-buttons-container {
        padding-right: 20px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        flex: 1;
    }

    #position-buttons {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
    }

    .flex-row {
        display: flex;
        align-items: center; /* Vertically center both sections */
    }

    .hotkey-config {
        background: #2a2a2a;
        color: #e0e0e0;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        position: relative;
    }

    .config-header {
        padding: 20px;
        background: #333;
        border-bottom: 1px solid #444;
        flex: 0 0 auto; /* Don't grow or shrink, stay at natural width */
        width: fit-content; /* Only take up the width of the content */
    }

    .config-header h2 {
        margin: 0 0 8px 0;
        color: #e0e0e0;
        font-size: 20px;
        font-weight: 600;
    }

    .config-header p {
        margin: 0;
        color: #aaa;
        font-size: 14px;
    }

    .hotkey-list {
        padding: 20px;
    }

    .capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(2px);
    }

    .capture-message {
        background: #333;
        padding: 24px 32px;
        border-radius: 12px;
        border: 2px solid #0077cc;
        text-align: center;
        color: #e0e0e0;
        animation: slideIn 0.2s ease;
    }

    .capture-message small {
        color: #aaa;
        margin-top: 8px;
        display: block;
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

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
