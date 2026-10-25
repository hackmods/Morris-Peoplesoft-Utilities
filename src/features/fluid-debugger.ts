import { isVisible } from "../adapters/dom";
import { detectUiModel, type UiModel } from "../adapters/ps-page";

export interface FluidDebugDocument {
  path: string;
  parent: string | null;
  access: "accessible" | "inaccessible";
  visible: boolean;
  frameKind: "root" | "target" | "other";
  uiModel: UiModel;
  fluidHeader: boolean;
  visibleModals: number;
  focused: boolean;
}

export interface FluidDebugSnapshot {
  schemaVersion: 1;
  documents: FluidDebugDocument[];
  shell: string;
  activeTarget: string | null;
  confidence: "structural" | "unknown";
  truncated: boolean;
  diagnostics: string[];
  limits: string[];
}

const MAX_DOCUMENTS = 24;
const MAX_DEPTH = 4;
const TARGET_SELECTOR = '.ps_target-iframe, #ptifrmtgtframe, iframe[name="TargetContent"]';

/** Explicit-action, read-only structural snapshot. Never reads values, URLs or page text. */
export function collectFluidDebugSnapshot(doc: Document): FluidDebugSnapshot {
  const documents: FluidDebugDocument[] = [];
  const seen = new Set<Document>();
  let truncated = false;
  function visit(current: Document, path: string, parent: string | null, visible: boolean,
    frameKind: FluidDebugDocument["frameKind"], depth: number, focused: boolean): void {
    if (seen.has(current)) return;
    seen.add(current);
    documents.push({ path, parent, access: "accessible", visible, frameKind,
      uiModel: detectUiModel(current),
      fluidHeader: !!current.querySelector("#PT_HEADER, #pthdr2container, #ptbr_header_container"),
      visibleModals: Array.from(current.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]'))
        .filter(element => !element.closest("#mpu-dialog, #mpu-bar") && isVisible(element)).length,
      focused });
    const frames = current.querySelectorAll<HTMLIFrameElement>("iframe, frame");
    if (depth >= MAX_DEPTH) { if (frames.length) truncated = true; return; }
    for (let i = 0; i < frames.length; i++) {
      if (documents.length >= MAX_DOCUMENTS) { truncated = true; break; }
      const frame = frames[i];
      const childPath = `${path}/${i + 1}`;
      const childVisible = visible && isVisible(frame);
      const kind = frame.matches(TARGET_SELECTOR) ? "target" : "other";
      let child: Document | null = null;
      try { child = frame.contentDocument; } catch { /* Cross-origin or unavailable. */ }
      if (child) visit(child, childPath, path, childVisible, kind, depth + 1,
        focused && current.activeElement === frame);
      else documents.push({ path: childPath, parent: path, access: "inaccessible", visible: childVisible,
        frameKind: kind, uiModel: "unknown", fluidHeader: false, visibleModals: 0, focused: false });
    }
  }
  visit(doc, "root", null, true, "root", 0, true);
  const accessible = documents.filter(node => node.access === "accessible" && node.visible);
  const modals = accessible.filter(node => node.visibleModals > 0);
  const targets = accessible.filter(node => node.frameKind === "target");
  const focusedTargets = targets.filter(node => node.focused);
  const candidates = modals.length ? modals : focusedTargets.length ? focusedTargets : targets;
  const activeTarget = candidates.length === 1 ? candidates[0].path
    : candidates.length === 0 && accessible.length === 1 ? "root" : null;
  const inaccessible = documents.some(node => node.access === "inaccessible" && node.visible);
  const confidence = activeTarget && !truncated && !inaccessible ? "structural" : "unknown";
  const diagnostics = [
    "Shell is the document where this diagnostic was requested; it may itself be framed.",
    "Active target is a structural candidate, not a confirmed PeopleSoft transaction owner.",
  ];
  if (modals.length) diagnostics.push("Visible dialog containers detected; ownership is reported by document only.");
  if (activeTarget === null) diagnostics.push("Multiple or absent target candidates: active ownership is unknown.");
  if (inaccessible) diagnostics.push("Visible frames are inaccessible or unavailable; their contents were not inspected.");
  if (truncated) diagnostics.push("Frame traversal limit reached; ownership may be incomplete.");
  return { schemaVersion: 1, documents, shell: "root", activeTarget, confidence, truncated, diagnostics,
    limits: ["At most 24 documents and 4 nested frame levels.",
      "No field values, page text, identifiers, tokens, URLs or PeopleSoft globals collected.",
      "No dirty-state detection, navigation execution, server checks or PeopleTools compatibility verification.",
      "Visibility uses DOM/CSS guards; overlapping elements and application ownership may remain unknown."] };
}

export function formatFluidDebugSnapshot(snapshot: FluidDebugSnapshot): string {
  return ["Fluid navigation diagnostic (read-only)",
    `Shell: ${snapshot.shell}; active target: ${snapshot.activeTarget ?? "unknown"}; confidence: ${snapshot.confidence}`,
    ...snapshot.documents.map(node => `${"  ".repeat(node.path.split("/").length - 1)}${node.path}: ${node.access}; ${node.frameKind}; ${node.uiModel}; ${node.visible ? "visible" : "hidden"}; header=${node.fluidHeader}; dialogs=${node.visibleModals}; focus=${node.focused}`),
    "Diagnostics:", ...snapshot.diagnostics.map(line => `- ${line}`),
    "Limits:", ...snapshot.limits.map(line => `- ${line}`)].join("\n");
}
