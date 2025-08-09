<!-- MiscConfig.svelte -->

<!-- TODO: Tick a box to say, "Automatically start clipping audio 1.0 sec before I pressed the button"
// to help with delayed reaction times -->

<script lang="ts">
    let earlySnipe = $state(false);
</script>

<div>
    <h3>Have audio recording start a second before you press the button</h3>
    <button>{earlySnipe ? "Turn off" : "Turn on"}</button>
</div>
