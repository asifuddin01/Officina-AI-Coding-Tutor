import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './tokens.css';
import './app.css';
import '../src/ui/trace-view.css';

import { PythonRuntime } from '../src/execution/python/runtime.ts';
import { mountTraceView, type TraceView } from '../src/ui/trace-view.ts';
import type { TraceResult } from '../src/tracing/schema.ts';
import { EXAMPLES } from './examples.ts';

/**
 * Officina AI — the page.
 *
 * Two tabs over one program: Code, where it is written, and Trace, where what
 * it did is stepped through. Tracing is the only thing that talks to the
 * runtime; everything on the Trace tab afterwards reads the finished trace.
 *
 * Unlike the notebook, this page loads Python as soon as the browser is idle:
 * somebody who opened the tutor came to run something, and the 13 MB is then
 * fetched while they read or type rather than after they press Trace. A repeat
 * visit takes it from the browser's cache.
 */

const STORE = 'officina.ai.v1';
const debug = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const codeEl = $<HTMLTextAreaElement>('code');
const gutter = $<HTMLElement>('gutter');
const stdinEl = $<HTMLTextAreaElement>('stdin');
const stdinWrap = $<HTMLDetailsElement>('stdin-wrap');
const statusEl = $<HTMLElement>('status');
const traceBtn = $<HTMLButtonElement>('trace');
const examplesEl = $<HTMLSelectElement>('examples');
const viewEl = $<HTMLElement>('view');
const staleEl = $<HTMLElement>('stale');
const noTrace = $<HTMLElement>('no-trace');
const tabs = { code: $<HTMLButtonElement>('tab-code'), trace: $<HTMLButtonElement>('tab-trace') };
const panels = { code: $<HTMLElement>('panel-code'), trace: $<HTMLElement>('panel-trace') };

const runtime = new PythonRuntime({
  indexURL: import.meta.env.VITE_PYODIDE_URL || `${import.meta.env.BASE_URL}pyodide/`,
  debug,
});

let view: TraceView | null = null;
let tracedSource: string | null = null;
let tracedInput: string | null = null;
let busy = false;

function status(text: string, kind: 'idle' | 'busy' | 'error' = 'idle') {
  statusEl.textContent = text;
  statusEl.dataset.kind = kind;
}

// ── Theme, shared with the rest of the site ──
const themeBtn = $<HTMLButtonElement>('theme');
function paintTheme() {
  const dark = document.documentElement.dataset.theme === 'nocturne';
  themeBtn.textContent = dark ? 'Vellum' : 'Nocturne';
  themeBtn.setAttribute('aria-label', `Switch to ${dark ? 'the light' : 'the dark'} theme`);
}
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'nocturne' ? 'vellum' : 'nocturne';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('codex-theme', next); } catch { /* the choice lasts this visit */ }
  paintTheme();
});
paintTheme();

// ── Tabs ──
function select(tab: 'code' | 'trace') {
  for (const name of ['code', 'trace'] as const) {
    tabs[name].setAttribute('aria-selected', String(name === tab));
    panels[name].hidden = name !== tab;
  }
  if (tab === 'trace') viewEl.focus({ preventScroll: true });
  else codeEl.focus({ preventScroll: true });
}
tabs.code.addEventListener('click', () => select('code'));
tabs.trace.addEventListener('click', () => select('trace'));

// ── The editor ──
function paintGutter() {
  const n = codeEl.value.split('\n').length;
  if (gutter.childElementCount === n) return;
  gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
}
function grow() {
  codeEl.style.height = 'auto';
  codeEl.style.height = `${Math.max(codeEl.scrollHeight, 240)}px`;
}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ code: codeEl.value, stdin: stdinEl.value }));
  } catch { /* private window: the work lasts this visit */ }
}
function markStale() {
  const stale = tracedSource !== null && (codeEl.value !== tracedSource || stdinEl.value !== tracedInput);
  staleEl.hidden = !stale;
}

codeEl.addEventListener('input', () => {
  paintGutter();
  grow();
  save();
  markStale();
  // An edit supersedes a trace still being made (build guide §27.6).
  if (busy) runtime.cancel();
});
stdinEl.addEventListener('input', () => { save(); markStale(); });

// Tab inserts four spaces rather than leaving the editor; Shift+Tab still leaves.
codeEl.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    void trace();
    return;
  }
  if (e.key === 'Tab' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    const { selectionStart: a, selectionEnd: b } = codeEl;
    codeEl.setRangeText('    ', a, b, 'end');
    codeEl.dispatchEvent(new Event('input'));
  }
});

