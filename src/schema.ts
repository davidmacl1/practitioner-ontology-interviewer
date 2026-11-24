import { z } from "zod";

/** What the extractor writes for anything the interview didn't cover. */
export const NOT_COVERED = "Not covered";

/**
 * The practice ontology: everything an AI tool needs to reason and write
 * like one specific practitioner. Fields the interview didn't cover are
 * left as "Not covered" rather than filled with plausible-sounding guesses.
 */
export const OntologySchema = z.object({
  practitioner: z.object({
    name: z.string(),
    practice: z.string(),
    credentials: z.string(),
    location: z.string(),
    practiceModel: z.string().describe("Solo/group, in-person/remote/hybrid"),
  }),
  identity: z.object({
    description: z.string().describe("How the practitioner describes the practice to a new client"),
    distinctive: z.string().describe("What makes them different from others in their field"),
  }),
  population: z.object({
    serves: z.array(z.string()),
    doesNotServe: z.array(z.string()),
    referralTriggers: z.array(z.string()).describe("Situations that trigger a referral out"),
  }),
  modalities: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      whenUsed: z.string(),
    }),
  ),
  clientJourney: z.object({
    trigger: z.string(),
    intake: z.string(),
    firstSession: z.string(),
    cadence: z.string(),
    progressTracking: z.string(),
  }),
  assessment: z.object({
    lookingFor: z.string().describe("What they look for beyond the standard checklist"),
    weighting: z.string().describe("How they weigh different kinds of information"),
  }),
  decisionLogic: z.object({
    interveneVsWait: z.string(),
    sequencing: z.string().describe("What gets addressed first when several issues are present"),
    overrides: z.string().describe("What makes them abandon their usual approach"),
  }),
  philosophy: z.object({
    problemsDevelop: z.string(),
    improvementHappens: z.string(),
    divergesFromConventional: z.string(),
    success: z.string(),
  }),
  voice: z.object({
    tone: z.string(),
    alwaysInclude: z.array(z.string()),
    neverSay: z.array(z.string()),
    signaturePhrases: z
      .array(z.string())
      .describe("Short, memorable lines in which the practitioner states a belief or rule, copied verbatim"),
  }),
  guardrails: z
    .array(z.string())
    .describe("Every 'never' or 'always ask me first' constraint the practitioner stated"),
  openItems: z
    .array(z.string())
    .describe("Every follow-up, promised material, or unresolved question from the interview"),
  interviewNotes: z.string().describe("Tensions, surprises, or strong opinions worth knowing during the build"),
});

export type Ontology = z.infer<typeof OntologySchema>;
