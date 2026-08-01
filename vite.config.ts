import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const releaseChannel = packageJson.version.indexOf("-beta.") !== -1 ? "beta" : "final";
  const buildChannel = mode === "release" ? releaseChannel : mode;
  if (["dev", "beta", "final"].indexOf(buildChannel) === -1) {
    throw new Error(`Unsupported build channel: ${mode}`);
  }

  const localEntryRedirect: Plugin = {
    name: "skybreak-local-entry-redirect",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = (request as { url?: string }).url;
        if (requestUrl === "/Skybreak-Protocol/" || requestUrl === "/Skybreak-Protocol") {
          response.writeHead(302, { Location: "/Skybreak-Protocol/source/" });
          response.end();
          return;
        }
        next();
      });
    },
  };

  return {
    base: "/Skybreak-Protocol/",
    plugins: buildChannel === "dev" ? [react(), localEntryRedirect] : [react()],
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
