import type { GenerateContentConfig } from "@google/genai";

/**
 * Names of the function declarations in a Gemini request config.
 * The SDK types `tools` as a union that also allows callable tools, which have
 * no `functionDeclarations`, so the access is narrowed here once.
 */
export function declaredToolNames(config: GenerateContentConfig): string[] {
  const [group] = (config.tools ?? []) as { functionDeclarations?: { name?: string }[] }[];
  return (group?.functionDeclarations ?? []).map((declaration) => declaration.name ?? "");
}
