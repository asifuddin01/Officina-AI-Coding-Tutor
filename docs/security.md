# Running other people's code

The tutor runs whatever is typed or pasted into it, including code a model
wrote. What stands between that code and anything that matters:

| Threat | What stops it | Tested by |
|---|---|---|
| Infinite loop | Step limit (50,000) and time limit (5 s) checked on every step; the trace so far is kept and marked incomplete | `Limits.test_step_limit…`, `test_time_limit` |
| Loop inside one C call (`sum(range(10**12))`) | The runtime kills the worker 2 s past the time limit and promotes a spare | browser check, `runtime.ts` |
| `except BaseException:` swallowing the stop | The stop is reported before it is raised; the runtime kills the worker if control does not come back within 750 ms | `test_except_exception_cannot_swallow_the_stop` |
| Output flood | 256 KB of output, then stop | `test_output_limit` |
| Deep recursion | `RecursionError`, reported as such | `test_deep_recursion` |
| Huge allocation | `MemoryError` inside the wasm heap, reported as `memory`; the page is unaffected | — |
| Network access | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `BroadcastChannel`, `FontFace` and the rest are deleted from the worker before user code runs | browser check |
| Forged traces | Results travel over a `MessagePort` held in a closure; the worker's `postMessage` is deleted | — |
| Files | Pyodide's file system is in-memory, per worker | — |
| Environment / secrets | None exist in the worker; `os.environ` is Pyodide's defaults | — |
| Process spawning | `subprocess` and `os.fork` do not exist in Pyodide | — |
| One run poisoning the next | builtins and every preloaded module are restored after each run; the tracer keeps a private copy of builtins and uses json's C encoder, so `builtins.isinstance = None` breaks only the program | `Isolation.*`, `pyodide.test.ts` |
| Page freeze | Everything runs in a worker; the page thread only paints | — |

## What is not closed yet

`import()` is syntax, not a global, so it cannot be deleted from the worker.
Code run through `js.eval(...)` could still request an arbitrary URL, and
leak whatever the program itself contains by putting it in the URL. It
cannot read a same-origin response through it, so the private archive stays
private.

The fix is a Content-Security-Policy on the deployed page. Workers created
from a Blob inherit the page's policy, so this closes it for the worker too:

```
/officina/ai/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src blob:; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'
```

`connect-src 'self'` still allows same-origin requests; Pyodide needs them to
load. Narrow it to the Pyodide path (`connect-src https://asifuddin.com/pyodide/`)
once the tutor is served from the portfolio.
