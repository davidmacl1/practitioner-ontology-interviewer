import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getClient, MODEL, textOf, type Turn } from "./claude.js";

export const COMPLETE_TOKEN = "[[INTERVIEW_COMPLETE]]";

/** Sent to open the conversation (the API needs a user turn first); not practitioner speech. */
const KICKOFF = "Hi, I'm ready to start.";

/** True for turns that are the practitioner's own words. */
export const isPractitionerSpeech = (turn: Turn) => turn.role === "user" && turn.content !== KICKOFF;

const INTERVIEWER_PROMPT = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "prompts", "interviewer.md"),
  "utf8",
);

/** A resumable interview. The transcript on disk is the agent's memory. */
export type Session = {
  id: string;
  startedAt: string;
  complete: boolean;
  transcript: Turn[];
};

export function loadSession(path: string, id: string): Session {
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as Session;
  return { id, startedAt: new Date().toISOString(), complete: false, transcript: [] };
}

export function saveSession(path: string, session: Session): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(session, null, 2));
}

export const sessionPath = (id: string) => `sessions/${id}.json`;

/**
 * Ask the interviewer for its next turn. The API requires the conversation to
 * start with a user turn, so an empty session gets a short kickoff message.
 */
export async function nextInterviewerTurn(session: Session): Promise<string> {
  if (session.transcript.length === 0) session.transcript.push({ role: "user", content: KICKOFF });

  // The whole transcript is resent every turn; caching keeps long interviews cheap.
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: INTERVIEWER_PROMPT,
    messages: session.transcript,
    cache_control: { type: "ephemeral" },
  });

  const raw = textOf(response);
  if (raw.includes(COMPLETE_TOKEN)) session.complete = true;
  const reply = raw.replaceAll(COMPLETE_TOKEN, "").trim();
  session.transcript.push({ role: "assistant", content: reply });
  return reply;
}
