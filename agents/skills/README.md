# Portable PeopleSoft knowledge skills

Each ps-* directory has a self-contained SKILL.md with a precise name/description and full workflow. Copy selected directories intact:

- Codex project: .agents/skills/ps-*/SKILL.md. Current official documentation also lists user skills under ~/.agents/skills; check discovery in your installed version.
- Claude Code project: .claude/skills/ps-*/SKILL.md; personal skills use ~/.claude/skills.
- Claude Projects/other chat: attach the canonical definition or SKILL.md as task knowledge; account file limits and skill support vary.

[Official OpenAI documentation](https://learn.chatgpt.com/docs/build-skills), [Claude skill documentation](https://code.claude.com/docs/en/skills).

Invoke the exact skill name through the host's skill selector; Codex supports an explicit $ps-assist-fluid request and Claude Code uses /ps-assist-fluid. Do not install an unfilled local template or all workflows as global mandatory instructions. A skill does not implement an MCP connector or grant tool authority.

Source review and structural validation are recorded; host invocation/model behavior/real-system execution remain not run. After installation, confirm the correct skill appears and use a synthetic evaluation from the pack. Generated files: edit canonical definitions and run npm run generate:agents. [Catalog](../README.md).

## Efficient use

Start with one specialist and the relevant sanitized task evidence. Oracle links
are references: retrieve the smallest section needed, reuse still-current verified
evidence, and expand only to resolve a specific gap. A link alone does not load a
manual. Repeated full-manual retrieval and unnecessary delegation can increase
cost; this pack does not claim measured token or monetary savings.

The 4.2.0 working method makes intake, output artifacts and handoffs proportional
to the request while preserving domain safeguards and requested depth. Every
export remains self-contained. Installation, model behavior and target-system
validation must still be recorded separately from structural checks.
