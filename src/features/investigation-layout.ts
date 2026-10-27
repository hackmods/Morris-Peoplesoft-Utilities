export interface InvestigationLayout {
  heading: HTMLElement;
  intro: HTMLElement;
  notice: string;
  guidance: Node[];
  sources: Node[];
  preview: Node[];
  review: Node[];
}

/** Keep the main task visible; detailed input rules remain available without dominating it. */
export function mountInvestigationLayout(doc: Document, root: HTMLElement, layout: InvestigationLayout): void {
  root.classList.add("mpu-investigation");
  const notice = doc.createElement("p"); notice.className = "mpu-investigation-notice";
  notice.textContent = layout.notice;
  const guidance = doc.createElement("details"); guidance.className = "mpu-investigation-guidance";
  const summary = doc.createElement("summary"); summary.textContent = "Supported inputs, limits and privacy details";
  guidance.append(summary, ...layout.guidance);
  const step = (title: string, nodes: Node[]) => {
    const section = doc.createElement("section"); section.className = "mpu-investigation-step";
    section.setAttribute("aria-label", title);
    const heading = doc.createElement("h3"); heading.textContent = title;
    section.append(heading, ...nodes); return section;
  };
  root.replaceChildren(layout.heading, layout.intro, notice, guidance,
    step("1. Choose sources", layout.sources),
    step("2. Preview and investigate", layout.preview),
    step("3. Review and export", layout.review));
  for (const report of root.querySelectorAll<HTMLTextAreaElement>("textarea[readonly]")) {
    report.placeholder = "Preview a report to review it here.";
  }
  for (const checkbox of root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    checkbox.parentElement?.classList.add("mpu-investigation-check");
  }
}
