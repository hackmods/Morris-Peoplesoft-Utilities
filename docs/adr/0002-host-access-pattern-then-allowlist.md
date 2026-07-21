# ADR 0002: Host access — pattern first, allowlist opt-in

## Status

Accepted

## Context

Need public Store parity with classic PS Utilities while enabling college compliance tightening later.

## Decision

v1 uses PeopleSoft `psp`/`psc` URL patterns on any host. Phase 2 adds an **opt-in** host allowlist toggle (default off).

## Consequences

Equal public access at launch; IT can enable origin restriction without a private build.
