# Officina AI

**Write. Run. Understand.** A coding tutor for
[Officina](https://asifuddin.com/officina): write a program, trace it, and
step through what it actually did — every line, every variable change, every
condition and the values it compared — forwards and back.

> The computer executes. The AI explains. The learner understands.

The trace comes from the interpreter, never from a model. A language model
will explain traces; it will not write them.

## Status

Phase 1 (Python, build guide §42) — the deterministic half:

- [x] Python tracer: lines, variables (in every frame), conditions with
      operand values and short-circuits, loop iterations, calls, returns,
      exceptions, stdin/stdout
- [x] Runs in the browser on Pyodide, in a worker, with step/time/output
      limits and real cancellation
- [x] Trace viewer: current line, variables with before → after, list
      positions that changed, call stack, output up to the step, timeline,
      play/pause/scrub/keyboard
- [x] Its own page, `/officina/ai/`, in Officina's paper and ink
- [x] Entry point on the Officina page — a button in the page header, not
      in the notebook toolbar (portfolio branch `claude/officina-ai-setup-1c4d0c`)
- [ ] Getting the build into the portfolio's CI (see docs/inspection.md)
- [ ] AI provider abstraction; explanation, solver, "ask about this step"
- [ ] C/C++, Java, assembly simulator (phases 2–4)

Measured (M-series Mac, Chrome): Python ready 1.2 s after page start;
50,000 steps traced in 387 ms with the first on screen at 32 ms; any step
shown in 0.3 ms (p50) / 0.5 ms (p95) against a 50 ms budget.

## Run it

```bash
npm install
npm run dev          # http://localhost:5178/officina/ai/
npm test             # Python tracer on CPython 3.14, then the JS suite on Node + Pyodide
npm run check        # TypeScript
npm run build        # dist/, standalone, with its own copy of Pyodide
npm run build:portfolio   # dist-portfolio/, for asifuddin.com: uses the site's /pyodide/
```

On the portfolio, `scripts/sync-officina-ai.mjs` copies `dist-portfolio/` into
`public/officina/ai/` (point `OFFICINA_AI_DIST` at it), and the Officina page
shows its button only when that copy exists.

Needs Node ≥ 22.18 and Python 3.14 (the same version Pyodide 314 embeds —
the tests compare the two traces step for step).

## Layout

```
src/
  execution/python/
    tracer.py      the source of truth: runs a program under sys.settrace
    worker.js      Pyodide + tracer in a module worker, network removed
    runtime.ts     worker lifecycle, spare worker, limits, cancel, cache
  tracing/
    schema.ts      the language-independent step format
    store.ts       holds a trace; any step's state in O(256)
    cache.ts       content-addressed trace cache
  ui/
    trace-view.ts  the viewer; every navigation is a store read
    format.ts      values spelled as Python prints them
    highlight.ts   minimal Python highlighting
app/               the /officina/ai/ page
tests/python/      tracer tests on native CPython
tests/js/          store, formatter, and Pyodide-vs-CPython parity + budget
docs/              inspection of Officina, schema, security
```

## Docs

- [docs/inspection.md](docs/inspection.md) — Officina as it stands, the
  decisions taken, the plan
- [docs/trace-schema.md](docs/trace-schema.md) — the step format by example
- [docs/security.md](docs/security.md) — what stops untrusted code, and the
  one gap a CSP header closes
