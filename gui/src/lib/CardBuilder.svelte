<!-- CardBuilder.svelte -->
<script lang="ts">
	// Props - data passed in from parent
	let { foofoo = $bindable('') } = $props();

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

	let wordField = '';
	let exampleSentenceField = '';
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
	<div class="panel-header">Card Builder</div>

	<div class="control-section">
		<h3>Text fields</h3>
		<div class="input-group">
			<label for="video-url">Word</label>
			<input id="word-field" type="text" bind:value={wordField} placeholder="Target word" />

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

		<h3>MP3 Snippet</h3>
		<div class="time-controls">
			<div class="time-row">
				<div class="time-group">
					<label>Start Time</label>
					<div class="time-display">
						<button class="nudge-btn" onclick={() => nudgeStart(-1)}>←</button>
						<span class="time-value">{startTime}</span>
						<button class="nudge-btn" onclick={() => nudgeStart(-1)}>→</button>
					</div>
				</div>

				<div class="time-group">
					<label>End Time</label>
					<div class="time-display">
						<button class="nudge-btn" onclick={() => nudgeEnd(-1)}>←</button>
						<span class="time-value">{endTime}</span>
						<button class="nudge-btn" onclick={() => nudgeEnd(1)}>→</button>
					</div>
				</div>
			</div>

			<button class="play-btn" onclick={playAudio}>▶ Play Audio</button>
		</div>

		<div class="input-row">
			<div class="input-group">
				<label for="start-time">Start Time</label>
				<input id="start-time" type="text" bind:value={startTime} placeholder="00:00:00" />
			</div>
			<div class="input-group">
				<label for="end-time">End Time</label>
				<input id="end-time" type="text" placeholder="00:05:00" />
			</div>
		</div>

		<div class="input-group">
			<label for="language">Language</label>
			<select id="language" bind:value={selectedLanguage}>
				<option value="en">English</option>
				<option value="fr">French</option>
				<option value="es">Spanish</option>
				<option value="de">German</option>
				<option value="it">Italian</option>
				<option value="pt">Portuguese</option>
			</select>
		</div>

		<button class="primary-btn" onclick={handleProcessVideo}> Process Video </button>
	</div>

	<div class="control-section">
		<h3>Search & Navigate</h3>
		<div class="input-group">
			<label for="search">Search Subtitles</label>
			<input id="search" type="text" placeholder="Search text..." />
		</div>
		<button class="secondary-btn" onclick={handleSearchSubtitles}> Search </button>
	</div>

	<div class="control-section">
		<h3>Export Options</h3>
		<div class="input-group">
			<label for="format">Export Format</label>
			<select id="format" bind:value={exportFormat}>
				<option value="srt">SRT</option>
				<option value="vtt">WebVTT</option>
				<option value="ass">ASS/SSA</option>
				<option value="txt">Plain Text</option>
			</select>
		</div>

		<div class="button-group">
			<button class="success-btn" onclick={handleExportSubtitles}> Export Subtitles </button>
			<button class="danger-btn" onclick={handleClearSubtitles}> Clear All </button>
		</div>
	</div>
</div>

<style>
	/* Your styles here */
	.control-panel {
		flex: 1;
		background: #f5f5f5;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.panel-header {
		padding: 15px 20px;
		background: #e9ecef;
		border-bottom: 1px solid #dee2e6;
		font-weight: 600;
		font-size: 1.1em;
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

	button:active {
		transform: translateY(0);
	}
</style>
