// Used by `npm run site`. Every folder here with an index.html is a page; the sitemap lists them all.
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";

const SITE = "https://kamaterasu.github.io/stepthru/";
const root = fileURLToPath(new URL(".", import.meta.url));
const pages = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/index.html`))
  .map((d) => d.name);

const sitemap: Plugin = {
  name: "sitemap",
  generateBundle() {
    const urls = ["", ...pages.map((p) => `${p}/`)].map((p) => `  <url><loc>${SITE}${p}</loc></url>`);
    this.emitFile({
      type: "asset",
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    });
  },
};

export default {
  plugins: [sitemap],
  build: {
    rollupOptions: {
      input: { index: `${root}index.html`, ...Object.fromEntries(pages.map((p) => [p, `${root}${p}/index.html`])) },
    },
  },
} satisfies UserConfig;
