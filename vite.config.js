import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    root: "frontend",

    server: {
        host: "0.0.0.0"
    },

    build: {
        outDir: "../dist",
        emptyOutDir: true,

        rollupOptions: {
            input: {
                login: resolve(
                    process.cwd(),
                    "frontend/index.html"
                ),

                calendar: resolve(
                    process.cwd(),
                    "frontend/pages/calendar.html"
                ),

                eventForm: resolve(
                    process.cwd(),
                    "frontend/pages/event-form.html"
                ),

                sharedCalendar: resolve(
                    process.cwd(),
                    "frontend/pages/shared-calendar.html"
                ),
                dashboard: resolve(
                    process.cwd(),
                    "frontend/pages/dashboard.html"
                ),
                    settings: resolve(process.cwd(), "frontend/pages/settings.html"
                ),
              
            }
        }
    }
});