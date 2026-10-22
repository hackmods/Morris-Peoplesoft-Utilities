# Use cases — Technical

- **Integration Broker investigations:** Options → Integration Broker prepares a form-based draft or reads versioned JSON envelopes, supports bounded inert JSON/XML/SOAP payloads, supplied observation times, explicit record comparisons and case/checklist findings. It keeps stages distinct, cites JSON/XML lines, withholds masked-payload comparisons and requires report review before export. [Format and limits](Integration-Broker-Investigations).

- **Process Scheduler investigations:** Options → Process Scheduler combines explicitly selected sanitized text excerpts with an optional pasted ticket pack. Review source-line citations, supported timestamp ordering and explicit parent labels before export. The first parser uses synthetic samples; native/real-log compatibility remains unverified. [Scope and limits](Process-Scheduler-Investigations).

- **Trace SQL investigations:** Options → Trace SQL (also linked from Options → Tracing) accepts one sanitized `.tracesql` / `.trc` file or paste, then previews SQL/PeopleCode hotspots, independent SQL fingerprints, FROM/WHERE aggregates and a text plan tree. Session memory only; review before copy/download. Pair with prompt `assist-tracesql-hotspots` on sanitized report text only. Synthetic coverage; real PeopleTools compatibility unverified. [Scope and limits](Trace-SQL-Investigations).

- **Configuration comparison:** Options → Compare configuration accepts sanitized local INI-style or JSON files, masks sensitive pairs and requires report review before export. No server access or configuration writes. [Supported formats and limits](Configuration-Comparisons).

- **Environment comparisons:** Page Info → Prepare environment snapshot → review → Save reviewed snapshot. Repeat in the other environment, then open Options → Compare environments and select both snapshots explicitly. Review the report before saving, copying or downloading. [Walkthrough](Environment-Comparisons).

- **Production awareness and runbooks:** Explicitly classify environments in Options → Environments. Production adds a persistent badge and confirms MPU Field Entry writes and trace start, with access checks after confirmation. Keep component/environment procedures in local runbooks; preview team imports and resolve concurrent-edit conflicts. See [Environments](Environments) for limits and separate export instructions.

- **Agent references:** Options → Agents searches 24 PeopleSoft prompt descriptions and links to public setup/source pages and three private pillar templates, including Search Framework and portal/branding specialists. Popup/Side Panel open the local library; Help links to the toolkit. Use prompts in your approved Copilot/Claude/Codex tool; MPU does not run agents or send page data to AI services.

- **Trace:** Configure PeopleCode/SQL flags in Options → Tracing, then choose an explicit On or Off request from the bar. The bar distinguishes requested, last-confirmed save requests and unknown state, with the configured preset/flag count. This is request history, not live server/session status. Stale/incomplete requests and observed login/logout lose confidence; verify tracing in PeopleSoft. Requires access to delivered trace components. Partial failures never claim that trace stopped.
- **Field Inspector:** Orange icons beside fields on Classic and Fluid (`ps_box-*`), including Fluid menus/nav collections that host Classic pages in nested iframes; each field is wrapped tightly (not a shared container); viewport-scoped on large grids; Rec/Fld/Row (+ Label / Work / **Ctx** chips for Prompt, Display, Deferred / HTML type chips); high-contrast borders under forced-colors; click locks and copies PeopleCode formats (`RECORD.FIELD` / `&Record.FIELD` / `GetField` / `GetRowset…GetField`); Escape exits; Alt+Shift+C copies again.
- **Field Entry:** Opt-in **Entry** menu writes visible editable values only (eligibility preview first). Capture → Paste, From sheet (**multi-row grids**, with missing rows added manually in PeopleSoft), Find/Replace, named profiles. Discovers fields in Classic TargetContent, Fluid shells, and same-origin **modal/popup** frames (`ptModFrame`, dialog hosts). Soft-calls Classic `addchg_` when present; never auto-saves; skips passwords.
- **Page Info / Page Tabs / Tips:** ToolsRel, DB, portal/node/site, UI mode, **CREF path**, **theme**, page-token present (boolean only); ToolsRel context tips; Markdown copy; **object pack** (plain + Markdown) with **Compare object pack**; Compare clipboard; **Copy process pack** on Process Monitor pages; IB breadcrumb line when on Integration Broker pages; Page Tabs from delivered multi-page links; **Customization upgrade watch** — capture UI fingerprint before upgrade and **Check upgrade drift** after (tabs, structure hosts, field ids — not PeopleCode).
- **PCode context:** Lock the intended field with Inspect, then open **PCode**. Verify/correct the record and field names in App Designer, choose FieldChange or RowInit, describe and confirm the owning row/scroll context, then preview one reference example. Ambiguous DOM IDs need manual names; no field lock means no code preview. Copy is explicit and context changes invalidate it. The documentation/agent buttons open local Options; MPU cannot inspect server PeopleCode. [Example context and sources](PeopleCode-Context).
- **Structure:** Bar **Structure** button lists Fluid/Classic group boxes, scroll areas, grids, and related hosts plus CREF path / theme metadata when present (read-only).
- **Admin jumps:** Bar **Admin** flyout groups common setup components (Security, Portal, PeopleTools, Integration, Process, Reporting); uses your existing session.
- **IB breadcrumb:** On Integration Broker monitor pages, a compact bar chip shows Service Op / Queue / Node from visible DOM with **Copy IB**.
- **Go to / New Window / Recent / Side Panel:** Jump to Menu.Component.Market (Alt+Shift+G), open Favorites/Recent in `_newwin`, open the current component in a new tab, or use the Chrome Side Panel for Favorites + Page Info.
- **Login placement:** On sign-in pages the bar mounts above the password form container — credentials are never read.
- **UI scopes:** Options can limit Inspect / search helpers / Field Entry to Classic only, Fluid only, or both.
- **Backup:** Export full settings JSON from Favorites tab tools (import append or replace).

