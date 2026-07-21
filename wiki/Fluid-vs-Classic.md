# Fluid vs Classic

MPU detects:

- **Classic** — `ptifrmtgtframe` / `#pt_pageinfo`
- **Fluid** — header containers such as `#PT_HEADER`, `#pthdr2container`
- **Nav Collection** — `.ps_target-iframe`

The utilities bar mounts into Fluid headers when present. Field Inspector decorates Fluid `ps_box-edit` / control hosts as well as Classic fields. Search helpers attempt both Classic frame documents and top-level Fluid controls (including MORE/expand-all). Some PeopleTools versions differ—see FAQ if a helper no-ops.
