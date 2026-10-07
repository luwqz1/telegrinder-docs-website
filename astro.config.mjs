import { defineConfig } from "astro/config";
import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncDocs } from "./scripts/sync-docs.mjs";

// One static build supports custom domains and GitHub Pages repository paths.
export default defineConfig({
  srcDir: "./website/src",
  publicDir: "./website/public",
  integrations: [{
    name: "telegrinder-docs",
    hooks: {
      "astro:config:setup": async ({ command, config }) => {
        if (command === "build" || command === "dev") {
          const root = fileURLToPath(config.root);
          await syncDocs(root);
          const docs = path.resolve(root, process.env.TELEGRINDER_DOCS_DIR ?? ".cache/telegrinder/docs");
          const assets = fileURLToPath(new URL("docs-assets/", config.publicDir));
          await rm(assets, { recursive: true, force: true });
          if (existsSync(path.join(docs, "assets"))) {
            await cp(path.join(docs, "assets"), assets, { recursive: true });
          }
        }
      },
    },
  }],
  site: process.env.SITE_URL ?? "https://telegrinder.rtfd.io",
  base: process.env.BASE_PATH ?? "/",
  trailingSlash: "always",
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  devToolbar: { enabled: false },
  vite: {
    server: { fs: { allow: [".."] } },
  },
});
