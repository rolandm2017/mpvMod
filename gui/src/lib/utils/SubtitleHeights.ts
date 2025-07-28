class SubtitleHeights {
	private entries: [number, number][] = []; // [time, height]

	set(time: number, height: number) {
		// Insert in sorted order or update existing
		const index = this.entries.findIndex(([t]) => t >= time);
		if (index === -1) {
			this.entries.push([time, height]);
		} else if (this.entries[index][0] === time) {
			this.entries[index][1] = height; // update
		} else {
			this.entries.splice(index, 0, [time, height]); // insert
		}
	}

	getHeight(time: number): number {
		if (this.entries.length === 0) return 0;

		// Binary search for insertion point
		let left = 0,
			right = this.entries.length - 1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			if (this.entries[mid][0] === time) {
				return this.entries[mid][1]; // exact match
			} else if (this.entries[mid][0] < time) {
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		// Interpolate between right and left
		if (right < 0) return this.entries[0][1]; // before first
		if (left >= this.entries.length) return this.entries[this.entries.length - 1][1]; // after last

		const [t1, h1] = this.entries[right];
		const [t2, h2] = this.entries[left];
		const ratio = (time - t1) / (t2 - t1);
		return h1 + (h2 - h1) * ratio;
	}
}
