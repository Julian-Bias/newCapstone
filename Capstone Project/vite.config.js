import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Use relative paths for production build
  build: {
    outDir: "dist", // Output folder for the build
  },
});
