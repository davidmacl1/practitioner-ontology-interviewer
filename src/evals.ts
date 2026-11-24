import type { Turn } from "./claude.js";
import { isPractitionerSpeech } from "./interview.js";
import { NOT_COVERED, type Ontology } from "./schema.js";

/**
 * Evals for one failure that's easy to miss in production: an expert's
 * knowledge going in fine but coming out flattened. The ontology still looks
 * complete, the build still passes, and the AI quietly sounds generic.
 *
 * Every check here is deterministic, so it runs in CI without an API key.
 */

/** Something the ontology must contain, matched when an entry has every keyword. */
export type Expectation = { label: string; keywords: string[] };

/** The answer key for one interview, written by a human who read the transcript. */
export type Expected = {
  signaturePhrases: string[];
  guardrails: Expectation[];
  openItems: Expectation[];
  modalities: Expectation[];
};

export type CheckResult = {
  name: string;
  passed: boolean;
  found: number;
  total: number;
  failures: string[];
};

export type EvalReport = { passed: boolean; checks: CheckResult[] };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function result(name: string, total: number, failures: string[]): CheckResult {
  return { name, passed: failures.length === 0, found: total - failures.length, total, failures };
}

/** Keywords match at the start of a word: "diagnos" finds "diagnosis", and "rate" doesn't find "separate". */
function matchesAll(entry: string, keywords: string[]): boolean {
  const text = ` ${normalize(entry)}`;
  return keywords.every((keyword) => text.includes(` ${normalize(keyword)}`));
}

function checkExpectations(name: string, entries: string[], expected: Expectation[]): CheckResult {
  const failures = expected
    .filter((exp) => !entries.some((entry) => matchesAll(entry, exp.keywords)))
    .map((exp) => `missing: ${exp.label}`);
  return result(name, expected.length, failures);
}

/** The fields an AI can't reason like this practitioner without. */
const CORE_FIELDS: Array<[string, (o: Ontology) => string]> = [
  ["practitioner.name", (o) => o.practitioner.name],
  ["identity.distinctive", (o) => o.identity.distinctive],
  ["assessment.lookingFor", (o) => o.assessment.lookingFor],
  ["decisionLogic.interveneVsWait", (o) => o.decisionLogic.interveneVsWait],
  ["decisionLogic.sequencing", (o) => o.decisionLogic.sequencing],
  ["philosophy.problemsDevelop", (o) => o.philosophy.problemsDevelop],
  ["philosophy.improvementHappens", (o) => o.philosophy.improvementHappens],
  ["philosophy.success", (o) => o.philosophy.success],
  ["voice.tone", (o) => o.voice.tone],
];

export function checkCoverage(ontology: Ontology): CheckResult {
  const failures = CORE_FIELDS.filter(([, get]) => {
    const value = normalize(get(ontology));
    return value === "" || value === normalize(NOT_COVERED);
  }).map(([path]) => `empty: ${path}`);
  return result("Core fields covered", CORE_FIELDS.length, failures);
}

/** Signature phrases must survive word for word. A paraphrase counts as lost. */
export function checkSignaturePhrases(ontology: Ontology, expected: Expected): CheckResult {
  const kept = ontology.voice.signaturePhrases.map(normalize);
  const failures = expected.signaturePhrases
    .filter((phrase) => !kept.some((k) => k.includes(normalize(phrase))))
    .map((phrase) => `lost or paraphrased: "${phrase}"`);
  return result("Signature phrases preserved verbatim", expected.signaturePhrases.length, failures);
}

/** Every phrase attributed to the practitioner must appear in what they actually said. */
export function checkPhrasesGrounded(ontology: Ontology, transcript: Turn[]): CheckResult {
  const said = normalize(
    transcript
      .filter(isPractitionerSpeech)
      .map((turn) => turn.content)
      .join(" "),
  );
  const failures = ontology.voice.signaturePhrases
    .filter((phrase) => !said.includes(normalize(phrase)))
    .map((phrase) => `never said by practitioner: "${phrase}"`);
  return result("Signature phrases grounded in transcript", ontology.voice.signaturePhrases.length, failures);
}

export function runEvals(ontology: Ontology, expected: Expected, transcript: Turn[]): EvalReport {
  const checks = [
    checkCoverage(ontology),
    checkSignaturePhrases(ontology, expected),
    checkPhrasesGrounded(ontology, transcript),
    checkExpectations("Guardrails preserved", ontology.guardrails, expected.guardrails),
    checkExpectations("Open items preserved", ontology.openItems, expected.openItems),
    checkExpectations(
      "Modalities preserved",
      ontology.modalities.map((m) => `${m.name} ${m.purpose} ${m.whenUsed}`),
      expected.modalities,
    ),
  ];
  return { passed: checks.every((check) => check.passed), checks };
}

export function formatReport(report: EvalReport): string {
  const lines = report.checks.map((check) => {
    const head = `${check.passed ? "PASS" : "FAIL"}  ${check.name} (${check.found}/${check.total})`;
    return [head, ...check.failures.map((failure) => `      - ${failure}`)].join("\n");
  });
  lines.push("", report.passed ? "All checks passed." : "Some checks failed.");
  return lines.join("\n");
}
