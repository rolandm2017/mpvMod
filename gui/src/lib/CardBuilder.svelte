<!-- CardBuilder.svelte -->
<script lang="ts">
    // Props - data passed in from parent
    let {
        exampleSentenceField,
        targetWordField,
        screenshotDataUrl,
        showOptions,
        toggleOptions,
    } = $props();

    // Watch for changes in screenshotDataUrl
    $effect(() => {
        console.log('screenshotDataUrl changed:', screenshotDataUrl);
    });

    // Local state
    let selectedLanguage = $state('en');
    let exportFormat = $state('srt');

    // Event handlers
    function handleProcessVideo() {
        //
    }

    function handleExportSubtitles() {
        console.log('Exporting subtitles as:', exportFormat);
        // Add your export logic here
    }

    function handleSearchSubtitles() {
        // console.log('Searching for:', searchQuery);
        // Add your search logic here
    }

    function handleClearSubtitles() {
        if (confirm('Are you sure you want to clear all subtitles?')) {
            console.log('Clearing subtitles');
            // Add your clear logic here
        }
    }

    let nativeLangTranslation = '';

    let startTime = '8:06';
    let endTime = '8:13';

    function nudgeStart(direction: number) {
        let [minutes, seconds] = startTime.split(':').map(Number);
        let totalSeconds = minutes * 60 + seconds;
        totalSeconds += direction;

        if (totalSeconds < 0) totalSeconds = 0;

        let newMinutes = Math.floor(totalSeconds / 60);
        let newSeconds = totalSeconds % 60;
        startTime = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    function nudgeEnd(direction: number) {
        let [minutes, seconds] = endTime.split(':').map(Number);
        let totalSeconds = minutes * 60 + seconds;
        totalSeconds += direction;

        if (totalSeconds < 0) totalSeconds = 0;

        let newMinutes = Math.floor(totalSeconds / 60);
        let newSeconds = totalSeconds % 60;
        endTime = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    function playAudio() {
        console.log(`Playing audio from ${startTime} to ${endTime}`);
        // Add your audio playback logic here
    }
</script>

<div class="control-panel">
    <div class="panel-header flex-row">
        <div><h2 class="header-text">Card Builder</h2></div>
        <div>
            <button>img</button>
        </div>
        <!-- // todo: make it responsive -->
        <div>
            <button>audio</button>
        </div>
        <div>
            <button onclick={() => toggleOptions()}>
                {showOptions ? 'Back' : 'Options'}
            </button>
        </div>
    </div>

    <div class="control-section">
        <h3>Text fields</h3>
        <div class="input-group">
            <label for="video-url">Word</label>
            <input
                id="word-field"
                type="text"
                bind:value={targetWordField}
                placeholder="Target word"
            />

            <label for="video-url">Example sentence</label>
            <input
                id="example-sentence"
                type="text"
                bind:value={exampleSentenceField}
                placeholder="Subtitle snippet"
            />

            <label for="video-url">Native translation</label>
            <input
                id="NL-translation"
                type="text"
                bind:value={nativeLangTranslation}
                placeholder="Translated version"
            />
        </div>
    </div>

    <div class="control-section">
        <h3>Sentence Audio</h3>
        <div class="time-controls">
            <div class="time-row flex-row push-items-top sml-space-below">
                <div class="time-group half-container-fill">
                    <h4 class="push-items-top">Start Time</h4>
                    <div class="time-display">
                        <button class="nudge-btn" onclick={() => nudgeStart(-1)}
                            >←</button
                        >
                        <span class="time-value">{startTime}</span>
                        <button class="nudge-btn" onclick={() => nudgeStart(-1)}
                            >→</button
                        >
                    </div>
                </div>

                <div class="time-group half-container-fill">
                    <h4 class="push-items-top">End Time</h4>
                    <div class="time-display">
                        <button class="nudge-btn" onclick={() => nudgeEnd(-1)}
                            >←</button
                        >
                        <span class="time-value">{endTime}</span>
                        <button class="nudge-btn" onclick={() => nudgeEnd(1)}
                            >→</button
                        >
                    </div>
                </div>
            </div>

            <button class="play-btn sml-space-below" onclick={playAudio}
                >▶ Play Audio</button
            >
        </div>
    </div>
    <div class="control-section">
        <h3>Image</h3>
        <div class="image-target-container">
            <!-- container div with a border -->
            <div class="image-target">
                <!-- container div with an image that is dynamically set -->
                <!-- the image is about the size of the Anki thumbnail -->
                <!-- TODO: the image should be shrunk behind the scenes to save space in Anki -->
                <img
                    src={screenshotDataUrl}
                    class:hidden={!screenshotDataUrl}
                    alt="MPV screenshot for Anki flashcard"
                />
            </div>
        </div>
    </div>

    <div class="control-section">
        <h3>Finalize</h3>

        <div class="button-group">
            <button class="success-btn" onclick={handleExportSubtitles}>
                Export Card
            </button>
            <button class="danger-btn" onclick={handleClearSubtitles}>
                Clear All
            </button>
            TODO: Show confirmation dialogue for "Clear all?" since it's destructive
            <button class="secondary-btn" onclick={handleSearchSubtitles}>
                Shutdown
            </button>
        </div>
    </div>
</div>

<style>
    /* Your styles here */

    h4 {
        font-weight: 400;
    }

    button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        min-width: 120px;
    }

    .flex-row {
        display: flex;
    }

    .half-container-fill {
        width: 50%;
    }

    .push-items-top {
        margin-top: 0;
    }

    .sml-space-below {
        margin-bottom: 10px;
    }

    .time-display .nudge-btn {
        width: 50px;
        min-width: 50px;
        background-color: #dddddd;
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .image-target-container {
        height: 200px;
        width: 400px;
        border: 2px solid grey;
        border-radius: 8px;
    }

    .image-target {
        height: 100%;
        width: 100%;
        background-color: #eeeeee;
        border-radius: 8px;
    }

    .control-panel {
        flex: 1;
        background: #f5f5f5;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .panel-header {
        padding: 3px 20px;
        background: #e9ecef;
        border-bottom: 1px solid #dee2e6;
        font-weight: 600;
        font-size: 1.1em;
    }

    .header-text {
        margin: 10px 0px 10px 0px;
        padding: 6px 12px;
        background-color: #eee5ed;
    }

    .control-section {
        padding: 20px;
        border-bottom: 1px solid #dee2e6;
    }

    .control-section:last-child {
        border-bottom: none;
    }

    .control-section h3 {
        margin: 0 0 15px 0;
        color: #495057;
        font-size: 1em;
        font-weight: 600;
    }

    .input-group {
        margin-bottom: 15px;
    }

    .input-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #495057;
        font-size: 0.9em;
    }

    .input-group input,
    .input-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ced4da;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        transition:
            border-color 0.15s ease-in-out,
            box-shadow 0.15s ease-in-out;
    }

    .input-group input:focus,
    .input-group select:focus {
        outline: none;
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .input-row {
        display: flex;
        gap: 15px;
    }

    .input-row .input-group {
        flex: 1;
    }

    .button-group {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }

    .primary-btn {
        background: #007bff;
        color: white;
    }

    .primary-btn:hover {
        background: #0056b3;
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

    .success-btn {
        background: #28a745;
        color: white;
    }

    .success-btn:hover {
        background: #1e7e34;
        transform: translateY(-1px);
    }

    .danger-btn {
        background: #dc3545;
        color: white;
    }

    .danger-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
    }

    .hidden {
        display: none;
    }

    button:active {
        transform: translateY(0);
    }
</style>
