import OpenAI from "openai";
import type { Response, Tool } from "openai/resources/responses/responses";
import { assertCompleteHtml, type GameConversationMessage } from "./agents";

export type GenerateGameWithOpenAISkillInput = {
  prompt: string;
  intent?: unknown;
  plan?: unknown;
  conversationContext?: GameConversationMessage[];
  previousHtml?: string;
  mode?: "create" | "edit";
  requestId?: string;
};

export type GenerateGameWithOpenAISkillResult = {
  html: string;
  analysis?: string;
  rawText: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_SKILL_VERSION = "1";
const DEFAULT_SKILL_MODEL = "gpt-5.5";

function normalizeExtractedHtml(html: string) {
  return html
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function extractHtmlFromSkillResponse(rawText: string): string {
  const fencedMatch = rawText.match(/```html\s*\n([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const html = normalizeExtractedHtml(fencedMatch[1]);
    if (/<\/html\s*>/i.test(html)) {
      return html;
    }
  }

  const startMatch = /<!doctype\s+html\b|<html\b/i.exec(rawText);
  if (!startMatch) {
    throw new Error("OpenAI skill response did not include a complete HTML document.");
  }

  const endMatches = [...rawText.matchAll(/<\/html\s*>/gi)];
  const finalEnd = endMatches.at(-1);
  if (!finalEnd?.index || finalEnd.index < startMatch.index) {
    throw new Error("OpenAI skill response did not include a closing </html> tag.");
  }

  return normalizeExtractedHtml(
    rawText.slice(startMatch.index, finalEnd.index + finalEnd[0].length),
  );
}

function buildSkillPrompt({
  prompt,
  intent,
  plan,
  conversationContext,
  previousHtml,
  mode,
  requestId,
}: GenerateGameWithOpenAISkillInput) {
  const generationMode = mode ?? (previousHtml ? "edit" : "create");

  return [
    "Use the `html-minigame` skill attached to the shell container.",
    `Task mode: ${generationMode}.`,
    requestId ? `Request id: ${requestId}.` : "",
    "",
    "Create or edit the game according to the user request.",
    conversationContext?.length
      ? [
          "Recent conversation context, oldest to newest. Use it only to resolve references and preserve continuity; the current user request below is the active request.",
          ...conversationContext.map((message) => {
            const role = message.role === "assistant" ? "Assistant" : "User";
            return `${role}: ${message.content}`;
          }),
        ].join("\n")
      : "",
    "In the shell container, write both of these files:",
    "- `/mnt/data/game_analysis.md`",
    "- `/mnt/data/game.html`",
    "",
    "The final assistant response must contain:",
    "- a short summary",
    "- the full standalone HTML inside one fenced code block marked exactly as `html`",
    "",
    "The fenced HTML block must start with `<!doctype html>` and end with `</html>`.",
    "The HTML must be a complete single-file browser game.",
    "It must include embedded CSS and JS.",
    "It must not reference remote assets, CDN scripts, external images, external fonts, or network calls.",
    "It must be playable by opening the file directly.",
    "It must include keyboard and/or pointer controls as appropriate.",
    "It must include basic restart/reset behavior.",
    "It must avoid dangerous APIs.",
    "For edits, preserve the existing game unless the user explicitly asks to replace it.",
    "",
    "User request:",
    prompt,
    "",
    intent ? `Intent classification context:\n${JSON.stringify(intent, null, 2)}` : "",
    plan ? `Planning context:\n${JSON.stringify(plan, null, 2)}` : "",
    previousHtml
      ? [
          "Existing game HTML to edit:",
          "```html",
          previousHtml,
          "```",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function collectOutputText(response: Response) {
  const directText = typeof response.output_text === "string" ? response.output_text : "";
  if (directText.trim()) return directText.trim();

  const outputText = response.output
    .flatMap((item) =>
      item.type === "message"
        ? item.content
            .filter((content) => content.type === "output_text")
            .map((content) => content.text)
        : [],
    )
    .join("\n");

  return outputText.trim();
}

function collectShellFailures(response: Response) {
  return response.output.flatMap((item) => {
    if (item.type === "shell_call" && item.status === "incomplete") {
      return ["shell_call incomplete"];
    }
    if (item.type !== "shell_call_output") {
      return [];
    }
    const incomplete =
      "status" in item && item.status === "incomplete" ? ["shell_call_output incomplete"] : [];
    const failedOutputs = item.output.flatMap((output) => {
      if (output.outcome.type === "timeout") return ["shell command timed out"];
      if (output.outcome.exit_code !== 0) {
        return [`shell command exited with ${output.outcome.exit_code}`];
      }
      return [];
    });
    return [...incomplete, ...failedOutputs];
  });
}

function buildMetadata(response: Response, skillId: string, skillVersion: string) {
  return {
    responseId: response.id,
    model: response.model,
    status: response.status,
    skillId,
    skillVersion,
  };
}

export async function generateGameWithOpenAISkill(
  input: GenerateGameWithOpenAISkillInput,
): Promise<GenerateGameWithOpenAISkillResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const skillId = process.env.OPENAI_HTML_MINIGAME_SKILL_ID;
  if (!skillId) {
    throw new Error("Missing OPENAI_HTML_MINIGAME_SKILL_ID environment variable.");
  }

  const skillVersion =
    process.env.OPENAI_HTML_MINIGAME_SKILL_VERSION ?? DEFAULT_SKILL_VERSION;
  const model = process.env.OPENAI_GAME_MODEL ?? DEFAULT_SKILL_MODEL;
  const client = new OpenAI({ apiKey });
  const tools: Tool[] = [
    {
      type: "shell",
      environment: {
        type: "container_auto",
        skills: [
          {
            type: "skill_reference",
            skill_id: skillId,
            version: skillVersion,
          },
        ],
      },
    },
  ];

  const response = await client.responses.create({
    model,
    tools,
    tool_choice: "auto",
    input: [
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildSkillPrompt(input),
          },
        ],
      },
    ],
  });

  if (response.status === "failed") {
    throw new Error(response.error?.message || "OpenAI Responses API generation failed.");
  }

  const shellFailures = collectShellFailures(response);
  if (shellFailures.length > 0) {
    throw new Error(`OpenAI shell tool failed during game generation: ${shellFailures.join(", ")}.`);
  }

  const rawText = collectOutputText(response);
  if (!rawText) {
    throw new Error("OpenAI skill response did not include assistant output text.");
  }

  const html = extractHtmlFromSkillResponse(rawText);
  assertCompleteHtml(html);

  return {
    html,
    rawText,
    metadata: buildMetadata(response, skillId, skillVersion),
  };
}
