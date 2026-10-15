import { describe, expect, it } from "vitest";
import { AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES, agentReferenceUrl, appendAgentHelp, bindAgentLibrary, buildAgentTaskBrief, filterAgentReferences } from "@/features/agent-references";

describe("public agent references", () => {
  it("matches combined task terms and families", () => {
    expect(filterAgentReferences("  FLUID accessibility  ", "all").map((entry) => entry.id)).toEqual(["review-fluid-accessibility"]);
    expect(filterAgentReferences("", "guide").map((entry) => entry.id)).toEqual(["guide-onboarding", "guide-specialist-trainer"]);
    expect(filterAgentReferences("nonexistent", "all")).toEqual([]);
    expect(filterAgentReferences("DBA", "all").map((entry) => entry.id)).toContain("assist-performance-trace");
  });

  it("creates an explicit blank request for the selected installed skill, without browser data", () => {
    const brief = buildAgentTaskBrief("assist-integrations")!;
    expect(brief).toContain("ps-assist-integrations");
    expect(brief).toContain("Desired outcome: [describe the task]");
    expect(brief).toContain("Approved sanitized evidence: [paste only the artifacts needed]");
    expect(brief).not.toContain(location.href);
    expect(buildAgentTaskBrief("invented-agent")).toBeNull();
  });

  it("allows only public catalog sources and never adds page/session context", () => {
    for (const entry of [...AGENT_REFERENCES, ...LOCAL_SPECIALIST_REFERENCES]) {
      const url = new URL(agentReferenceUrl(entry.source)!);
      expect(url.origin).toBe("https://github.com");
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    }
    for (const source of ["../../private.md", "javascript:alert(1)", "https://example.com", "assist-fluid/AGENT.md?ICSID=secret"]) expect(agentReferenceUrl(source)).toBeNull();
  });

  it("keeps help links free of referrer data in an owning document", () => {
    const doc = document.implementation.createHTMLDocument("Synthetic PeopleSoft");
    appendAgentHelp(doc, doc.body);
    const link = doc.querySelector("a")!;
    expect(link.ownerDocument).toBe(doc);
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.referrerPolicy).toBe("no-referrer");
    expect(doc.body.textContent).toContain("does not send page data");
  });

  it("renders and filters without moving focus or persisting user input", () => {
    const doc = document;
    doc.body.innerHTML = '<input id="agent-search"><select id="agent-family"><option value="all">All</option><option value="review">Review</option></select><ul id="agent-list"></ul><p id="agent-results"></p><ul id="agent-templates"></ul><p id="agent-pack-version"></p><section id="agent-brief-panel" hidden><textarea id="agent-brief"></textarea><button id="agent-brief-copy">Copy</button><p id="agent-brief-status"></p></section>';
    bindAgentLibrary(doc);
    expect(doc.querySelectorAll("#agent-list > li")).toHaveLength(22);
    expect(doc.querySelectorAll("#agent-templates a")).toHaveLength(3);
    const search = doc.getElementById("agent-search") as HTMLInputElement;
    search.focus(); search.value = "fluid accessibility"; search.dispatchEvent(new Event("input"));
    expect(doc.activeElement).toBe(search);
    expect(doc.querySelectorAll("#agent-list > li")).toHaveLength(1);
    (doc.querySelector("#agent-list button") as HTMLButtonElement).click();
    expect(doc.activeElement).toBe(doc.getElementById("agent-brief"));
    expect((doc.getElementById("agent-brief") as HTMLTextAreaElement).value).toContain("review-fluid-accessibility");
    expect(doc.getElementById("agent-brief-panel")!.hidden).toBe(false);
    search.value = "not a task"; search.dispatchEvent(new Event("input"));
    expect(doc.getElementById("agent-results")!.textContent).toContain("No prompts match");
  });
});
