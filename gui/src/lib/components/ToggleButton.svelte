<!-- ToggleButton.svelte -->
<script>
    export let isToggled = false;
    export let toggledText = 'Hide';
    export let untoggledText = 'Show';
    export let onclick = () => {};
</script>

<button on:click={onclick}>
    {isToggled ? toggledText : untoggledText}
</button>

<style>
    button {
        /* Add your default styles here */
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }

    button:hover {
        background: #f0f0f0;
    }
</style>
