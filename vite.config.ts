import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  // `vite preview` always uses the production mode. Treat it as the checked
  // release build so local production testing uses the same channel as Pages.
  const effectiveMode = mode === "production" ? "release" : mode;
  const releaseChannel = packageJson.version.indexOf("-beta.") !== -1 ? "beta" : "final";
  const buildChannel = effectiveMode === "release" ? releaseChannel : effectiveMode;
  if (["dev", "beta", "final"].indexOf(buildChannel) === -1) {
    throw new Error(`Unsupported build channel: ${mode}`);
  }

  const localLegacyEntryShim: Plugin = {
    name: "skybreak-local-legacy-entry-shim",
    enforce: "pre",
    resolveId(id) {
      // Safari can retain the previous Pages document in its back/forward
      // cache. Vite transforms module requests before Connect middleware, so
      // this resolver must also catch the obsolete production entry here.
      if (/^\/Skybreak-Protocol\/assets\/main-[\w-]+\.js(?:\?.*)?$/.test(id)) {
        return "\0skybreak-local-legacy-main";
      }
      if (/^\/Skybreak-Protocol\/assets\/main-[\w-]+\.css(?:\?.*)?$/.test(id)) {
        return "\0skybreak-local-legacy-style";
      }
      return null;
    },
    load(id) {
      if (id === "\0skybreak-local-legacy-main") return 'import "/src/main.tsx";';
      if (id === "\0skybreak-local-legacy-style") return "";
      return null;
    },
    configureServer(server) {
      const legacyEntryHandler = (request: { url?: string }, response: { writeHead: (status: number, headers: Record<string, string>) => void; end: (body: string) => void }, next: () => void) => {
        const requestUrl = (request as { url?: string }).url || "";
        // Old local Safari tabs can still hold the committed Pages entry HTML.
        // It references a hash that belongs to an earlier build. Serve the
        // current Vite module instead, so that stale request cannot produce a
        // pre-transform error while local development continues normally.
        if (/^\/Skybreak-Protocol\/assets\/main-[\w-]+\.js(?:\?.*)?$/.test(requestUrl)) {
          response.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" });
          response.end('import "/src/main.tsx";');
          return;
        }
        if (/^\/Skybreak-Protocol\/assets\/main-[\w-]+\.css(?:\?.*)?$/.test(requestUrl)) {
          response.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" });
          response.end("/* Local legacy entry compatibility */");
          return;
        }
        next();
      };
      // `use()` appends the handler after Vite's transform middleware. The
      // stale Pages module would already trigger the error there, so insert
      // this compatibility route at the very front of the Connect stack.
      server.middlewares.stack.unshift({ route: "", handle: legacyEntryHandler });
    },
  };

  return {
    // Dev serves source files directly; Pages keeps its public repository base.
    base: buildChannel === "dev" ? "/" : "/Skybreak-Protocol/",
    plugins: buildChannel === "dev" ? [react(), localLegacyEntryShim] : [react()],
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
          reset: "source/reset.html",
        },
      },
    },
  };
});