// ── Examples ──
examplesEl.insertAdjacentHTML(
  'beforeend',
  EXAMPLES.map((x, i) => `<option value="${i}">${x.title}</option>`).join(''),
);
examplesEl.addEventListener('change', () => {
  const x = EXAMPLES[Number(examplesEl.value)];
  examplesEl.value = '';
  if (!x) return;
  codeEl.value = x.code;
  stdinEl.value = x.stdin ?? '';
  stdinWrap.open = Boolean(x.stdin);
  codeEl.dispatchEvent(new Event('input'));
  select('code');
  status(`${x.title}: ${x.note}`);
});

// ── Tracing ──
async function trace() {
  const source = codeEl.value;
  const input = stdinEl.value;
  if (!source.trim()) {
    status('There is no program to trace yet.', 'error');
    return;
  }
  busy = true;
  traceBtn.disabled = true;
  status(runtime.state === 'ready' ? 'Tracing…' : 'Preparing Python, then tracing…', 'busy');

  const run = await runtime.trace({ code: source, stdin: input });
  view?.destroy();
  view = null;
  tracedSource = source;
  tracedInput = input;
  markStale();
  noTrace.hidden = true;
  view = mountTraceView(viewEl, { source, store: run.store });
  select('trace');

  const result = await run.result;
  busy = false;
  traceBtn.disabled = false;
  if (run.store.length === 0) {
    // Nothing ran, so there is nothing to step through — only the reason.
    view.destroy();
    view = null;
    noTrace.hidden = false;
    noTrace.textContent = describeFailure(result);
    select(result.status === 'syntax' ? 'code' : 'trace');
    if (result.status === 'syntax' && result.error?.line) placeCaret(result.error.line, result.error.column ?? 1);
  }
  status(summarise(result, run.cached), result.status === 'ok' ? 'idle' : 'error');
}

function summarise(r: TraceResult, cached: boolean): string {
  const steps = `${r.steps.toLocaleString()} step${r.steps === 1 ? '' : 's'}`;
  const took = cached ? 'from the cache' : r.timing?.totalMs !== undefined ? `in ${r.timing.totalMs} ms` : '';
  switch (r.status) {
    case 'ok':
      return `Traced ${steps} ${took}.${r.exitCode ? ` The program exited with status ${r.exitCode}.` : ''}`;
    case 'error':
      return `Traced ${steps} ${took}. The program stopped with ${r.error?.type} on line ${r.error?.line ?? '?'}.`;
    case 'syntax':
      return describeFailure(r);
    case 'stopped':
    case 'cancelled':
      return r.stopped?.message ?? 'Stopped.';
    default:
      return describeFailure(r);
  }
}

function describeFailure(r: TraceResult): string {
  const e = r.error;
  if (r.status === 'syntax' && e) {
    return `Syntax error on line ${e.line ?? '?'}${e.column ? `, column ${e.column}` : ''}: ${e.message}. Nothing ran, so there is no trace.`;
  }
  if (r.status === 'cancelled') return 'Cancelled before any step was recorded.';
  return e ? `${e.message}` : r.stopped?.message ?? 'The program produced no steps.';
}

function placeCaret(line: number, column: number) {
  const before = codeEl.value.split('\n').slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
  const at = before + Math.max(0, column - 1);
  codeEl.focus();
  codeEl.setSelectionRange(at, at);
}

traceBtn.addEventListener('click', () => void trace());
$<HTMLButtonElement>('retrace').addEventListener('click', () => void trace());

runtime.onStateChange((s) => {
  if (busy) return;
  if (s === 'loading') status('Preparing Python in the background — you can start writing.', 'busy');
  else if (s === 'ready') status('Python is ready.');
  else if (s === 'failed') status('Python did not load. Check the connection and reload the page.', 'error');
});

// ── Start ──
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && typeof saved.code === 'string' && saved.code.trim()) {
      codeEl.value = saved.code;
      stdinEl.value = typeof saved.stdin === 'string' ? saved.stdin : '';
      stdinWrap.open = Boolean(stdinEl.value);
      return;
    }
  } catch { /* unreadable: start from the first example */ }
  codeEl.value = EXAMPLES[0].code;
}
restore();
paintGutter();
grow();

const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: object) => void }).requestIdleCallback;
(idle ?? ((cb: () => void) => setTimeout(cb, 200)))(() => void runtime.warm().catch(() => {}), { timeout: 1500 });

if (debug) Object.assign(globalThis, { officina: { runtime, get view() { return view; } } });
