// Measures what stepthru adds to a user's bundle: minified and gzipped, for the whole API and for common imports.
// Run with `npm run size` (builds first). `node scripts/size.mjs <out.json>` also writes the numbers for the size badge.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { rolldown } from "rolldown";

const dist = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const IMPORTS = {
  "everything": "*",
  "traceArray + render": "{ traceArray, render }",
  "traceGraph + render": "{ traceGraph, render }",
  "traceArray + toHTML": "{ traceArray, toHTML }",
};

const dir = mkdtempSync(join(tmpdir(), "stepthru-size-"));
const sizes = {};
try {
  for (const [name, what] of Object.entries(IMPORTS)) {
    const entry = join(dir, `${Object.keys(sizes).length}.js`);
    writeFileSync(entry, `export ${what} from ${JSON.stringify(dist)};`);
    const bundle = await rolldown({ input: entry, logLevel: "silent" });
    const { output } = await bundle.generate({ format: "esm", minify: true });
    const code = output[0].code;
    sizes[name] = { min: code.length, gzip: gzipSync(code, { level: 9 }).length };
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
for (const [name, { min, gzip }] of Object.entries(sizes)) console.log(`${name.padEnd(22)} ${kb(min).padStart(8)} min  ${kb(gzip).padStart(8)} gzip`);

const out = process.argv[2];
if (out) writeFileSync(out, JSON.stringify({ gzip: kb(sizes.everything.gzip), sizes }, null, 2) + "\n");
