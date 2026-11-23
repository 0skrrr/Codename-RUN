import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { presetsPlugin } from "./server/presetsPlugin.ts";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const geojsonDirectory = fileURLToPath(new URL("../../data/geojson", import.meta.url));
const presetsDirectory = fileURLToPath(new URL("./presets", import.meta.url));

export default defineConfig({
  publicDir: geojsonDirectory,
  server: { fs: { allow: [repositoryRoot] } },
  optimizeDeps: { exclude: ["maplibre-gl"] },
  plugins: [presetsPlugin(presetsDirectory)],
});
