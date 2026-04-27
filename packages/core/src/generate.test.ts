import { describe, expect, it } from "vitest";
import { deepEqual, extractJSON, GenerationError } from "./generate.js";

describe("extractJSON", () => {
  it("parses raw JSON", () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores leading/trailing whitespace", () => {
    expect(extractJSON('   \n {"a":1}\t  ')).toEqual({ a: 1 });
  });

  it("extracts a JSON object surrounded by prose", () => {
    const text = 'Here is the problem you asked for:\n\n{"a":1, "b":[2,3]}\n\nLet me know!';
    expect(extractJSON(text)).toEqual({ a: 1, b: [2, 3] });
  });

  it("extracts JSON from a fenced markdown code block", () => {
    const text = '```json\n{"a":1}\n```';
    expect(extractJSON(text)).toEqual({ a: 1 });
  });

  it("handles nested objects in the greedy match", () => {
    const text = 'noise {"outer": {"inner": 42}} more noise';
    expect(extractJSON(text)).toEqual({ outer: { inner: 42 } });
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJSON("just some text, no JSON here")).toThrow(GenerationError);
  });

  it("throws on malformed JSON that has no recoverable object", () => {
    expect(() => extractJSON("{not valid json at all")).toThrow();
  });
});

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it("returns false for differing primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("compares arrays by element", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
  });

  it("compares objects by key/value, ignoring key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("handles nested structures", () => {
    expect(deepEqual({ x: [1, { y: [2, 3] }] }, { x: [1, { y: [2, 3] }] })).toBe(true);
    expect(deepEqual({ x: [1, { y: [2, 3] }] }, { x: [1, { y: [2, 4] }] })).toBe(false);
  });

  it("treats null vs object as different", () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });

  it("treats array vs object with same shape as different", () => {
    expect(deepEqual([], {})).toBe(false);
  });
});
