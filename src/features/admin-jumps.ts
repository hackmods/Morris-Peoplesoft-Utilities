/**
 * Common PeopleTools / admin components for AD-01 jump panel.
 * Navigation uses the user's existing session — soft-fail if unauthorized.
 */
export interface AdminJump {
  id: string;
  label: string;
  category: string;
  menu: string;
  component: string;
  market?: string;
}

export const ADMIN_JUMPS: AdminJump[] = [
  {
    id: "perm-lists",
    label: "Permission Lists",
    category: "Security",
    menu: "MAINTAIN_SECURITY",
    component: "PERMISSION_LIST",
  },
  {
    id: "roles",
    label: "Roles",
    category: "Security",
    menu: "MAINTAIN_SECURITY",
    component: "ROLEMAINT",
  },
  {
    id: "user-profiles",
    label: "User Profiles",
    category: "Security",
    menu: "MAINTAIN_SECURITY",
    component: "USERMAINT",
  },
  {
    id: "portal-structure",
    label: "Structure and Content",
    category: "Portal",
    menu: "PORTAL_MENU",
    component: "PORTAL_CREF_ADM",
  },
  {
    id: "msg-catalog",
    label: "Message Catalog",
    category: "PeopleTools",
    menu: "UTILITIES",
    component: "MESSAGE_CATALOG",
  },
  {
    id: "ib-async",
    label: "IB Monitor — Asynchronous",
    category: "Integration",
    menu: "IB_MONITOR_MENU",
    component: "IB_MONITOR_ASYNCH",
  },
  {
    id: "ib-sync",
    label: "IB Monitor — Synchronous",
    category: "Integration",
    menu: "IB_MONITOR_MENU",
    component: "IB_MONITOR_SYNC",
  },
  {
    id: "process-monitor",
    label: "Process Monitor",
    category: "Process",
    menu: "PROCESS_SCHEDULER",
    component: "PMN_PRCSLIST",
  },
  {
    id: "web-profile",
    label: "Web Profile",
    category: "PeopleTools",
    menu: "WEB_PROFILE",
    component: "WEB_PROFILE",
  },
  {
    id: "query-manager",
    label: "Query Manager",
    category: "Reporting",
    menu: "QUERY_MANAGER",
    component: "QUERY_MANAGER",
  },
];

export function groupAdminJumps(
  jumps: AdminJump[] = ADMIN_JUMPS,
): Array<{ category: string; items: AdminJump[] }> {
  const map = new Map<string, AdminJump[]>();
  for (const j of jumps) {
    const list = map.get(j.category) || [];
    list.push(j);
    map.set(j.category, list);
  }
  return [...map.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((category) => ({
      category,
      items: (map.get(category) || []).slice().sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
