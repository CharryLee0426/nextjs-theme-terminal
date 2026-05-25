import { fal } from "@fal-ai/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type GameGenerateRequest = {
  prompt?: string;
  previousHtml?: string;
};

type OpenAiGameResponse = {
  gameName: string;
  fileName: string;
  html: string;
  designDocument: {
    genre: string;
    targetDevice: string;
    controls: string;
    gameplayLoop: string;
    entities: string;
    scoring: string;
    winLossStates: string;
    screens: string;
    visualStyle: string;
    soundPolicy: string;
    verificationCriteria: string;
  };
  visibleProcess: string[];
  verificationConclusion: "PASS" | "FAIL";
  verificationReasons: string[];
};

const SKILL_PATH = path.join(
  process.cwd(),
  "src/lib/gameCreator/webjs-game-creator-skill.md",
);
const SKILL_DISPLAY_PATH = "src/lib/gameCreator/webjs-game-creator-skill.md";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_GAME_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const INTRO_IMAGE_MODEL = "fal-ai/flux/schnell";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ai-game";
}

function normalizeFileName(fileName: string, gameName: string) {
  const cleaned = fileName.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  if (cleaned.endsWith(".html") && cleaned.length > ".html".length) return cleaned;
  return `${slugify(gameName)}.html`;
}

