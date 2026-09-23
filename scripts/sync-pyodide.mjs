/**
 * Copies the Pyodide runtime out of node_modules into app/public/pyodide, so
 * the page loads Python from its own origin — the portfolio's rule, and the
 * same files /officina already serves (see its scripts/sync-pyodide.mjs).
 *
 * Only what the browser fetches is copied. The folder is gitignored and
 * rebuilt on every `npm run dev`, so an upgrade cannot leave a stale
 * interpreter beside a new loader.
 */
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'node_modules/pyodide';
const DEST = 'app/public/pyodide';
const NEEDED = ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });
let bytes = 0;
for (const name of NEEDED) {
  const from = path.join(SRC, name);
  try {
    bytes += (await stat(from)).size;
  } catch {
    console.error(`✗ ${from} is missing. Run \`npm install\`; if it is installed, the package layout changed — update NEEDED.`);
    process.exit(1);
  }
  await copyFile(from, path.join(DEST, name));
}
console.log(`✓ Pyodide ${NEEDED.length} files, ${(bytes / 1048576).toFixed(1)} MB → ${DEST}`);
