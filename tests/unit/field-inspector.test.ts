import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  isFieldInspectorActive,
  startFieldInspector,
  stopFieldInspector,
  toggleFieldInspector,
  fieldNameFromId,
  getLockedFieldName,
  syncFieldInspectorChrome,
  reinjectFieldInspector,
} from "@/features/field-inspector";

describe("field inspector", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mpu-bar">
        <button type="button" id="mpu-field">Inspect</button>
        <span id="mpu-recfield-name" class="mpu-recfield-name" hidden></span>
      </div>
      <div class="ps-field">
        <label>Emplid</label>
        <input id="JOB_EMPLID$0" value="1" />
      </div>
      <div class="ps-field">
        <span class="PSEDITBOX_DISPONLY" id="NAMES_NAME_DISPLAY">Ada</span>
      </div>
      <div class="ps-field">
        <input id="plain" value="no-underscore" />
      </div>
      <a id="ICSave">Save</a>
    `;
    stopFieldInspector(document);
  });

  afterEach(() => {
    stopFieldInspector(document);
    vi.useRealTimers();
  });

  it("formats field names like legacy (strip $occ, keep underscores)", () => {
    expect(fieldNameFromId("JOB_EMPLID$0")).toBe("JOB_EMPLID");
    expect(fieldNameFromId("STDNT_CAR_TERM_STRM")).toBe("STDNT_CAR_TERM_STRM");
  });

  it("toggles active state and exits on Escape", () => {
    expect(isFieldInspectorActive()).toBe(false);
    expect(toggleFieldInspector(document)).toBe(true);
    expect(isFieldInspectorActive()).toBe(true);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBeGreaterThan(0);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(isFieldInspectorActive()).toBe(false);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
  });

  it("injects inline SVG icons only for PeopleSoft-style ids containing underscore", () => {
    startFieldInspector(document);
    const icons = Array.from(document.querySelectorAll(".mpu-recfield-icon")) as HTMLImageElement[];
    expect(icons.length).toBe(2);
    expect(icons.every((img) => img.src.startsWith("data:image/svg+xml"))).toBe(true);
    expect(document.querySelector(".mpu-recfield-area")).toBeTruthy();
    expect(document.querySelector("a#ICSave")?.closest(".mpu-recfield-area")).toBeNull();
    stopFieldInspector(document);
    expect(document.getElementById("JOB_EMPLID$0")).toBeTruthy();
    expect(document.querySelector(".mpu-recfield-area")).toBeNull();
  });

  it("shows name on hover and locks green on icon click", () => {
    startFieldInspector(document);
    syncFieldInspectorChrome(document);
    expect(document.getElementById("mpu-field")?.textContent).toBe("Inspect ON");
    expect(document.getElementById("mpu-recfield-name")?.hidden).toBe(false);

    const img = document.querySelector(
      '.mpu-recfield-icon[data-mpu-field-id="JOB_EMPLID$0"]',
    ) as HTMLImageElement;
    expect(img).toBeTruthy();

    img.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(document.getElementById("mpu-recfield-name")?.textContent).toBe("JOB_EMPLID");

    img.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(getLockedFieldName()).toBe("JOB_EMPLID");
    expect(img.src).toContain(encodeURIComponent("#5DA027"));
    expect((img.parentElement as HTMLElement).style.border).toContain("rgb(93, 160, 39)");

    stopFieldInspector(document);
    syncFieldInspectorChrome(document);
    expect(getLockedFieldName()).toBeNull();
    expect(document.getElementById("mpu-field")?.textContent).toBe("Inspect");
  });

  it("reinjects icons after DOM wipe while still active", () => {
    startFieldInspector(document);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
    document.querySelectorAll(".mpu-recfield-icon, .mpu-recfield-area").forEach((el) => {
      if (el.classList.contains("mpu-recfield-icon")) el.remove();
      else {
        const area = el;
        const parent = area.parentElement!;
        while (area.firstChild) parent.insertBefore(area.firstChild, area);
        area.remove();
      }
    });
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(0);
    expect(reinjectFieldInspector(document)).toBe(2);
    expect(document.querySelectorAll(".mpu-recfield-icon").length).toBe(2);
  });
});
