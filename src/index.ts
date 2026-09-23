/**
 * Officina tutor — the public surface.
 *
 * The execution layer (runtimes, tracer) and the view layer are separate
 * entry points into the same package so that a page can trace without
 * showing, or show a trace it got from elsewhere (a cache, a saved file).
 */
export { PythonRuntime, DEFAULT_LIMITS } from './execution/python/runtime.ts';
export type { TraceRequest, TraceRun, RuntimeState, RuntimeMetrics } from './execution/python/runtime.ts';
export { TraceStore } from './tracing/store.ts';
export type { StepView, FrameView, VariableChange } from './tracing/store.ts';
export type * from './tracing/schema.ts';
export { mountTraceView } from './ui/trace-view.ts';
export type { TraceView, TraceViewOptions } from './ui/trace-view.ts';
export { formatValue } from './ui/format.ts';
