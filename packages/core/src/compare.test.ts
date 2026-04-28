import { describe, expect, it } from "vitest";
import { compareOutputs } from "./compare.js";

describe("compareOutputs", () => {
  it("reports agreement when all outputs match", () => {
    const inputs = [[1], [2], [3]];
    const refs = [1, 2, 3];
    const vals = [1, 2, 3];
    const result = compareOutputs(inputs, refs, vals);
    expect(result.agreed).toBe(true);
    expect(result.total).toBe(3);
    expect(result.firstDisagreementIndex).toBeNull();
    expect(result.note).toMatch(/agreed on all 3/);
  });

  it("reports the first disagreement index", () => {
    const inputs = [[1], [2], [3], [4]];
    const refs = [1, 2, 99, 4];
    const vals = [1, 2, 3, 4];
    const result = compareOutputs(inputs, refs, vals);
    expect(result.agreed).toBe(false);
    expect(result.firstDisagreementIndex).toBe(2);
    expect(result.note).toContain("input 2");
  });

  it("reports a length mismatch when outputs are short", () => {
    const inputs = [[1], [2], [3]];
    const refs = [1, 2, 3];
    const vals = [1, 2];
    const result = compareOutputs(inputs, refs, vals);
    expect(result.agreed).toBe(false);
    expect(result.firstDisagreementIndex).toBeNull();
    expect(result.note).toMatch(/length mismatch/);
  });

  it("uses deep equality for compound values", () => {
    const inputs = [[[1, 2]]];
    const refs = [{ a: 1, b: [2, 3] }];
    const vals = [{ b: [2, 3], a: 1 }];
    expect(compareOutputs(inputs, refs, vals).agreed).toBe(true);
  });

  it("flags a deep-equality difference", () => {
    const inputs = [[[1, 2]]];
    const refs = [{ a: 1, b: [2, 3] }];
    const vals = [{ a: 1, b: [2, 4] }];
    const result = compareOutputs(inputs, refs, vals);
    expect(result.agreed).toBe(false);
    expect(result.firstDisagreementIndex).toBe(0);
  });

  it("truncates very long values in the note", () => {
    const big = "x".repeat(500);
    const inputs = [[big]];
    const refs = [big];
    const vals = ["short"];
    const result = compareOutputs(inputs, refs, vals);
    expect(result.note.length).toBeLessThan(800);
    expect(result.note).toContain("…");
  });
});
