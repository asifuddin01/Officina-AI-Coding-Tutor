# Officina, as it stands — and where the tutor goes

Step 1 of the build guide (§54, §57): inspect before changing anything.
This describes `src/pages/officina.astro` in the portfolio
(`asifuddin01/portfolio`) as of 2026-09-23, and the decisions that follow.

## What Officina is

| # | Question | Answer |
|---|---|---|
| 1 | Framework | Astro 7 static site, deployed as a Cloudflare Worker serving `./dist` (`wrangler.jsonc`). One page, one inline `<script>` of vanilla TypeScript. No UI framework. |
| 2 | Editor | Plain `<textarea>` per cell, auto-growing. No syntax highlighting, no line numbers, no editor library. Ctrl/⌘+Enter runs a cell. |
| 3 | Execution | Per language, all in the browser. **Python**: Pyodide 314 (CPython 3.14 → wasm), self-hosted under `/pyodide/` by `scripts/sync-pyodide.mjs`, loaded with a `<script>` tag **on the main thread**. **C/C++**: emception (clang + wasm-ld in wasm) via `@gameguild/emception-browser`, self-hosted under `/emception/`, in its own worker. **Java**: CheerpJ 4.2 JVM from the vendor's domain (the one declared third-party exception in `scripts/audit.mjs`) plus ecj from this origin. |
| 4 | Languages | `python`, `c`, `cpp`, `java` run; `asm` is edit-and-export. Declared in the `recipes` content collection (`runnable`, `runtime`), so the page cannot claim otherwise. |
| 5 | Assembly | Editor, examples and download only, with the command to assemble it locally. No simulator. |
| 6 | Persistence | `localStorage['officina.v1']` = `{ lang, cells[] }`. Export as .ipynb, source, Markdown, JSON, text. Nothing leaves the browser. |
| 7 | UI structure | Language tabs → toolbar (`.of-bar`) → cells rendered with `innerHTML` → about section → two `<dialog>`s (examples, download). Scoped Astro CSS; dynamic HTML is stamped with the scope attribute by hand. |
| 8 | Workers / wasm | Pyodide: none (main thread). emception: its own worker. CheerpJ: its own iframe/worker. No SharedArrayBuffer — the site deliberately sends no COOP/COEP (`public/_headers` explains: it would break CheerpJ). |
| 9 | Backend | None for Officina. The site's Worker (`edge/index.js`) handles only `/artifacts/private/*` and `/api/artifacts/*`, behind Cloudflare Access. |
| 10 | Tracing insertion point | Python: a worker running Pyodide with a tracer, separate from the notebook's main-thread Pyodide. |
| 11 | AI insertion point | Not yet. Needs a decision on provider (below). The page is static; a remote provider needs a server-side key, which means a Worker route. |
| 12 | Security risks today | See below. |
| 13 | Order | See the plan below. |

## Risks in the current notebook

- **Python runs on the main thread.** `while True: pass` in a cell freezes
  the tab; there is no timeout and no way to stop it short of closing the
  tab. The tutor runs Python in a worker it can terminate.
- **Python can reach the network with the site's cookies.** `import js;
  js.fetch(...)` from a cell is a same-origin request carrying
  `CF_Authorization`, so a pasted snippet could read
  `/artifacts/private/api/*` for a signed-in owner. The tutor's worker deletes
  the network APIs before user code runs; the notebook does not.
- **No output cap.** A cell that prints forever grows a `<pre>` until the tab
  runs out of memory.

These are in the notebook, not the tutor, and are not changed here.

## Decisions

**A separate page, in a separate repository.** The owner asked for the tutor
to live in its own repository (`asifuddin01/Officina-AI-Coding-Tutor`) and
its own page, reached from a button on the Officina page — not another
button in the notebook's toolbar. The guide warns against "separate
application architecture that duplicates Officina" (§53); this does not
duplicate it. The notebook stays the notebook. The tutor reuses Officina's
runtime (the same Pyodide build), its tokens and type, and its conventions
(self-hosted everything, no third-party requests), and adds what the notebook
does not do: trace, step and, later, explain.

**Python in a module worker, with a spare.** Pyodide 314 will not start in a
classic worker. Without SharedArrayBuffer there is no way to interrupt a
running program except terminating its worker, which destroys the loaded
interpreter; so once a run starts, a second worker loads in idle time and is
promoted instantly on cancel (§27.3).

**Steps flow; stepping is local.** The tracer streams steps in chunks — the
first 64 one at a time, then every 1,000 or every 100 ms — into a store that
checkpoints state every 256 steps. Every navigation is a read from that store
(§27.1). Measured: 50,000 steps traced in 387 ms, first chunk at 32 ms,
random step p95 0.5 ms.

**Warm on idle, on this page only.** The notebook fetches Pyodide on first
use so readers of the rest of the site pay nothing. The tutor page starts
loading it as soon as the browser is idle: anyone who opened it came to run
code. Measured: ready 1.2 s after page start, warm cache.

## Plan

1. ✅ Trace schema, Python tracer, worker runtime, store, trace view, app page.
2. Entry point: a button on `/officina`, outside the toolbar, and a way to
   serve the built tutor at `/officina/ai/` (build here, copy into the
   portfolio's `public/` at its build, as it already does with Pyodide).
3. AI provider abstraction (§21), with **No AI** working as it does now.
   Needs the owner's call — see the README.
4. Explanation mode, problem solver, "ask about this step".
5. Structure view (functions, calls) for large programs; selective tracing.
6. C/C++ via emception with source instrumentation; Java; the assembly
   simulator — each behind the same schema, one phase at a time.
