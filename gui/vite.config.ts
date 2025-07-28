import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					// Run tests in Node.js environment by default
					environment: 'node',
					// Only use browser for tests that specifically need it
					browser: {
						enabled: false, // Disable browser mode for now
						name: 'chromium',
						provider: 'playwright'
					}
				}
				// test: {
				// 	name: 'client',
				// 	environment: 'browser',
				// 	browser: {
				// 		enabled: true,
				// 		provider: 'playwright',
				// 		instances: [{ browser: 'chromium' }]
				// 	},
				// 	include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				// 	exclude: ['src/lib/server/**'],
				// 	setupFiles: ['./vitest-setup-client.ts']
				// }
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
