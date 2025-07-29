import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [sveltekit()],
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib'),
        },
    },
    test: {
        projects: [
            {
                test: {
                    environment: 'node',
                    globals: true,
                    include: ['tests/**/*.{test,spec}.{js,ts}'],
                    exclude: ['tests/integration/**'],
                },
                resolve: {
                    alias: {
                        $lib: path.resolve('./src/lib'),
                    },
                },
            },
            {
                test: {
                    environment: 'jsdom',
                    globals: true,
                    include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
                    setupFiles: ['./tests/setup.js'],
                },
                plugins: [
                    svelte({
                        hot: false,
                    }),
                ],
                resolve: {
                    alias: {
                        $lib: path.resolve('./src/lib'),
                    },
                },
                define: {
                    'import.meta.env.SSR': false,
                    global: 'globalThis',
                },
            },
        ],
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
    },
});
