// cypress.config.js
import { defineConfig } from 'cypress';

export default defineConfig({
	e2e: {
		baseUrl: 'http://localhost:5173',
		chromeWebSecurity: false, // often needed for Electron
		viewportWidth: 1280,
		viewportHeight: 720
	}
});
