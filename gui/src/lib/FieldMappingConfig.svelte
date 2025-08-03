<!-- FieldMappingConfig.svelte -->
<script lang="ts">
    import { onMount } from "svelte";

    let { showOptions, toggleOptions, switchPageType } = $props();

    // Field mapping state - maps CardBuilder fields to Anki fields
    let fieldMappings = $state({
        targetWord: "Front",
        exampleSentence: "Back",
        nativeTranslation: "Translation",
        sentenceAudio: "Audio",
        screenshot: "Image"
    });

    // Available Anki fields (these would typically be fetched from Anki Connect)
    let availableAnkiFields = $state([
        "Front",
        "Back",
        "Translation",
        "Audio",
        "Image",
        "Extra",
        "Tags",
        "Source",
        "Notes",
        "Definition",
        "Reading",
        "Example"
    ]);

    // Card Builder field definitions
    const cardBuilderFields = [
        {
            name: "targetWord",
            title: "Target Word",
            description: "The word or phrase being learned",
            currentValue: () => fieldMappings.targetWord
        },
        {
            name: "exampleSentence",
            title: "Example Sentence",
            description: "Context sentence containing the target word",
            currentValue: () => fieldMappings.exampleSentence
        },
        {
            name: "nativeTranslation",
            title: "Native Translation",
            description: "Translation in your native language",
            currentValue: () => fieldMappings.nativeTranslation
        },
        {
            name: "sentenceAudio",
            title: "Sentence Audio",
            description: "Audio clip of the example sentence",
            currentValue: () => fieldMappings.sentenceAudio
        },
        {
            name: "screenshot",
            title: "Screenshot/Image",
            description: "Visual context from the source material",
            currentValue: () => fieldMappings.screenshot
        }
    ];

    // Load saved mappings on mount
    onMount(() => {
        loadFieldMappings();
        // fetchAnkiFields();
    });

    async function loadFieldMappings() {
        // Load from electron store or localStorage
        // if (window.electronAPI?.getFieldMappings) {
        //     const saved = await window.electronAPI.getFieldMappings();
        //     if (saved) {
        //         fieldMappings = { ...fieldMappings, ...saved };
        //     }
        // }
    }

    async function saveFieldMappings() {
        // Save to electron store
        // if (window.electronAPI?.saveFieldMappings) {
        //     await window.electronAPI.saveFieldMappings({ ...fieldMappings });
        // }
        // // Update parent component
        // if (updateFieldMappings) {
        //     updateFieldMappings(fieldMappings);
        // }
    }

    // async function fetchAnkiFields() {
    //     // Fetch available fields from Anki Connect
    //     if (window.electronAPI?.getAnkiFields) {
    //         try {
    //             const fields = await window.electronAPI.getAnkiFields();
    //             if (fields && fields.length > 0) {
    //                 availableAnkiFields = fields;
    //             }
    //         } catch (error) {
    //             console.warn("Could not fetch Anki fields:", error);
    //         }
    //     }
    // }

    function updateMapping(fieldName: string, ankiField: string) {
        fieldMappings[fieldName as keyof typeof fieldMappings] = ankiField;
        saveFieldMappings();
    }

    function resetToDefaults() {
        if (confirm("Reset all field mappings to defaults?")) {
            fieldMappings = {
                targetWord: "Front",
                exampleSentence: "Back",
                nativeTranslation: "Translation",
                sentenceAudio: "Audio",
                screenshot: "Image"
            };
            saveFieldMappings();
        }
    }
</script>

