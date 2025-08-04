<!-- FieldMappingItem.svelte -->
<script lang="ts">
    interface FieldInfo {
        name: string;
        title: string;
        description: string;
    }

    let {
        field,
        availableAnkiFields,
        currentValue,
        onMappingChange
    }: {
        field: FieldInfo;
        availableAnkiFields: string[];
        currentValue: string;
        onMappingChange: (fieldName: string, ankiField: string) => void;
    } = $props();

    function handleChange(event: Event) {
        const target = event.currentTarget as HTMLSelectElement;
        onMappingChange(field.name, target.value);
    }
</script>

<div class="mapping-item">
    <div class="field-info">
        <h4 class="field-title">{field.title}</h4>
        <p class="field-description">{field.description}</p>
    </div>

    <div class="mapping-arrow">→</div>

    <div class="anki-field-selector">
        <label for="mapping-{field.name}" class="sr-only">
            Select Anki field for {field.title}
        </label>
        <select id="mapping-{field.name}" bind:value={currentValue} onchange={handleChange} class="field-select">
            <option value="" disabled>Select Anki Field...</option>
            {#each availableAnkiFields as ankiField}
                <option value={ankiField}>
                    {ankiField}
                </option>
            {/each}
        </select>
    </div>
</div>

<style>
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
    }
</style>
