import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Session } from "../src/interview.js";
import { checkPhrasesGrounded, normalize, runEvals, type Expected } from "../src/evals.js";
import { OntologySchema, type Ontology } from "../src/schema.js";

const dir = "fixtures/coach-dana";
const read = (file: string) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));

const expected = read("expected.json") as Expected;
const { transcript } = read("transcript.json") as Session;
// Real model outputs, saved from the two versions of the extraction prompt.
const v1 = OntologySchema.parse(read("ontology.v1-prompt.json"));
const v2 = OntologySchema.parse(read("ontology.v2-prompt.json"));

const check = (ontology: Ontology, name: string) =>
  runEvals(ontology, expected, transcript).checks.find((c) => c.name === name)!;

describe("evals on real extractions", () => {
  it("v2 prompt output passes every check", () => {
    const report = runEvals(v2, expected, transcript);
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
  });

  it("catches the v1 prompt dropping signature phrases said in passing", () => {
    const phrases = check(v1, "Signature phrases preserved verbatim");
    expect(phrases.passed).toBe(false);
    expect(phrases.failures).toEqual([
      'lost or paraphrased: "Pain is information, not a verdict."',
      'lost or paraphrased: "We earn the next rep."',
    ]);
  });
});

describe("evals catch hand-made regressions", () => {
  const withChanges = (change: (o: Ontology) => void): Ontology => {
    const copy = structuredClone(v2);
    change(copy);
    return copy;
  };

  it("flags a paraphrased signature phrase", () => {
    const paraphrased = withChanges((o) => {
      o.voice.signaturePhrases = o.voice.signaturePhrases.map((p) =>
        p.startsWith("Boring is the goal") ? "Consistency matters more than intensity." : p,
      );
    });
    expect(check(paraphrased, "Signature phrases preserved verbatim").failures).toContain(
      'lost or paraphrased: "Boring is the goal."',
    );
  });

  it("flags a phrase the practitioner never said", () => {
    const invented = withChanges((o) => o.voice.signaturePhrases.push("Strong is the new normal."));
    const grounded = checkPhrasesGrounded(invented, transcript);
    expect(grounded.passed).toBe(false);
    expect(grounded.failures).toEqual(['never said by practitioner: "Strong is the new normal."']);
  });

  it("flags dropped open items", () => {
    const lossy = withChanges((o) => (o.openItems = o.openItems.slice(0, 1)));
    expect(check(lossy, "Open items preserved").passed).toBe(false);
  });

  it("flags a missing guardrail", () => {
    const lossy = withChanges((o) => (o.guardrails = o.guardrails.filter((g) => !/medication/i.test(g))));
    expect(check(lossy, "Guardrails preserved").failures).toContain("missing: Never change or stop medication");
  });

  it("flags core fields left as Not covered", () => {
    const thin = withChanges((o) => (o.philosophy.success = "Not covered"));
    expect(check(thin, "Core fields covered").failures).toEqual(["empty: philosophy.success"]);
  });
});

describe("normalize", () => {
  it("ignores case, punctuation and curly quotes", () => {
    expect(normalize("Pain is information, not a verdict.")).toBe(normalize("pain is information not a verdict"));
    expect(normalize("It’s data")).toBe("it's data");
  });
});