<div class="field-mapping-config">
    <div class="flex-row">
        <div class="config-header">
            <h2>Field Mapping Configuration</h2>
            <p>Map Card Builder fields to your Anki note fields</p>
        </div>
        <div class="header-actions">
            <button class="secondary-btn" onclick={() => switchPageType()}> Hotkeys </button>
            <button class="secondary-btn" onclick={resetToDefaults}> Reset Defaults </button>
            <button class="primary-btn" onclick={() => toggleOptions()}>
                {showOptions ? "Back" : "Options"}
            </button>
        </div>
    </div>

    <div class="mapping-list">
        {#each cardBuilderFields as field}
            <div class="mapping-item">
                <div class="field-info">
                    <h3 class="field-title">{field.title}</h3>
                    <p class="field-description">{field.description}</p>
                </div>

                <div class="mapping-arrow">→</div>

                <div class="anki-field-selector">
                    <label for="mapping-{field.name}" class="sr-only">
                        Select Anki field for {field.title}
                    </label>
                    <select
                        id="mapping-{field.name}"
                        bind:value={fieldMappings[field.name as keyof typeof fieldMappings]}
                        onchange={(e) => updateMapping(field.name, e.currentTarget.value)}
                        class="field-select"
                    >
                        <option value="" disabled>Select Anki Field...</option>
                        {#each availableAnkiFields as ankiField}
                            <option value={ankiField}>
                                {ankiField}
                            </option>
                        {/each}
                    </select>
                </div>
            </div>
        {/each}
    </div>

    <div class="config-footer">
        <div class="status-info">
            <p class="status-text">
                <span class="status-indicator connected"></span>
                Connected to Anki ({availableAnkiFields.length} fields available)
            </p>
        </div>
    </div>
</div>

<style>
    .field-mapping-config {
        background: #2a2a2a;
        color: #e0e0e0;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .config-header {
        padding: 20px;
        background: #333;
        border-bottom: 1px solid #444;
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

    .flex-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #333;
        border-bottom: 1px solid #444;
    }

    .header-actions {
        padding: 20px;
        display: flex;
        gap: 12px;
    }

    .mapping-list {
        padding: 20px;
    }

    .mapping-item {
        display: flex;
        align-items: center;
        padding: 20px;
        margin-bottom: 16px;
        background: #333;
        border: 1px solid #444;
        border-radius: 8px;
        transition: border-color 0.2s ease;
    }

    .mapping-item:hover {
        border-color: #555;
    }

    .field-info {
        flex: 1;
        min-width: 0;
    }

    .field-title {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
    }

    .field-description {
        margin: 0;
        font-size: 14px;
        color: #aaa;
        line-height: 1.4;
    }

    .mapping-arrow {
        margin: 0 24px;
        font-size: 20px;
        color: #0077cc;
        font-weight: bold;
    }

    .anki-field-selector {
        min-width: 200px;
    }

    .field-select {
        width: 100%;
        padding: 12px 16px;
        background: #2a2a2a;
        border: 2px solid #555;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 14px;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .field-select:hover {
        border-color: #777;
    }

    .field-select:focus {
        outline: none;
        border-color: #0077cc;
        box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.2);
    }

    .field-select option {
        background: #2a2a2a;
        color: #e0e0e0;
        padding: 8px;
    }

    .config-footer {
        padding: 20px;
        border-top: 1px solid #444;
        background: #333;
    }

    .status-info {
        display: flex;
        justify-content: center;
    }

    .status-text {
        margin: 0;
        font-size: 14px;
        color: #aaa;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .status-indicator.connected {
        background: #28a745;
        box-shadow: 0 0 6px rgba(40, 167, 69, 0.6);
    }

    .status-indicator.disconnected {
        background: #dc3545;
        box-shadow: 0 0 6px rgba(220, 53, 69, 0.6);
    }

    /* Button styles */
    button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .primary-btn {
        background: #0077cc;
        color: white;
    }

    .primary-btn:hover {
        background: #005fa3;
        transform: translateY(-1px);
    }

    .secondary-btn {
        background: #6c757d;
        color: white;
    }

    .secondary-btn:hover {
        background: #545b62;
        transform: translateY(-1px);
    }

    button:active {
        transform: translateY(0);
    }

    /* Screen reader only class */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .mapping-item {
            flex-direction: column;
            text-align: center;
        }

        .mapping-arrow {
            margin: 16px 0;
            transform: rotate(90deg);
        }

        .anki-field-selector {
            min-width: 100%;
            margin-top: 8px;
        }

        .flex-row {
            flex-direction: column;
            align-items: stretch;
        }

        .header-actions {
            padding: 10px 20px;
            justify-content: center;
        }
    }
</style>
