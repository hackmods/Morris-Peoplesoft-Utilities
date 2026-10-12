# Maintaining the PeopleSoft prompt pack

This directory is a portable prompt toolkit, separate from extension runtime code.

- Target PeopleTools 8.62 first. Ask for application pillar, application release/PUM image, database platform, Tools patch level, and Classic/Fluid context when they affect an answer.
- Keep examples generic and synthetic. Never commit employer hostnames, role names, schema customizations, credentials, or real student/employee records.
- Verify version-specific PeopleCode, Integration Broker, Component Interface, and Fluid behavior against Oracle 8.62 documentation. State uncertainty and require App Designer/schema evidence where needed.
- Browser field IDs do not establish record keys, scroll levels, or PeopleCode row paths. Distinguish browser observations from authoritative metadata.
- Keep database exploration read-only and bounded. Review effective-date/effective-sequence logic, keys, SetID, row security, and binds in the target schema.
- Keep full prompts, Cursor wrappers, Copilot stubs, README, and wiki descriptions consistent. No model- or employer-specific defaults.
- Package with `npm run package:agents`; nothing here belongs in the Chrome extension zip.
