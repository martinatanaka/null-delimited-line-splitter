# Null Delimited Line Splitter

Splits file content on null bytes (U+0000) instead of newlines, for parsing null-separated record formats such as the output of `find -print0`.

```js
import { splitNullDelimited, splitNullDelimitedStream } from 'null-delimited-line-splitter';

// Synchronous split of an already-buffered string.
const records = splitNullDelimited('file one.txt\u0000file two.txt\u0000');
// => ['file one.txt', 'file two.txt', '']

// Streaming split for data arriving in chunks.
const stream = splitNullDelimitedStream();
stream.push('file one.txt\u0000file');
stream.push(' two.txt\u0000');
stream.flush();
```

## Why

Filenames can contain newlines. Tools like `find -print0`, `xargs -0`, and `sort -z` use a null byte as the record separator so that newlines inside filenames do not break parsing. This library provides the matching splitter for JavaScript.

The trade-off: this library does one thing — it splits on `\u0000`. It does not trim whitespace, strip trailing newlines, or drop empty records. If your input is strictly null-terminated, the final element of `splitNullDelimited` will be an empty string; filter it yourself with `.filter(Boolean)` if you do not want it.

## Edge cases

- An empty input string returns `['']`, matching `String.prototype.split` semantics. This is not an empty array.
- A trailing null produces a trailing empty record.
- `splitNullDelimitedStream().flush()` returns the remaining buffered text as a single-element array. If the stream ended exactly on a null, flush returns `['']` — again mirroring `split`.
- Non-string input throws `TypeError`.

## API

- `splitNullDelimited(input: string): string[]` — splits `input` on every null byte.
- `splitNullDelimitedStream(): { push(chunk: string): string[], flush(): string[] }` — returns a stateful splitter. `push` feeds a chunk and returns any records completed by that chunk. `flush` returns the remaining buffer as a single-element array.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

