/** Correct History then Advanced Search (Classic + Fluid search pages). */
(function mpuCorrAndAdv() {
  function resolveRoot(): Document | null {
    try {
      const named = (window as Window & { TargetContent?: Window }).TargetContent;
      if (named?.document?.body) return named.document;
    } catch {
      /* ignore */
    }
    try {
      const frame =
        (document.getElementById("ptifrmtgtframe") as HTMLIFrameElement | null) ||
        (document.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
      if (frame?.contentDocument?.body) return frame.contentDocument;
    } catch {
      /* ignore */
    }
    return document.body ? document : null;
  }

  function isSearchPage(root: Document): boolean {
    const body = root.body;
    if (!body) return false;
    if (/\bPSSRCHPAGE\b/i.test(body.className || "")) return true;
    if (root.getElementById("PTS_MORE_LESS_OPT")) return true;
    if (root.querySelector('[id*="PTS_ACCESS_MODE"], [name*="PTS_ACCESS_MODE"]')) return true;
    if (root.querySelector(".ps_box-search, #ptsrchpage, .PSSRCHRESULTS, #PTS_SEARCH")) return true;
    if (root.querySelector('[id*="SEARCH_DIALOG"], [id*="PSSRCH"]')) return true;
    return false;
  }

  function clickLabel(el: HTMLElement): void {
    el.click();
  }

  function expandAdvanced(root: Document): void {
    const toggle =
      root.getElementById("PTS_MORE_LESS_OPT") ||
      root.querySelector<HTMLElement>('[id*="MORE_LESS_OPT"]') ||
      root.querySelector<HTMLElement>('[id*="MORE_LESS"]');
    if (toggle) {
      if (toggle.getAttribute("aria-expanded") === "false") {
        clickLabel(toggle);
      } else {
        const tip = `${toggle.getAttribute("title") || ""} ${toggle.textContent || ""}`;
        if (/advanced|more\s*options|show\s*more/i.test(tip)) {
          clickLabel(toggle);
        }
      }
    }

    const clickables = Array.from(
      root.querySelectorAll<HTMLElement>("a, button, span[role='button'], input[type='button']"),
    );
    for (const el of clickables) {
      const text = (el.textContent || el.getAttribute("value") || "").replace(/\s+/g, " ").trim();
      if (/^advanced\s*search$/i.test(text) || /show\s*advanced/i.test(text)) {
        clickLabel(el);
        break;
      }
    }

    for (let guard = 0; guard < 12; guard += 1) {
      const more = Array.from(
        root.querySelectorAll<HTMLElement>("a, button, span[role='button'], input[type='button']"),
      ).find((el) => {
        const text = (el.textContent || el.getAttribute("value") || el.getAttribute("title") || "")
          .replace(/\s+/g, " ")
          .trim();
        return (
          /^(more|show\s*more|expand)$/i.test(text) ||
          /show\s*all\s*(search\s*)?criteria/i.test(text) ||
          /^more\s*options$/i.test(text)
        );
      });
      if (!more) break;
      clickLabel(more);
    }
  }

  try {
    const root = resolveRoot();
    if (!root || !isSearchPage(root)) return;

    const corr =
      (root.getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")[0] as HTMLElement | undefined) ||
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C") ||
      root.querySelector<HTMLElement>('[id*="PTS_ACCESS_MODE_C"]') ||
      root.querySelector<HTMLElement>('[name*="PTS_ACCESS_MODE_C"]') ||
      root.querySelector<HTMLElement>('input[value="C"][id*="ACCESS_MODE"], input[value="C"][name*="ACCESS_MODE"]');
    corr?.click();
    expandAdvanced(root);
  } catch {
    /* ignore */
  }
})();
