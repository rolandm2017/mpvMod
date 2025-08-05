<script lang="ts">
    export let id: string;
    export let label: string;
    export let value: string = "";
    export let placeholder: string = "";
</script>

<div class="field-group">
    <label for={id}>{label}</label>
    <input {id} type="text" bind:value {placeholder} />
</div>

<style>
    .field-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    label {
        display: block;
        margin-top: 6px;
        margin-bottom: 4px;
        margin-left: 2px;
        font-weight: 500;
        color: #495057;
        font-size: 0.9em;
    }

    input {
        width: 100%;
        padding: 10px 0px 10px 8px;
        border: 1px solid #ced4da;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        transition:
            border-color 0.15s ease-in-out,
            box-shadow 0.15s ease-in-out;
    }

    input:focus {
        outline: none;
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    input::placeholder {
        color: #9ca3af;
    }
</style>
