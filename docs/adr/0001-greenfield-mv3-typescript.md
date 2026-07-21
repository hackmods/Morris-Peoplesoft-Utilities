# ADR 0001: Greenfield MV3 TypeScript rewrite

## Status

Accepted

## Context

Legacy PS Utilities is jQuery-era code with MV3 scars. The repo is greenfield.

## Decision

Rebuild Morris PeopleSoft Utilities as a TypeScript + Vite Manifest V3 extension with no jQuery. Keep `.reference/PS-Utilities` as a behavior oracle only.

## Consequences

Faster Store compliance, maintainability, and Fluid/AODA work; requires reimplementation effort and migration helpers for settings.
