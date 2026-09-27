/**
 * Null Delimited Line Splitter
 *
 * Splits file content on null bytes (U+0000) instead of newlines. This is the
 * record separator used by `find -print0`, `xargs -0`, `sort -z`, and similar
 * POSIX tools when filenames may contain newlines or other shell metacharacters.
 */

/**
 * Split a string on null bytes (U+0000).
 *
 * Design decisions, stated plainly so the tests and README agree:
 *
 * 1. A trailing null produces a trailing empty record. This mirrors how
 *    `String.prototype.split('\n')` behaves for newlines and how `read -d ''`
 *    consumers expect each record to be null-terminated. The caller can drop a
 *    trailing empty string with `.filter(Boolean)` if they know their input is
 *    strictly null-terminated.
 *
 * 2. An empty input string yields an array containing one empty string, not an
 *    empty array. This is exactly what `''.split('\u0000')` returns and keeps
 *    the function a strict drop-in for `split` with a different separator.
 *
 * 3. We do not strip, trim, or otherwise mutate the records. If the source data
 *    has trailing newlines within a record (legal in filenames), they survive.
 *
 * @param {string} input - The string to split. Must be a string.
 * @returns {string[]} The records, in order.
 * @throws {TypeError} If input is not a string.
 */
export function splitNullDelimited(input) {
  if (typeof input !== 'string') {
    throw new TypeError(`splitNullDelimited expected a string, got ${input === null ? 'null' : typeof input}`);
  }
  // String.prototype.split with a single-character string separator is the
  // simplest correct implementation. We use it directly rather than re-implementing
  // the scan, because the engine's split is faster and already handles every
  // edge case (surrogates, empty input, trailing separator) the way we want.
  return input.split('\u0000');
}

/**
 * Split a stream of text chunks on null bytes, yielding complete records as they
 * arrive. A null byte may fall anywhere in a chunk, including the first byte or
 * the last byte, so this function carries a pending buffer across calls.
 *
 * The returned object has two methods:
 *   - push(chunk): feed a string chunk; returns an array of complete records
 *                 flushed by this push.
 *   - flush():     returns an array containing any remaining buffered text. We
 *                 return it as a single-element array (or empty array) rather
 *                 than dropping it, because the caller may want to treat a
 *                 final non-null-terminated record as valid. If the input is
 *                 strictly null-terminated, the final flush returns [].
 *
 * @returns {{push: (chunk: string) => string[], flush: () => string[]}}
 */
export function splitNullDelimitedStream() {
  let buffer = '';

  return {
    push(chunk) {
      if (typeof chunk !== 'string') {
        throw new TypeError(`push expected a string chunk, got ${chunk === null ? 'null' : typeof chunk}`);
      }
      buffer += chunk;
      // If there are no nulls in the accumulated buffer, nothing is ready to emit.
      if (!buffer.includes('\u0000')) {
        return [];
      }
      const parts = buffer.split('\u0000');
      // The last element is the incomplete tail (possibly ''). It stays buffered.
      // Everything before it is a complete record.
      buffer = parts.pop();
      return parts;
    },
    flush() {
      const remaining = buffer;
      buffer = '';
      // Mirror splitNullDelimited: empty input yields one empty record. This
      // means a stream that never received a null and was flushed returns [''],
      // which is consistent with splitNullDelimited('').
      return [remaining];
    },
  };
}
