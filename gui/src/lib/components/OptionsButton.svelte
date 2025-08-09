<script lang="ts">
    let { showOptions, toggleOptions } = $props();
</script>

<button id="options-btn" class="primary-btn" onclick={toggleOptions}>
    {showOptions ? "Back" : "Options"}
</button>

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
    /* .primary-btn {
        background: #0077cc;
        color: white;
    }*/

    #options-btn {
        background: #0077cc;
        color: white;
    }

    /*.primary-btn:hover:not(:disabled) {
        background: #005fa3;
        transform: translateY(-1px);
    } */
    #options-btn:hover:not(:disabled) {
        background: #005fa3;
        transform: translateY(-1px);
    }
</style>
