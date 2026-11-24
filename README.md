# Practitioner Ontology Interviewer

An AI agent that interviews an expert practitioner (a coach, clinician or therapist), turns the conversation into a structured **practice ontology**, and **evaluates whether the expert's voice and judgment survived** the trip.

It's extracted from [Archimedes](#background), a platform I built that turns a practitioner's methodology into AI tools for them and their clients. This repo is the capture-and-verify core, with a fictional practitioner so you can run it end to end.

```
 interview (agent, resumable)  →  transcript  →  extraction (structured output)  →  ontology  →  evals
```

## Why the evals exist

In production, I audited one practitioner's live ontology against her original interview and found that **an 18-item list of open follow-ups and 3 of her 5 signature phrases had silently disappeared.** Nothing errored. The ontology looked complete, the app built fine, and the AI just started sounding generic, which is exactly what she complained about.

So the evals here check for loss, not just shape:

| Check | What it catches |
|---|---|
| Core fields covered | Philosophy, decision logic or voice left empty or "Not covered" |
| Signature phrases preserved verbatim | An expert's own lines dropped or paraphrased into blandness |
| Signature phrases grounded in transcript | Phrases attributed to the expert that they never said |
| Guardrails preserved | A "never do X" constraint going missing |
| Open items preserved | Promised materials and pending decisions getting lost |
| Modalities preserved | Services the practitioner offers going missing |

Every check is deterministic and runs in CI without an API key, against an answer key (`expected.json`) a person writes after reading the transcript.

## The evals caught a real regression

Running the first version of the extraction prompt on the fixture interview:

```
PASS  Core fields covered (9/9)
FAIL  Signature phrases preserved verbatim (2/4)
      - lost or paraphrased: "Pain is information, not a verdict."
      - lost or paraphrased: "We earn the next rep."
PASS  Signature phrases grounded in transcript (3/3)
PASS  Guardrails preserved (5/5)
PASS  Open items preserved (4/4)
PASS  Modalities preserved (4/4)
```

The model kept phrases the coach introduced as quotes ("My line is…") and dropped the ones she said in passing while explaining her philosophy, which are the lines that make her sound like her. Rewording the rule (in the prompt and the schema description) to cover lines said in passing fixed it: **3 of 3 runs passed** afterward. Both real outputs are saved in `fixtures/coach-dana/`, and the test suite locks in that the evals catch the v1 failure.

**Limitation:** the fix was validated on this one fixture. The next step is a second practitioner the prompt was never tuned on, run several times, to check it generalizes.

## Quick start

```bash
npm install
cp .env.example .env            # add ANTHROPIC_API_KEY

# Run an interview (type /pause to stop; run the same command to resume)
npm run interview -- my-practitioner

# Extract the ontology (JSON + a markdown version for the practitioner to review)
npm run ontology -- my-practitioner

# Evaluate it against an answer key
npm run eval -- output/my-practitioner.ontology.json path/to/expected.json sessions/my-practitioner.json

# Or run everything offline on the fixture
npm test
```

## Design decisions

- **The interview and the extraction are separate calls.** The interviewer optimizes for a good conversation (one question at a time, follow-ups, completeness checks per section). The extractor optimizes for faithful structure. Asking one prompt to do both made each worse.
- **Structured outputs, validated by a schema.** The extractor returns JSON constrained to a Zod schema (`src/schema.ts`), so downstream code never has to guess at the shape.
- **The transcript on disk is the agent's memory.** Interviews with busy experts get interrupted. Sessions save after every turn and resume where they stopped.
- **"Not covered" beats a plausible guess.** The extractor is told to leave gaps visible rather than fill them, and the coverage eval surfaces them.
- **Verbatim over tidy.** An expert's voice lives in their exact phrasing. The evals treat a paraphrase as a loss.

## Project layout

```
src/
  prompts/interviewer.md   interview agent's system prompt
  interview.ts             resumable interview session
  extract.ts               transcript → ontology (structured output)
  schema.ts                the ontology schema
  evals.ts                 deterministic evals
  render.ts                ontology → markdown for practitioner review
  cli/                     interview, ontology and eval commands
fixtures/coach-dana/       fictional practitioner: transcript, answer key, real model outputs
tests/                     eval tests (no API key needed)
```

## Background

I'm a fitness practitioner (30+ years of coaching) who builds production AI systems with Claude Code. Archimedes uses this interview → ontology → AI pattern to power:

- **Archimedes Coach and Archimedes Train:** native iOS, Android and web apps for coaches and clients, with six specialized AI agents, each built on its own ontology.
- **Clinical tools for integrative veterinarians:** SOAP notes from appointment audio and follow-ups written in each vet's voice.

The fixture practitioner, Dana Okafor, is fictional. No real client or patient data is in this repo.

## License

MIT
