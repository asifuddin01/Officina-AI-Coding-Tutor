# The trace schema

The types live in [`src/tracing/schema.ts`](../src/tracing/schema.ts); this is
the same thing by example. Every language adapter produces it and every view
reads it.

## A step is emitted when something finishes

```python
1  s = "madam"
2  i = 0
3  if s[i] != s[len(s) - 1 - i]:
4      print("no")
```

```json
{"step": 0, "event": "call", "line": 0, "fid": 0, "function": "<module>", "depth": 0}
{"step": 1, "event": "line", "line": 1, "fid": 0, "function": "<module>", "depth": 0,
 "changes": [[0, "s", "madam"]]}
{"step": 2, "event": "line", "line": 2, "fid": 0, "function": "<module>", "depth": 0,
 "changes": [[0, "i", 0]]}
{"step": 3, "event": "line", "line": 3, "fid": 0, "function": "<module>", "depth": 0,
 "conditions": [{"kind": "if", "expr": "s[i] != s[len(s) - 1 - i]", "result": false, "line": 3,
   "operands": [{"expr": "s[i]", "value": "m"}, {"expr": "s[len(s) - 1 - i]", "value": "m"}]}]}
{"step": 4, "event": "return", "line": 3, "fid": 0, "function": "<module>", "depth": 0}
```

Step 3 is line 3 *after it ran*: the condition, what each side evaluated to,
and the result. Line 4 never ran, so no step mentions it.

`x = f(3)` produces `call f` → f's lines → `return f` → the line step for
`x = f(3)` carrying `x`'s new value — the order it happened in.

## Fields

| Field | On | Meaning |
|---|---|---|
| `step` | all | 0-based, contiguous |
| `event` | all | `call`, `line`, `return`, `exception` |
| `line` | all | 1-based source line; `0` for the program's entry |
| `fid` | all | frame id — one activation of one function |
| `function`, `depth` | all | where, and how deep in the stack |
| `changes` | any | `[fid, name, value]` sets, `[fid, name]` deletes. May name *other* frames: a callee mutating a caller's list changes the caller's variable |
| `conditions` | line | every `if`/`while`/ternary test evaluated on that line, with operands; a short-circuited operand is `{"skipped": true}` |
| `loop` | line | on a loop header: `{"iteration": n}` entering the body, `{"done": n}` leaving |
| `stdout`, `stderr`, `stdin` | any | text written or read during the step |
| `partial` | line | the line was cut off by a limit |
| `parent`, `callerLine`, `args` | call | who called, from which line, with what |
| `returnValue`, `unwinding` | return | the value, or that an exception is passing through |
| `exception` | exception | `{type, message}` |

## Values

Encoded without running the program's code — no user `__repr__` is called.

| Python | Encoded |
|---|---|
| `None`, `True`, `3`, `'abc'` | `null`, `true`, `3`, `"abc"` |
| `2**70` | `{"t": "int", "r": "1180591620717411303424"}` |
| `3.0` | `{"t": "float", "r": "3.0"}` — never a bare `3` |
| a 300-char string | `{"t": "str", "v": "<first 200>", "n": 300}` |
| `[1, 2]`, `(1,)`, `{1}` | `{"t": "list", "items": [1, 2], "n": 2}` etc.; first 50 items, `n` is the true length |
| `{'a': 1}` | `{"t": "dict", "items": [["a", 1]], "n": 1}` |
| an instance | `{"t": "object", "cls": "Node", "attrs": [["value", 1], ["next", null]]}` |
| functions, classes, modules | `{"t": "function", "name": "f"}` … |
| too deep / self-referential | `{"t": "more", …}` / `{"t": "cycle", …}` |

## How a run ends

`TraceResult.status` is one of `ok`, `error` (uncaught exception — `error.step`
is where it was raised), `syntax` (nothing ran, so there are no steps),
`stopped` (a limit — `stopped.reason` is `steps`, `time`, `output` or
`hard-time`), `cancelled`, `rejected` (input too large) or `crashed` (the
tracer itself failed). `complete` is `false` whenever any step is missing.
