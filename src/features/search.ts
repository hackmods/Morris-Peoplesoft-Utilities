import type { MpuSettings } from "../storage/schema";
import { isYes } from "../storage/schema";

function inject(path: string): void {
  const url = chrome.runtime.getURL(path);
  // Avoid stacking duplicate inject tags on rapid refresh
  const existing = document.querySelector(`script[data-mpu-inject="${path}"]`);
  existing?.remove();
  const s = document.createElement("script");
  s.src = url;
  s.dataset.mpuInject = path;
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

function injectSelected(settings: MpuSettings): void {
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

/** Run search-page helpers via page-context inject scripts (with late iframe retries). */
export function runSearchOptions(settings: MpuSettings): void {
  const corr = isYes(settings.features.correctHistoryOption);
  const adv = isYes(settings.features.advSearchOption);
  if (!corr && !adv) return;

  injectSelected(settings);
  // Classic portal: TargetContent may not be ready at first paint
  window.setTimeout(() => injectSelected(settings), 400);
  window.setTimeout(() => injectSelected(settings), 1200);
}
