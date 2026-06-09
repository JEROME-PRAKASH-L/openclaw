// Close reason truncation tests cover byte budgets and UTF-8 boundary safety.
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { truncateCloseReason } from "./close-reason.js";

describe("truncateCloseReason", () => {
  it("returns a fallback for empty reasons", () => {
    expect(truncateCloseReason("")).toBe("invalid handshake");
  });

  it("passes through reasons within the byte budget unchanged", () => {
    const reason = "connection refused";
    expect(truncateCloseReason(reason)).toBe(reason);
  });

  it("keeps multi-byte reasons within the byte budget unchanged when they fit", () => {
    const reason = "résumé"; // contains 2-byte characters but well under the limit
    expect(truncateCloseReason(reason)).toBe(reason);
  });

  it("truncates oversized reasons to the byte budget", () => {
    const reason = "x".repeat(200);
    const out = truncateCloseReason(reason);
    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(120);
    expect(out).toBe("x".repeat(120));
  });

  it("does not split a multi-byte UTF-8 character mid-sequence", () => {
    // 119 ASCII bytes followed by 3-byte '€' chars forces the 120-byte boundary
    // to land inside the first '€'. The naive byte-slice produced a trailing
    // U+FFFD replacement character here.
    const reason = "x".repeat(119) + "€".repeat(10);
    const out = truncateCloseReason(reason);
    expect(out).not.toContain("�");
    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(120);
    // The partial '€' is dropped entirely rather than emitted as a broken char.
    expect(out).toBe("x".repeat(119));
  });

  it("does not split a 4-byte emoji and stays within the budget", () => {
    const reason = "y".repeat(118) + "😀".repeat(5);
    const out = truncateCloseReason(reason);
    expect(out).not.toContain("�");
    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(120);
    expect(out).toBe("y".repeat(118));
  });

  it("respects a custom byte limit", () => {
    const out = truncateCloseReason("abcdefghij", 4);
    expect(out).toBe("abcd");
  });
});
