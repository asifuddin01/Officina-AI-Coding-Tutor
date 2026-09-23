import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { TraceResult, TraceStep } from '../../src/tracing/schema.ts';

export const TRACER = fileURLToPath(new URL('../../src/execution/python/tracer.py', import.meta.url));
export const program = (name: string) => fileURLToPath(new URL(`../programs/${name}`, import.meta.url));

/** Trace a program with native CPython, through tracer.py's command line. */
export function traceNatively(file: string, stdinFile?: string): { steps: TraceStep[]; result: TraceResult } {
  const args = [TRACER, file, ...(stdinFile ? [stdinFile] : [])];
  return JSON.parse(execFileSync('python3', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}
