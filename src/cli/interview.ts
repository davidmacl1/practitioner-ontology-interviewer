import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadSession, nextInterviewerTurn, saveSession, sessionPath } from "../interview.js";

// Usage: npm run interview -- <session-name>
// Re-running with the same name resumes where the practitioner left off.
const id = process.argv[2] ?? "practitioner";
const path = sessionPath(id);
const session = loadSession(path, id);
const rl = createInterface({ input: stdin, output: stdout });

console.log(`Session "${id}" (${path}). Type /pause to stop and resume later.\n`);

if (session.complete) {
  console.log("This interview is already complete. Run: npm run ontology -- " + id);
  process.exit(0);
}

// Resuming after the interviewer spoke: repeat its question. Otherwise ask for the next one.
const last = session.transcript.at(-1);
let prompt = last?.role === "assistant" ? last.content : await nextInterviewerTurn(session);
saveSession(path, session);

while (!session.complete) {
  const answer = (await rl.question(`\nInterviewer: ${prompt}\n\nYou: `)).trim();
  if (answer === "/pause") break;
  if (!answer) continue;
  session.transcript.push({ role: "user", content: answer });
  prompt = await nextInterviewerTurn(session);
  saveSession(path, session);
}

if (session.complete) {
  console.log(`\nInterviewer: ${prompt}\n\nInterview complete. Next: npm run ontology -- ${id}`);
} else {
  console.log(`\nSaved. Resume any time with: npm run interview -- ${id}`);
}
rl.close();
