import { describe, expect, it } from "vitest";
import { isDuplicateTitle, normalizeTitle } from "./dedup.js";

describe("normalizeTitle", () => {
  it("lowercases the title", () => {
    expect(normalizeTitle("Two Sum")).toBe("two sum");
  });

  it("strips punctuation", () => {
    expect(normalizeTitle("Two-Sum!")).toBe("two sum");
    expect(normalizeTitle("Reverse the Array.")).toBe("reverse the array");
  });

  it("collapses whitespace", () => {
    expect(normalizeTitle("Two   Sum")).toBe("two sum");
    expect(normalizeTitle("  leading and trailing  ")).toBe("leading and trailing");
  });

  it("preserves digits", () => {
    expect(normalizeTitle("3Sum Closest")).toBe("3sum closest");
  });

  it("returns empty string for an all-punctuation title", () => {
    expect(normalizeTitle("---")).toBe("");
  });
});

describe("isDuplicateTitle", () => {
  it("returns true for an exact match", () => {
    expect(isDuplicateTitle(["Two Sum"], "Two Sum")).toBe(true);
  });

  it("returns true for case-insensitive matches", () => {
    expect(isDuplicateTitle(["Two Sum"], "two sum")).toBe(true);
    expect(isDuplicateTitle(["Two Sum"], "TWO SUM")).toBe(true);
  });

  it("returns true ignoring punctuation differences", () => {
    expect(isDuplicateTitle(["Two-Sum"], "Two Sum")).toBe(true);
    expect(
      isDuplicateTitle(
        ["Remove Duplicates from Sorted Array"],
        "Remove Duplicates from Sorted Array."
      )
    ).toBe(true);
  });

  it("returns false for clearly different titles", () => {
    expect(isDuplicateTitle(["Two Sum"], "Three Sum")).toBe(false);
    expect(isDuplicateTitle(["Two Sum", "Three Sum"], "Maximum Subarray")).toBe(false);
  });

  it("returns false against an empty existing list", () => {
    expect(isDuplicateTitle([], "Two Sum")).toBe(false);
  });

  it("returns false for an empty candidate", () => {
    expect(isDuplicateTitle(["Two Sum"], "")).toBe(false);
    expect(isDuplicateTitle(["Two Sum"], "---")).toBe(false);
  });
});
