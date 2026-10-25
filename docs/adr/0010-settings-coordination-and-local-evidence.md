# ADR 0010 — Coordinate settings edits and keep diagnostic evidence local

Date: 2026-10-15. Status: accepted for local build 1.0.29.

## Problem

Whole-object writes from Options, content scripts and the popup could silently overwrite independent edits. Stale array indices could redirect an edit after another context removed a row. Trace state also represented a local requested action as though it were current server state, and replacing an upgrade baseline discarded useful history.

## Decision

All production settings writes go through one service-worker queue. Clients send their original baseline and edited settings through a JSON-serializable message; the worker validates input, reads current storage and performs a three-way merge before writing. Independent object properties merge. Collections are atomic, so concurrent additions/reorders/deletions are either retried from fresh data by a functional update (up to three attempts) or reported as a conflict to the editor. Forms retain the baseline they rendered, rather than reading a fresh baseline and writing stale DOM values into it. The write response supplies merged settings to the caller. Worker failure has no uncoordinated write fallback.

Initialization uses the same queue and writes only if settings are absent. Reads of malformed existing settings still normalize in memory without persisting repairs. Environment deletion and its URL mapping changes remain one validated mutation; indices are never silently shifted by normalization. No-op writes are skipped, and recent-visit recording remains independent of settings refresh.

The message listener accepts only this extension's senders, keeps the asynchronous response channel open and returns bounded success/conflict/error replies. This follows Chrome's [message-passing guidance](https://developer.chrome.com/docs/extensions/develop/concepts/messaging), using literal `true` for compatibility with the declared Chrome minimum. No new permission or external message endpoint is introduced. Old injected scripts should be refreshed after an extension update; direct DevTools/legacy writes do not participate in the coordinator.

Trace records hold only an origin/site scope, target, timestamp and requested/confirmed/incomplete outcome. Confirmed means both save responses were acknowledged; it is never a live query of server/session state. Confidence becomes unknown on a mismatched scope, incomplete/stale request, future timestamp or after 15 minutes. Explicit On/Off controls avoid guessing the desired action from a stale boolean. Host, activation and feature access are revalidated between network steps, including before POST; partial failures never claim that tracing stopped.

Diagnostic reports contain a strict configuration allowlist. The user previews/edits before choosing copy or download. No page HTML, field/profile values, hostnames, user identifiers, object names, session tokens or raw errors are automatically included, and no report is stored or uploaded. Edited/exported text is controlled by the user.

Upgrade watches retain at most five dated baselines per component/environment and 50 overall, with explicit selection for cross-environment comparisons. Existing records remain usable. A Markdown handoff contains observed UI differences and blank reviewer sections for App Designer/Change Assistant evidence, tests, dependencies and rollback. It does not create a project, compare PeopleCode or deploy anything.

## Validation and limits

Unit and browser regressions cover concurrent/stale edits, failure recovery, bootstrap races, strict validation, redaction, trace confidence, pending-request cancellation, bounded history, explicit comparison and rendered keyboard/contrast behavior. Exact local outcomes are recorded in the build findings. Coverage gates stay unchanged.

Actual session expiry and external trace changes cannot be observed reliably from this local history. Real PeopleTools 8.62/assistive-technology checks, private application-specialist evidence and host/model prompt trials remain separate work; no synthetic check establishes these outcomes.
