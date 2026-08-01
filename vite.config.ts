import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const releaseChannel = packageJson.version.indexOf("-beta.") !== -1 ? "beta" : "final";
  const buildChannel = mode === "release" ? releaseChannel : mode;
  if (["dev", "beta", "final"].indexOf(buildChannel) === -1) {
    throw new Error(`Unsupported build channel: ${mode}`);
  }

  return {
    base: "/Skybreak-Protocol/",
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_BUILD_CHANNEL__: JSON.stringify(buildChannel),
    },
    build: {
      target: "es2022",
      sourcemap: false,
      rollupOptions: {
        input: {
          main: "source/index.html",
          de: "source/de/index.html",
        },
      },
    },
  };
});