function createFallbackIntroImage(prompt: string, gameName: string) {
  const encoded = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#1d1e20"/>
      <stop offset="55%" stop-color="#2a2d2a"/>
      <stop offset="100%" stop-color="#ffa86a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <g fill="none" stroke="#00ff41" stroke-width="5" opacity=".55">
    <rect x="92" y="88" width="1016" height="624" rx="28"/>
    <path d="M170 606 C310 450 430 522 555 360 C700 170 855 245 1020 135"/>
  </g>
  <circle cx="874" cy="246" r="96" fill="#66d9ef" opacity=".85"/>
  <circle cx="338" cy="450" r="74" fill="#ffa86a" opacity=".9"/>
  <text x="110" y="160" fill="#ffffff" font-family="monospace" font-size="54" font-weight="700">${escapeHtml(gameName)}</text>
  <text x="110" y="224" fill="#c9c9c9" font-family="monospace" font-size="26">${escapeHtml(prompt.slice(0, 76))}</text>
</svg>`);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function extractOutputText(data: unknown) {
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const output = record.output;
  if (!Array.isArray(output)) return null;

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      const text = (contentItem as Record<string, unknown>).text;
      if (typeof text === "string") parts.push(text);
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function validateOpenAiGameResponse(value: unknown): OpenAiGameResponse {
  if (!value || typeof value !== "object") {
    throw new Error("OpenAI response was not a JSON object.");
  }

  const data = value as Partial<OpenAiGameResponse>;
  if (!data.gameName || !data.fileName || !data.html || !data.designDocument) {
    throw new Error("OpenAI response is missing required game fields.");
  }
  if (!data.html.includes("<!doctype html") && !data.html.includes("<html")) {
    throw new Error("OpenAI response did not include a complete HTML document.");
  }
  if (!data.html.includes("<style") || !data.html.includes("<script")) {
    throw new Error("Generated game must include embedded CSS and JavaScript.");
  }

  return {
    gameName: data.gameName,
    fileName: normalizeFileName(data.fileName, data.gameName),
    html: data.html,
    designDocument: data.designDocument,
    visibleProcess: Array.isArray(data.visibleProcess) ? data.visibleProcess : [],
    verificationConclusion: data.verificationConclusion === "FAIL" ? "FAIL" : "PASS",
    verificationReasons: Array.isArray(data.verificationReasons) ? data.verificationReasons : [],
  };
}

async function generateGameWithOpenAi(prompt: string, skill: string, previousHtml?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are the AI Game Creator backend.",
                "Use the provided webjs-game-creator skill as binding workflow instructions.",
                "Generate a complete, self-contained browser mini game as pure HTML, CSS, and JavaScript.",
                "Do not use external scripts, stylesheets, images, fonts, or package managers.",
                "The generated page must fit entirely inside its viewport. Use responsive sizing such as width:100vw, height:100vh, max-width/max-height, CSS grid/flex, and canvas resizing. Avoid fixed layouts that clip vertically or horizontally in an iframe preview.",
                "If the game uses canvas, size the canvas from its container and keep all UI controls visible without page scrolling at 1365x768, 1024x768, and 390x844 viewports.",
                "Return only JSON that matches the schema.",
                "Do not include hidden chain-of-thought. Put only concise user-visible process steps in visibleProcess.",
                "",
                "Skill file:",
                skill,
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                previousHtml
                  ? "Edit the existing game HTML using this new user prompt."
                  : "Create a new game using this user prompt.",
                `User prompt: ${prompt}`,
                previousHtml ? `Previous HTML:\n${previousHtml}` : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
      max_output_tokens: 24000,
      text: {
        format: {
          type: "json_schema",
          name: "webjs_game_generation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "gameName",
              "fileName",
              "html",
              "designDocument",
              "visibleProcess",
              "verificationConclusion",
              "verificationReasons",
            ],
            properties: {
              gameName: { type: "string" },
              fileName: { type: "string" },
              html: { type: "string" },
              designDocument: {
                type: "object",
                additionalProperties: false,
                required: [
                  "genre",
                  "targetDevice",
                  "controls",
                  "gameplayLoop",
                  "entities",
                  "scoring",
                  "winLossStates",
                  "screens",
                  "visualStyle",
                  "soundPolicy",
                  "verificationCriteria",
                ],
                properties: {
                  genre: { type: "string" },
                  targetDevice: { type: "string" },
                  controls: { type: "string" },
                  gameplayLoop: { type: "string" },
                  entities: { type: "string" },
                  scoring: { type: "string" },
                  winLossStates: { type: "string" },
                  screens: { type: "string" },
                  visualStyle: { type: "string" },
                  soundPolicy: { type: "string" },
                  verificationCriteria: { type: "string" },
                },
              },
              visibleProcess: {
                type: "array",
                items: { type: "string" },
              },
              verificationConclusion: {
                type: "string",
                enum: ["PASS", "FAIL"],
              },
              verificationReasons: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "OpenAI game generation failed.";
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI did not return text output.");
  }

  return validateOpenAiGameResponse(JSON.parse(outputText));
}

function extractImageUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const images = record.images;
  if (Array.isArray(images)) {
    const firstImage = images[0] as Record<string, unknown> | undefined;
    if (typeof firstImage?.url === "string") return firstImage.url;
  }
  const image = record.image as Record<string, unknown> | undefined;
  if (typeof image?.url === "string") return image.url;
  if (typeof record.url === "string") return record.url;
  return null;
}

async function generateIntroImage(prompt: string, gameName: string) {
  const credentials = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!credentials) {
    return {
      imageUrl: createFallbackIntroImage(prompt, gameName),
      source: "fallback",
      note: "Missing FAL_KEY or FAL_API_KEY. Used generated SVG fallback.",
    };
  }

  fal.config({ credentials });
  const result = await fal.subscribe(INTRO_IMAGE_MODEL, {
    input: {
      prompt: `H5 browser mini game cover art for "${gameName}". ${prompt}. Clean arcade key art, readable central character, visible gameplay objects, polished digital illustration, no text, no logo.`,
      image_size: "landscape_4_3",
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: true,
  });

  const imageUrl = extractImageUrl(result.data);
  if (!imageUrl) {
    throw new Error("fal.ai completed without returning an intro image.");
  }

  return { imageUrl, source: "fal.ai", note: null };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GameGenerateRequest;
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return jsonError("Prompt is required.", 400);
    }

    const skill = await readFile(SKILL_PATH, "utf8");
    if (!skill.includes("Conclusion: PASS") || !skill.includes("pure HTML, CSS, and JavaScript")) {
      return jsonError("webjs-game-creator skill is not available or is malformed.", 500);
    }

    const draft = await generateGameWithOpenAi(prompt, skill, body.previousHtml);
    const intro = await generateIntroImage(prompt, draft.gameName);

    return NextResponse.json({
      ...draft,
      imageUrl: intro.imageUrl,
      imageSource: intro.source,
      imageNote: intro.note,
      skillPath: SKILL_DISPLAY_PATH,
      openAiModel: OPENAI_MODEL,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Game generation failed." },
      { status: 500 },
    );
  }
}