## Customization upgrade watch (UG-01)

1. Before a PeopleTools upgrade, open the customized component and **Page Info**.
2. Optionally enter notes, then **Capture baseline** — saves a dated local UI fingerprint, retaining up to five per component/environment and 50 overall.
3. After upgrade (or on another env), select the baseline/environment/date explicitly and **Check upgrade drift**. Review the Markdown handoff before choosing **Copy upgrade handoff**; its manual evidence/test/rollback sections remain unfilled.
4. Manage baselines in **Options → Upgrade** — list, delete, export/import JSON. PeopleCode-only overrides still need App Designer Compare Report or Change Assistant.

**Support diagnostics:** Page Info → Preview diagnostics creates an editable configuration summary without automatically including hostnames, field values, user IDs or session tokens. Review before explicit copy/download. It makes no network request and is not saved.

**Concurrent edits:** Independent settings edits from current extension tabs merge. Conflicting collection/form edits report a conflict and preserve the other tab's saved data; reload the view and reapply the intended change.

## AI agent prompts (side toolkit)

Not in the Chrome extension — use while coding in Cursor / VS Copilot / Claude:

- Browse: [`agents/`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents) · wiki [AI agent prompts](AI-Agent-Prompts)
- Download: `morris-peoplesoft-agents-v*.zip` from [GitHub Releases](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/latest)
- Specialists: data-correctness review, PeopleCode quality, security/SoD, SQL authoring, IB+CI integrations, MCP schema assist, design, onboarding, specialist trainer

## Planned enhancements

P3 Wave 5 items (SP-01…SP-08) shipped in **1.0.13**. Wave 6 (PC-01…03, FL-01, AD-01) shipped in **1.0.15**. Wave 6.1 (PC-04/05, FL-02/03, AD-02..04, TR-04/05) shipped in **1.0.16**. Wave 7 UG-01 (customization upgrade watch) shipped in **1.0.17**. Field Inspector Classic/Fluid/Classic-in-Fluid highlight fixes shipped in **1.0.18**. Shortcuts/Admin nested flyout fix shipped in **1.0.19**. Options Features QOL regroup + PCode starter clarity shipped in **1.0.20**. Agent prompt pack v3 shipped in **1.0.25**. Further ideas:

- [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md)

## Documentation, agent handoffs and Fluid debugging

- **Options / side panel → Oracle docs:** search the 45-manual PeopleTools 8.62 reference catalog, select topics, keep local favorites, and open official PDFs or HTML help. Other Tools versions fall back explicitly to Oracle's index. Verify application release/PUM separately.
- **Agents → Prepare task brief:** enter outcome, confirmed versions/context and sanitized evidence; Generate/update the preview, review/edit, then Copy. Nothing is sent automatically. Switching specialists preserves drafts unless you explicitly discard them.
- **Structure → Diagnose Fluid navigation:** inspect a bounded frame/target/modal map and copy its structural diagnostic. Unknown ownership remains unknown; this is not a save-warning bypass or server-state inspector.
- **PCode:** starter examples require event/row-context review. Use the linked agent and Oracle reference workflows for actual development assistance.
- **Popup:** see whether helpers are active on the current supported PeopleSoft URL. Use the host allowlist and Chrome site-access controls for stronger restrictions.
