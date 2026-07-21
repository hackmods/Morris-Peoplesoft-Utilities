# ADR 0004: Classic / Fluid adapters

## Status

Accepted

## Context

Legacy code assumed Classic iframes (`ptifrmtgtframe`, `TargetContent`) with partial Fluid patches.

## Decision

Detect UI model (`classic` | `fluid` | `navCollection`) and route DOM/header/search operations through adapters. Feature modules stay model-agnostic.

## Consequences

Clearer Fluid support and test fixtures; some PS version variance remains best-effort.
