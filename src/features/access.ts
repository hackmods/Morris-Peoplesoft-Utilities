import type { ParsedPsUrl } from "../adapters/ps-page";
import { loadSettings, originAllowed } from "../storage/settings";
import { isYes, type FeatureFlags, type MpuSettings } from "../storage/schema";

/** Revalidate after a dialog, await, or delayed request, using current settings. */
export async function currentPageAccess(parsed: ParsedPsUrl, feature: keyof FeatureFlags): Promise<MpuSettings | null> {
  const settings = await loadSettings();
  if (!originAllowed(parsed.baseURL, settings) || !isYes(settings.features[feature])) return null;
  const mapping = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  if (mapping && !isYes(settings.environments[mapping.envId]?.active)) return null;
  return settings;
}
