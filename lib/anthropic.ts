import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";

export const MODELO_CLAUDE = "claude-sonnet-4-6";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY"),
  });
}
