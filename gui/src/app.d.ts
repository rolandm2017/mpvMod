// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		electronAPI: {
			onMPVState: (
				callback: (data: {
					content: string;
					formatted_duration: string;
					formatted_time: string;
					progress: number;
					time_pos: number;
					timestamp: number;
					type: string;
				}) => void
			) => void;
			removeMPVListener: () => void;
		};
	}
}

export {};
