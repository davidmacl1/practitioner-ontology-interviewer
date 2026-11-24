import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extractOntology } from "../extract.js";
import { sessionPath, type Session } from "../interview.js";
import { renderMarkdown } from "../render.js";

// Usage: npm run ontology -- <session-name | path/to/transcript.json>
const arg = process.argv[2] ?? "practitioner";
const path = arg.endsWith(".json") ? arg : sessionPath(arg);

const session = JSON.parse(readFileSync(path, "utf8")) as Session;
console.log(`Extracting ontology from ${session.transcript.length} turns...`);
const ontology = await extractOntology(session.transcript);

mkdirSync("output", { recursive: true });
const base = `output/${session.id}.ontology`;
writeFileSync(`${base}.json`, JSON.stringify(ontology, null, 2));
writeFileSync(`${base}.md`, renderMarkdown(ontology));
console.log(`Wrote ${base}.json and ${base}.md`);
