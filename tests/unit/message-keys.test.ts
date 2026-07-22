import { describe, expect, it } from "vitest";
import { scanMessageKeys, formatMessageKeysPlain } from "@/features/message-keys";

describe("message keys", () => {
  it("finds MsgGet patterns in visible text", () => {
    document.body.innerHTML = `<div>Call MsgGet(100, 5, "Hello") here</div>`;
    const hits = scanMessageKeys(document);
    expect(hits.some((h) => h.label === "MsgGet(100, 5)")).toBe(true);
    expect(hits[0]?.copyText).toBe("MsgGet(100, 5)");
  });

  it("finds message set/number pairs in comments", () => {
    document.body.innerHTML = `<!-- Message Set 42, Message Number 7 -->`;
    const hits = scanMessageKeys(document);
    expect(hits.some((h) => h.copyText === "MsgGet(42, 7)")).toBe(true);
  });

  it("finds XLAT hints and caps results", () => {
    document.body.innerHTML = `<span title="XLAT.EMPL_STATUS">Active</span>`;
    const hits = scanMessageKeys(document, 20);
    expect(hits.some((h) => h.label.startsWith("XLAT"))).toBe(true);
    expect(hits.length).toBeLessThanOrEqual(20);
  });

  it("never invents keys when none present", () => {
    document.body.innerHTML = `<div>Plain page text</div>`;
    expect(scanMessageKeys(document)).toEqual([]);
    expect(formatMessageKeysPlain([])).toContain("No Message Catalog");
  });
});
