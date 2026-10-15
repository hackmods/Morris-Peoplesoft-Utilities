# Portable PeopleSoft knowledge skills

Each ps-* directory has a self-contained SKILL.md with a precise name/description and full workflow. Copy selected directories intact:

- Codex project: .agents/skills/ps-*/SKILL.md. Current official documentation also lists user skills under ~/.agents/skills; check discovery in your installed version.
- Claude Code project: .claude/skills/ps-*/SKILL.md; personal skills use ~/.claude/skills.
- Claude Projects/other chat: attach the canonical definition or SKILL.md as task knowledge; account file limits and skill support vary.

[Official OpenAI documentation](https://learn.chatgpt.com/docs/build-skills), [Claude skill documentation](https://code.claude.com/docs/en/skills).

Invoke the exact skill name through the host's skill selector; Codex supports an explicit $ps-assist-fluid request and Claude Code uses /ps-assist-fluid. Do not install an unfilled local template or all workflows as global mandatory instructions. A skill does not implement an MCP connector or grant tool authority.

Source review and structural validation are recorded; host invocation/model behavior/real-system execution remain not run. After installation, confirm the correct skill appears and use a synthetic evaluation from the pack. Generated files: edit canonical definitions and run npm run generate:agents. [Catalog](../README.md).
