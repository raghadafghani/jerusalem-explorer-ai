import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(() => ({
  plugins: [
    tanstackStart(),
    nitro(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
}));
