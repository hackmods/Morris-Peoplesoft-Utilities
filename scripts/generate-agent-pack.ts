import { validatePack, writeExports } from "./agent-pack.js";

if (!process.argv.includes("--check")) writeExports();
const { catalog, files } = validatePack();
console.log(`Validated prompt pack ${catalog.version}: ${catalog.entries.length} prompts, ${catalog.templates.length} local templates, ${files.length} distributable files. Host/real-system trials remain not run.`);
