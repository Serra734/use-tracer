import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tracer } from '../src/index.js';

test('track records current scope path', () => {
  const t = new Tracer();
  const obj = {};
  t.pushScope('entry');
  t.pushScope('closureA');
  t.track(obj);
  const rets = t.getRetentions(obj);
  assert.equal(rets.length, 1);
  assert.deepEqual(rets[0].scopePath, ['entry', 'closureA']);
});

test('track stores the retainer object when provided', () => {
  const t = new Tracer();
  const target = {};
  const holder = { ref: target };
  t.pushScope('s');
  t.track(target, holder);
  const rets = t.getRetentions(target);
  assert.equal(rets[0].retainer, holder);
});

test('retainer defaults to null', () => {
  const t = new Tracer();
  const obj = {};
  t.track(obj);
  assert.equal(t.getRetentions(obj)[0].retainer, null);
});

test('multiple retentions each recorded', () => {
  const t = new Tracer();
  const obj = {};
  t.pushScope('a');
  t.track(obj);
  t.popScope();
  t.pushScope('b');
  t.track(obj);
  const rets = t.getRetentions(obj);
  assert.equal(rets.length, 2);
  assert.deepEqual(rets[0].scopePath, ['a']);
  assert.deepEqual(rets[1].scopePath, ['b']);
});

test('popScope after track does not mutate recorded path', () => {
  const t = new Tracer();
  const obj = {};
  t.pushScope('a');
  t.pushScope('b');
  t.track(obj);
  t.popScope();
  const rets = t.getRetentions(obj);
  assert.deepEqual(rets[0].scopePath, ['a', 'b']);
});

test('popScope throws on empty stack', () => {
  const t = new Tracer();
  assert.throws(() => t.popScope(), /empty scope stack/);
});

test('pushScope rejects empty label', () => {
  const t = new Tracer();
  assert.throws(() => t.pushScope(''), /non-empty string/);
});

test('track rejects primitives', () => {
  const t = new Tracer();
  assert.throws(() => t.track(42), /objects and functions/);
  assert.throws(() => t.track(null), /objects and functions/);
});

test('getRetentions on unknown target returns empty array', () => {
  const t = new Tracer();
  assert.deepEqual(t.getRetentions({}), []);
});

test('reset clears records and scope stack', () => {
  const t = new Tracer();
  const obj = {};
  t.pushScope('a');
  t.track(obj);
  t.reset();
  assert.equal(t.getRetentions(obj).length, 0);
  assert.throws(() => t.popScope());
});

test('functions can be tracked as targets', () => {
  const t = new Tracer();
  const fn = () => {};
  t.pushScope('fn-scope');
  t.track(fn);
  assert.equal(t.getRetentions(fn)[0].target, fn);
});

test('recorded scopePath is a copy, not a live reference', () => {
  const t = new Tracer();
  const obj = {};
  t.pushScope('a');
  t.track(obj);
  const rec = t.getRetentions(obj)[0];
  rec.scopePath.push('mutated');
  const fresh = t.getRetentions(obj)[0];
  assert.deepEqual(fresh.scopePath, ['a']);
});
