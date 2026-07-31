import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Skybreak-Protocol/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "index.html",
        de: "de/index.html",
      },
    },
  },
});
