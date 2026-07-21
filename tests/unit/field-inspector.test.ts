import { describe, expect, it, beforeEach } from "vitest";
import {
  isFieldInspectorActive,
  startFieldInspector,
  stopFieldInspector,
  toggleFieldInspector,
} from "@/features/field-inspector";

describe("field inspector", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mpu-bar"><button type="button">Bar</button></div>
      <input id="JOB_EMPLID$0" />
      <input id="NAMES_NAME" />
    `;
    stopFieldInspector(document);
  });

  it("toggles active state and exits on Escape", () => {
    expect(isFieldInspectorActive()).toBe(false);
    expect(toggleFieldInspector(document)).toBe(true);
    expect(isFieldInspectorActive()).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(isFieldInspectorActive()).toBe(false);
  });

  it("highlights fields on hover and locks on click", () => {
    startFieldInspector(document);
    const field = document.getElementById("JOB_EMPLID$0")!;
    field.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }));
    expect(field.classList.contains("mpu-field-highlight")).toBe(true);
    expect(document.getElementById("mpu-field-tip")?.textContent).toContain("JOB.EMPLID");

    field.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(field.classList.contains("mpu-field-locked")).toBe(true);

    stopFieldInspector(document);
    expect(field.classList.contains("mpu-field-highlight")).toBe(false);
    expect(document.getElementById("mpu-field-tip")).toBeNull();
  });
});
