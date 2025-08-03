// cypress.config.js
import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:8766",
        chromeWebSecurity: false, // often needed for Electron
        viewportWidth: 1280,
        viewportHeight: 720
    }
});
