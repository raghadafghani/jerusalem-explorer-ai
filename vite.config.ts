import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tanstackStart(), react(), tailwindcss(), tsConfigPaths()],
  environments: {
    tanstack_start_app: {
      optimizeDeps: {
        exclude: [
          "@tanstack/react-start",
          "@tanstack/react-router",
          "@tanstack/start-server-core",
        ],
      },
    },
  },
});
