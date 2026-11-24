import { readFileSync } from "node:fs";
import type { Session } from "../interview.js";
import { formatReport, runEvals, type Expected } from "../evals.js";
import { OntologySchema } from "../schema.js";

// Usage: npm run eval -- <ontology.json> <expected.json> <transcript.json>
const [ontologyPath, expectedPath, transcriptPath] = process.argv.slice(2);
if (!ontologyPath || !expectedPath || !transcriptPath) {
  console.error("Usage: npm run eval -- <ontology.json> <expected.json> <transcript.json>");
  process.exit(2);
}

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const ontology = OntologySchema.parse(read(ontologyPath));
const expected = read(expectedPath) as Expected;
const { transcript } = read(transcriptPath) as Session;

const report = runEvals(ontology, expected, transcript);
console.log(formatReport(report));
process.exit(report.passed ? 0 : 1);
