import { NOT_COVERED, type Ontology } from "./schema.js";

const list = (items: string[], prefix = "- ", empty = `- ${NOT_COVERED}`) =>
  items.length ? items.map((item) => `${prefix}${item}`).join("\n") : empty;

/** Human-readable version of the ontology, for the practitioner to review. */
export function renderMarkdown(o: Ontology): string {
  return `# Practice Ontology: ${o.practitioner.name}

**Practice:** ${o.practitioner.practice} · ${o.practitioner.location}
**Credentials:** ${o.practitioner.credentials}
**Model:** ${o.practitioner.practiceModel}
**Status:** Draft, pending practitioner review

## 1. Identity
${o.identity.description}

**What makes them distinctive:** ${o.identity.distinctive}

## 2. Who they serve
**Serves:**
${list(o.population.serves)}

**Doesn't serve:**
${list(o.population.doesNotServe)}

**Refers out when:**
${list(o.population.referralTriggers)}

## 3. Modalities
${list(o.modalities.map((m) => `**${m.name}:** ${m.purpose} *When:* ${m.whenUsed}`))}

## 4. Client journey
- **What brings them in:** ${o.clientJourney.trigger}
- **Intake:** ${o.clientJourney.intake}
- **First session:** ${o.clientJourney.firstSession}
- **Cadence:** ${o.clientJourney.cadence}
- **Progress tracking:** ${o.clientJourney.progressTracking}

## 5. Assessment
- **Looking for:** ${o.assessment.lookingFor}
- **How information is weighed:** ${o.assessment.weighting}

## 6. Decision logic
- **Intervene vs. wait:** ${o.decisionLogic.interveneVsWait}
- **Sequencing:** ${o.decisionLogic.sequencing}
- **Overrides:** ${o.decisionLogic.overrides}

## 7. Philosophy
- **How problems develop:** ${o.philosophy.problemsDevelop}
- **How improvement happens:** ${o.philosophy.improvementHappens}
- **Where they diverge from convention:** ${o.philosophy.divergesFromConventional}
- **What success means:** ${o.philosophy.success}

## 8. Voice
**Tone:** ${o.voice.tone}

**Always include:**
${list(o.voice.alwaysInclude)}

**Never say:**
${list(o.voice.neverSay)}

**Signature phrases:**
${list(o.voice.signaturePhrases.map((p) => `"${p}"`))}

## 9. Guardrails
${list(o.guardrails)}

## 10. Open items
${list(o.openItems, "- [ ] ", "- None recorded")}

## 11. Interview notes
${o.interviewNotes}
`;
}
