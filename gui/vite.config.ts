import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// vite.config.js

//FIXME: Should integration project use sveltekit? just "plugins: [sveltekit()]"
export default defineConfig({
    plugins: [sveltekit(), tailwindcss()],
    server: {
        port: 8766 // AnkiConnect is 8765, so chose 8766 for theme.
    },
    resolve: {
        alias: {
            $lib: path.resolve("./src/lib")
        }
    },
    test: {
        projects: [
            {
                test: {
                    environment: "node",
                    globals: true,
                    include: ["tests/**/*.{test,spec}.{js,ts}"],
                    exclude: ["tests/integration/**", "tests/components/**"]
                },
                resolve: {
                    alias: {
                        $lib: path.resolve("./src/lib")
                    }
                }
            },
            {
                test: {
                    name: "components",
                    environment: "jsdom",
                    globals: true,
                    include: ["tests/components/**/*.{test,spec}.{js,ts}"],
                    setupFiles: ["./tests/components/setup.ts"] // reuse the same setup
                },
                plugins: [
                    svelte({
                        hot: false,
                        compilerOptions: {
                            dev: false
                        },
                        emitCss: false
                    })
                ],
                resolve: {
                    conditions: ["browser"],
                    alias: {
                        $lib: path.resolve("./src/lib"),
                        $app: path.resolve("./node_modules/@sveltejs/kit/src/runtime/app")
                    }
                },
                define: {
                    "import.meta.env.SSR": false,
                    "import.meta.env.DEV": false,
                    "import.meta.vitest": true,
                    global: "globalThis"
                }
            },

            {
                test: {
                    name: "integration",
                    environment: "jsdom",
                    globals: true,
                    include: ["tests/integration/**/*.{test,spec}.{js,ts}"],
                    setupFiles: ["./tests/integration/setup.ts"]
                },
                plugins: [
                    svelte({
                        hot: false,
                        compilerOptions: {
                            dev: false
                        },
                        emitCss: false
                    })
                ],
                resolve: {
                    conditions: ["browser"], // ⭐ crucial!
                    alias: {
                        $lib: path.resolve("./src/lib"),
                        $app: path.resolve("./node_modules/@sveltejs/kit/src/runtime/app")
                    }
                },
                define: {
                    "import.meta.env.SSR": false,
                    "import.meta.env.DEV": false,
                    "import.meta.vitest": true,
                    global: "globalThis"
                }
            }
        ],
        coverage: {
            reporter: ["text", "json", "html"]
        }
    }
});
