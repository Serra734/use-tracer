# use-tracer

Tracks which closures retain a given object reference and reports the scope chain path from the entry point to each retainer.

## Why

When debugging memory retention in long-lived closures, the difficulty is not detecting that an object is retained — it is discovering *which* scope holds the reference. This library provides an explicit, deterministic API for recording retention points: you push a scope when entering a logical frame and track a target whenever a reference is captured. The resulting records give you the full path from entry to retainer.

The trade-off: detection is not automatic. You must instrument your code with `pushScope`/`track` calls. Automatic GC-based detection is non-deterministic and untestable; explicit instrumentation is verbose but precise.

## Usage

```js
import { Tracer } from 'use-tracer';

const tracer = new Tracer();
const target = {};

tracer.pushScope('entry');
tracer.pushScope('handler');
tracer.track(target, { ref: target }); // record that this scope retains `target`
tracer.popScope();
tracer.popScope();

for (const rec of tracer.getRetentions(target)) {
  console.log(rec.scopePath.join(' > ')); // 'entry > handler'
  console.log(rec.retainer);              // { ref: target }
}
```

## Edge cases

- `track` throws on primitives and `null`; only objects and functions are trackable.
- `popScope` on an empty stack throws — a mismatched pop usually indicates a logic error worth surfacing immediately.
- Recorded scope paths are snapshots; popping a scope after tracking does not retroactively shorten previously recorded paths.
