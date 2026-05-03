import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import nitro from "nitropack/vite";

export default defineConfig(() => ({
  plugins: [
    tanstackStart(),
    nitro({
      preset: "vercel",
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
}));
