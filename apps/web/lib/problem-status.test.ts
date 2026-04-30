import { describe, expect, it } from "vitest";
import { acceptanceRate, deriveStatus } from "./problem-status.js";

describe("deriveStatus", () => {
  it("is unsolved when there are no submissions", () => {
    expect(deriveStatus({ totalSubmissions: 0, acceptedSubmissions: 0 })).toBe("unsolved");
  });

  it("is attempted when there are submissions but none accepted", () => {
    expect(deriveStatus({ totalSubmissions: 3, acceptedSubmissions: 0 })).toBe("attempted");
  });

  it("is solved when at least one submission is accepted", () => {
    expect(deriveStatus({ totalSubmissions: 5, acceptedSubmissions: 1 })).toBe("solved");
    expect(deriveStatus({ totalSubmissions: 1, acceptedSubmissions: 1 })).toBe("solved");
  });
});

describe("acceptanceRate", () => {
  it("is null when there are no submissions", () => {
    expect(acceptanceRate({ totalSubmissions: 0, acceptedSubmissions: 0 })).toBeNull();
  });

  it("is 0 when every submission failed", () => {
    expect(acceptanceRate({ totalSubmissions: 4, acceptedSubmissions: 0 })).toBe(0);
  });

  it("is 100 when every submission was accepted", () => {
    expect(acceptanceRate({ totalSubmissions: 3, acceptedSubmissions: 3 })).toBe(100);
  });

  it("rounds to the nearest integer", () => {
    expect(acceptanceRate({ totalSubmissions: 3, acceptedSubmissions: 1 })).toBe(33); // 33.333…
    expect(acceptanceRate({ totalSubmissions: 3, acceptedSubmissions: 2 })).toBe(67); // 66.666…
  });
});
