# ADR 0003: No credentials, no telemetry

## Status

Accepted

## Context

Quick Logins were removed upstream for good reason. College BA support must be compliance-friendly. Chrome Web Store privacy practices must be accurate.

## Decision

Never store passwords/credentials. No analytics or phone-home. Local `chrome.storage.local` only. Strip legacy `creds` on encounter.

## Consequences

Honest privacy questionnaire; safer BA deployment; no convenience autofill.
