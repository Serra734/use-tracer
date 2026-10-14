/**
 * Core tracking logic for use-tracer.
 *
 * DESIGN DECISION: We do NOT use a native WeakRef garbage-collection callback
 * (e.g. FinalizationRegistry) to detect retention. GC timing is non-deterministic
 * and therefore untestable. Instead, the caller explicitly pushes a scope when
 * entering a logical frame (e.g. a closure body) and pops it when leaving.
 * This makes the retained-scope chain fully deterministic and inspectable.
 */

/**
 * @typedef {Object} RetentionRecord
 * @property {unknown} target The object being tracked.
 * @property {string[]} scopePath The chain of scope labels from entry to the retainer.
 * @property {Object|null} retainer The object holding the reference, if provided.
 */

export class Tracer {
  /**
   * @param {object} [opts]
   * @param {() => number} [opts.now] A clock function returning a monotonic counter.
   *   Not used for timing; provided purely for deterministic operation sequencing.
   */
  constructor(opts = {}) {
    this._now = opts.now || (() => 0);
    // Map<targetId, Array<RetentionRecord>>
    this._records = new Map();
    this._scopeStack = [];
  }

  _targetId(target) {
    if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
      throw new TypeError('Tracer can only track objects and functions');
    }
    return target;
  }

  /**
   * Push a named scope onto the retention chain.
   * @param {string} label
   */
  pushScope(label) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new TypeError('scope label must be a non-empty string');
    }
    this._scopeStack.push(label);
    this._now();
  }

  /**
   * Pop the top scope. Throws if the stack is empty to surface logic errors.
   */
  popScope() {
    if (this._scopeStack.length === 0) {
      throw new Error('popScope called with empty scope stack');
    }
    this._scopeStack.pop();
    this._now();
  }

  /**
   * Record that `retainer` holds a reference to `target` at the current scope depth.
   * @param {object} target The tracked object.
   * @param {object|null} [retainer] The object retaining the reference.
   */
  track(target, retainer = null) {
    const id = this._targetId(target);
    if (!this._records.has(id)) {
      this._records.set(id, []);
    }
    const record = {
      target,
      scopePath: this._scopeStack.slice(),
      retainer,
    };
    this._records.get(id).push(record);
    this._now();
    return record;
  }

  /**
   * Return all retention records for `target`.
   * @param {object} target
   * @returns {RetentionRecord[]}
   */
  getRetentions(target) {
    const id = this._targetId(target);
    const list = this._records.get(id);
    if (!list) return [];
    return list.map((r) => ({ ...r, scopePath: r.scopePath.slice() }));
  }

  /**
   * Clear all records and reset the scope stack.
   */
  reset() {
    this._records.clear();
    this._scopeStack = [];
    this._now();
  }
}
