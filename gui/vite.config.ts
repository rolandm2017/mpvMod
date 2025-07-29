import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		projects: [
			{
				name: 'unit',
				test: {
					environment: 'node',
					include: ['tests/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/integration/**']
				}
			},
			{
				name: 'integration',
				test: {
					environment: 'jsdom',
					include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
					setupFiles: ['./tests/setup.js']
				}
			}
		],
		globals: true,
		coverage: {
			reporter: ['text', 'json', 'html']
		}
	}
});
