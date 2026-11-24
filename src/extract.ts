import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClient, MODEL, type Turn } from "./claude.js";
import { isPractitionerSpeech } from "./interview.js";
import { NOT_COVERED, OntologySchema, type Ontology } from "./schema.js";

const EXTRACTION_PROMPT = `You turn a practitioner onboarding interview into a structured practice ontology.

Rules:
- Use only what the practitioner said in the transcript. If a field wasn't covered, write "${NOT_COVERED}". Never fill gaps with plausible guesses.
- Signature phrases: copy every short, memorable line in which the practitioner states a belief or rule, word for word. Practitioners often say their most characteristic lines in passing while explaining something else, without flagging them as quotes; include those too. Don't paraphrase or tidy them up.
- Guardrails: record every "never", "don't", and "ask me first" constraint, one per entry.
- Open items: record every promised material, pending decision, or unanswered question, one per entry. Losing these is the most common failure, so be thorough.
- Keep the practitioner's own wording wherever the meaning depends on it.`;

function formatTranscript(transcript: Turn[]): string {
  return transcript
    .filter((turn) => turn.role === "assistant" || isPractitionerSpeech(turn))
    .map((turn) => `${turn.role === "assistant" ? "INTERVIEWER" : "PRACTITIONER"}: ${turn.content}`)
    .join("\n\n");
}

/**
 * Extraction is a separate call from the interview on purpose: the interviewer
 * optimizes for a good conversation, the extractor for faithful structure.
 * Structured outputs constrain the response to the ontology schema.
 */
export async function extractOntology(transcript: Turn[]): Promise<Ontology> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: EXTRACTION_PROMPT,
    output_config: { format: zodOutputFormat(OntologySchema) },
    messages: [{ role: "user", content: `Transcript:\n\n${formatTranscript(transcript)}` }],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to extract this transcript.");
  if (!response.parsed_output) throw new Error(`No valid ontology returned (stop reason: ${response.stop_reason}).`);
  return response.parsed_output;
}
