<script lang="ts">
    let showOptions = $state<boolean>(false);

    function toggleOptions(): void {
        showOptions = !showOptions;
    }
</script>

<button id="options-btn" class="primary-btn mt-2.5 mr-1.5" onclick={toggleOptions}>
    {showOptions ? "Back" : "Options"}
</button>

<style>
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
