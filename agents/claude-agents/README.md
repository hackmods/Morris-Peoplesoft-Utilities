# Claude Code read-only specialist agents

Copy selected ps-*.md files to your project's .claude/agents or your private ~/.claude/agents directory. Their frontmatter supplies name, description and a restricted tool list (Read, Glob, Grep, WebFetch, WebSearch); no Bash, writes or MCP access is granted by these exports. Authors return draft code/design as text.

[Claude custom-agent documentation](https://code.claude.com/docs/en/sub-agents). Host versions/policies may restrict available tools. For a mapped database connector or authorized implementation workflow, tailor tools privately under your organization's policy; do not assume placeholder ps.* tools exist.

Use the host agent selector or explicitly ask for the named specialist. The specialist builder is a guide for creating private knowledge, not a filled pillar persona. Do not install both agents and skills with indistinguishable purposes unless you choose invocation deliberately. [Pack catalog](../README.md).
