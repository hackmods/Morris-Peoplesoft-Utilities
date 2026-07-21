# ADR 0006: Chrome Web Store compliance

## Status

Accepted

## Context

Legacy tooling struggled with public Store standards. End goal is an official Chrome plugin listing.

## Decision

Minimal permissions, tightened WAR matches, privacy policy, store asset pack, listing copy, submission checklist, and `audit:store` / `audit:compliance` CI gates. Do not reuse legacy manifest `key`.

## Consequences

Release discipline; human still completes Developer Dashboard payment/identity and upload.
