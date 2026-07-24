# VS Code / Visual Studio Copilot prompt stubs

Thin wrappers for [GitHub Copilot Chat reusable prompts](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot) (`.prompt.md`).

## Setup

1. Copy the `.prompt.md` files you need into your **PeopleSoft project** repo at `.github/prompts/` (not required inside this MPU extension repo unless you want them here for reference).
2. Open the matching [`../<agent-folder>/AGENT.md`](../README.md) and **paste its full body** under the `<!-- PASTE AGENT.md BELOW -->` line in the stub (keeps stubs from drifting out of sync with AGENT.md in git).
3. In Copilot Chat, use **Reuse prompts** / prompt picker and select the prompt.

Prompts are **model-agnostic** — use whatever model your org enables in Copilot. For Cursor, prefer the agent’s own `AGENT.md` or `cursor.mdc` instead of these stubs.
