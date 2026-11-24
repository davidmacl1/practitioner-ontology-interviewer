import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | undefined;

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
  }
  client ??= new Anthropic();
  return client;
}

export type Turn = { role: "user" | "assistant"; content: string };

export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}
