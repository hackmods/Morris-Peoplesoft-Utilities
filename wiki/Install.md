# Install

## Chrome Web Store

When published, install from the Store listing (see repository README). Updates arrive automatically.

## Unpacked / development build

1. `npm ci && npm run generate:icons && npm run build`
2. Chrome → Extensions → Developer mode → Load unpacked → `dist/`

Or download the latest Store zip from [GitHub Releases](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/latest) (currently **v1.0.25**). Optional: download `morris-peoplesoft-agents-v*.zip` from the same release for the [AI agent prompt pack](AI-Agent-Prompts) (not part of the extension).

## Enterprise note

Organizations may force-install the Store extension via policy. Optional host allowlist can be enabled per user in Options.
