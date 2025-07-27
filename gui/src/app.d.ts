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
      onMPVState: (callback: (data: {
        pos: number;
        dur: number;
        play: boolean;
        ts: number;
      }) => void) => void;
      removeMPVListener: () => void;
    }
  }
}

export {};
