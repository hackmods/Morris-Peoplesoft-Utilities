import type { MpuSettings } from "../storage/schema";
import { isYes } from "../storage/schema";

function inject(path: string): void {
  const url = chrome.runtime.getURL(path);
  const s = document.createElement("script");
  s.src = url;
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

/** Run search-page helpers via page-context inject scripts */
export function runSearchOptions(settings: MpuSettings): void {
  const corr = isYes(settings.features.correctHistoryOption);
  const adv = isYes(settings.features.advSearchOption);
  if (!corr && !adv) return;

  if (corr && adv) {
    inject("inject/corr-hist-and-adv-search.js");
  } else if (corr) {
    inject("inject/corr-hist.js");
  } else {
    inject("inject/adv-search.js");
  }
}
