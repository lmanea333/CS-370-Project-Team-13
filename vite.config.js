import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    // The frontend folder contains the website
    root: resolve(process.cwd(), "frontend"),

    build: {
        // Put the completed build in the main dist folder
        outDir: resolve(process.cwd(), "dist"),

        // Clear the old build before making a new one
        emptyOutDir: true,

        rollupOptions: {
            // Only include HTML pages that currently exist
            input: {
                login: resolve(
                    process.cwd(),
                    "frontend/index.html"
                ),

                dashboard: resolve(
                    process.cwd(),
                    "frontend/pages/dashboard.html"
                ),

                calendar: resolve(
                    process.cwd(),
                    "frontend/pages/calendar.html"
                ),

                settings: resolve(
                    process.cwd(),
                    "frontend/pages/settings.html"
                )
            }
        }
    }
});