import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNullDelimited, splitNullDelimitedStream } from '../src/index.js';

test('splitNullDelimited splits on null bytes', () => {
  const input = 'apple\u0000banana\u0000cherry';
  assert.deepEqual(splitNullDelimited(input), ['apple', 'banana', 'cherry']);
});

test('splitNullDelimited preserves trailing empty record after final null', () => {
  const input = 'a\u0000b\u0000';
  assert.deepEqual(splitNullDelimited(input), ['a', 'b', '']);
});

test('splitNullDelimited returns single empty string for empty input', () => {
  assert.deepEqual(splitNullDelimited(''), ['']);
});

test('splitNullDelimited handles leading null byte', () => {
  assert.deepEqual(splitNullDelimited('\u0000abc'), ['', 'abc']);
});

test('splitNullDelimited handles consecutive null bytes as empty records', () => {
  assert.deepEqual(splitNullDelimited('a\u0000\u0000b'), ['a', '', 'b']);
});

test('splitNullDelimited preserves embedded newlines within records', () => {
  // Filenames can legally contain newlines; we must not split on them.
  const input = 'line1\nline2\u0000second\nrecord';
  assert.deepEqual(splitNullDelimited(input), ['line1\nline2', 'second\nrecord']);
});

test('splitNullDelimited preserves other whitespace within records', () => {
  const input = '  spaced  \u0000\ttabbed\t';
  assert.deepEqual(splitNullDelimited(input), ['  spaced  ', '\ttabbed\t']);
});

test('splitNullDelimited throws TypeError for non-string input', () => {
  assert.throws(() => splitNullDelimited(42), { name: 'TypeError' });
  assert.throws(() => splitNullDelimited(null), { name: 'TypeError' });
  assert.throws(() => splitNullDelimited(undefined), { name: 'TypeError' });
});

test('splitNullDelimitedStream emits complete records as chunks arrive', () => {
  const stream = splitNullDelimitedStream();
  assert.deepEqual(stream.push('a\u0000b'), ['a']);
  assert.deepEqual(stream.push('\u0000c'), ['b']);
  assert.deepEqual(stream.push('\u0000'), ['c']);
});

test('splitNullDelimitedStream buffers until a null arrives', () => {
  const stream = splitNullDelimitedStream();
  assert.deepEqual(stream.push('partial'), []);
  assert.deepEqual(stream.push('-record\u0000'), ['partial-record']);
});

test('splitNullDelimitedStream flush returns remaining buffer as single record', () => {
  const stream = splitNullDelimitedStream();
  stream.push('complete\u0000incomplete');
  assert.deepEqual(stream.flush(), ['incomplete']);
});

test('splitNullDelimitedStream flush on empty buffer returns one empty record', () => {
  const stream = splitNullDelimitedStream();
  assert.deepEqual(stream.flush(), ['']);
});

test('splitNullDelimitedStream handles null byte as first character of a chunk', () => {
  const stream = splitNullDelimitedStream();
  assert.deepEqual(stream.push('abc'), []);
  assert.deepEqual(stream.push('\u0000def'), ['abc']);
  assert.deepEqual(stream.push('\u0000'), ['def']);
});

test('splitNullDelimitedStream handles multiple nulls in a single chunk', () => {
  const stream = splitNullDelimitedStream();
  assert.deepEqual(stream.push('a\u0000b\u0000c\u0000'), ['a', 'b', 'c']);
});

test('splitNullDelimitedStream push throws TypeError for non-string chunk', () => {
  const stream = splitNullDelimitedStream();
  assert.throws(() => stream.push(123), { name: 'TypeError' });
});
