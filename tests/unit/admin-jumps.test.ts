import { describe, expect, it } from "vitest";
import { ADMIN_JUMPS, groupAdminJumps } from "@/features/admin-jumps";

describe("admin jumps", () => {
  it("groupAdminJumps returns Security category", () => {
    const groups = groupAdminJumps(ADMIN_JUMPS);
    const security = groups.find((g) => g.category === "Security");
    expect(security).toBeTruthy();
    expect(security!.items.length).toBeGreaterThanOrEqual(3);
    expect(security!.items.some((j) => j.component === "PERMISSION_LIST")).toBe(true);
  });
});
