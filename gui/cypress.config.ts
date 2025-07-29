import { defineConfig } from 'cypress';

export default defineConfig({
	e2e: {
		// Point to your built Electron app
		baseUrl: null, // Don't use baseUrl for Electron
		supportFile: 'cypress/support/e2e.js'
	},
	env: {
		electronPath: './dist/electron/main.js' // or wherever your main process is
	}
});
