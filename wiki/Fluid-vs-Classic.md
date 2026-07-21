# Fluid vs Classic

MPU detects:

- **Classic** — `ptifrmtgtframe` / `#pt_pageinfo`
- **Fluid** — header containers such as `#PT_HEADER`, `#pthdr2container`
- **Nav Collection** — `.ps_target-iframe`

The utilities bar mounts into Fluid headers when present. Search helpers attempt both Classic frame documents and top-level Fluid controls. Some PeopleTools versions differ—see FAQ if a helper no-ops.
