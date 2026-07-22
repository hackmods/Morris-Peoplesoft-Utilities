import type { Environment, MpuSettings, UrlSiteMap } from "./schema";

/**
 * Remove an environment by index and remap `urlSites` envId values so
 * site-to-env links stay correct after the splice.
 */
export function removeEnvironmentAt(
  settings: MpuSettings,
  index: number,
): MpuSettings {
  if (index < 0 || index >= settings.environments.length) return settings;

  const environments: Environment[] = settings.environments.filter((_, i) => i !== index);
  const urlSites = remapUrlSitesAfterDelete(settings.urlSites, index);

  return { ...settings, environments, urlSites };
}

export function remapUrlSitesAfterDelete(urlSites: UrlSiteMap, deletedIndex: number): UrlSiteMap {
  const next: UrlSiteMap = {};
  for (const [base, sites] of Object.entries(urlSites)) {
    const nextSites: UrlSiteMap[string] = {};
    for (const [site, mapping] of Object.entries(sites)) {
      const { envId } = mapping;
      if (envId === deletedIndex) continue;
      nextSites[site] = { envId: envId > deletedIndex ? envId - 1 : envId };
    }
    if (Object.keys(nextSites).length) next[base] = nextSites;
  }
  return next;
}
