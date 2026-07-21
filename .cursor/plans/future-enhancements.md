# Plan — Future enhancements (BA + PeopleSoft developers)

> Agent-facing plan. Canonical backlog detail: [`docs/findings/future-enhancements.md`](../../docs/findings/future-enhancements.md).  
> User asked to capture these in Cursor plans/knowledge (2026-07-21).

## Goal

Grow Morris PeopleSoft Utilities into the daily driver for **business analysts** (orientation, documentation, navigation, search) and **PeopleSoft developers** (field identity, tracing, component jumping) without violating compliance: **no credentials, no telemetry, local settings only**.

## Current baseline (as of v1.0.7+)

- Classic Field Inspector works in `TargetContent` iframe; Rec/Fld/Row readout in flight / shipped on feature branch  
- Page Info + ToolsRel parsing hardened  
- Trace via delivered UTILITIES components; Favorites; env indicator; Adv Search / Correct History injects  
- Chrome Web Store path + AODA intent documented  

## Near-term bets (implement next when asked)

1. **Copy RECORD.FIELD** on Field Inspector lock (+ optional Markdown Page Info pack for tickets)  
2. **Richer Page Info** (DB name/type, UI mode) from connection comment  
3. **Favorites categories + filter** (storage fields already exist)  
4. **Fluid Field Inspector** selectors  
5. **Trace preset clarity** in Options  

## Guardrails for agents

- Read `docs/findings/future-enhancements.md` before inventing features  
- Prefer P1 IDs (FI-*, PI-*, FV-*, TR-*, SR-*) over P3 speculative work  
- Any new Chrome permission → update `docs/privacy.md`, `store/privacy-practices.md`, ADR if needed  
- Do not edit this plan’s intent to reintroduce Quick Logins or analytics  
- Classic portal + `#ptifrmtgtframe` remains the primary customer model; Fluid is second  

## Done when (for a picked item)

- Unit/smoke coverage for parsers/UI strings  
- Wiki use-case blurb updated if user-visible  
- CHANGELOG entry under Unreleased or next version  
- `npm run lint` + `npm run test:unit` green  

## Non-goals

See “Explicitly out of scope” in `docs/findings/future-enhancements.md`.
