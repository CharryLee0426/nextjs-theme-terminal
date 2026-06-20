import { fal } from "@fal-ai/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateGameWithAgents } from "@/lib/gameCreator/agents";

type GameGenerateRequest = {
  prompt?: string;
  previousHtml?: string;
};

const SKILL_PATH = path.join(
  process.cwd(),
  "src/lib/gameCreator/html-minigame/SKILL.md",
);
const ANALYSIS_TEMPLATE_PATH = path.join(
  process.cwd(),
  "src/lib/gameCreator/html-minigame/reference/analysis-template.md",
);
const SKILL_DISPLAY_PATH = "src/lib/gameCreator/html-minigame/SKILL.md";
const OPENAI_MODEL = process.env.OPENAI_GAME_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const INTRO_IMAGE_MODEL = "fal-ai/flux/schnell";

export const runtime = "nodejs";

function createGenerationLogger() {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  return (event: string, details: Record<string, unknown> = {}) => {
    console.info(
      `[game-agent:${requestId}] ${event}`,
      JSON.stringify({
        elapsedMs: Date.now() - startedAt,
        ...details,
      }),
    );
  };
}

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
  const logAgent = createGenerationLogger();
  try {
    const body = (await request.json()) as GameGenerateRequest;
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return jsonError("Prompt is required.", 400);
    }
    logAgent("request:received", {
      promptLength: prompt.length,
      hasPreviousHtml: Boolean(body.previousHtml),
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logAgent("request:error", { error: "Missing OPENAI_API_KEY environment variable." });
      return jsonError("Missing OPENAI_API_KEY environment variable.", 500);
    }

    logAgent("skill:load:start", {
      skillPath: SKILL_DISPLAY_PATH,
      analysisTemplatePath: "src/lib/gameCreator/html-minigame/reference/analysis-template.md",
    });
    const [skill, analysisTemplate] = await Promise.all([
      readFile(SKILL_PATH, "utf8"),
      readFile(ANALYSIS_TEMPLATE_PATH, "utf8"),
    ]);
    if (!skill.includes("Output contract") || !skill.includes("<slug>_analysis.md")) {
      logAgent("skill:load:error", { error: "Malformed html-minigame skill." });
      return jsonError("html-minigame skill is not available or is malformed.", 500);
    }
    logAgent("skill:load:complete", {
      skillChars: skill.length,
      analysisTemplateChars: analysisTemplate.length,
    });

    const draft = await generateGameWithAgents({
      apiKey,
      model: OPENAI_MODEL,
      prompt,
      skill,
      analysisTemplate,
      previousHtml: body.previousHtml,
      logger: logAgent,
    });
    logAgent("cover:start", {
      gameName: draft.gameName,
      provider: process.env.FAL_KEY || process.env.FAL_API_KEY ? "fal.ai" : "fallback",
    });
    const intro = await generateIntroImage(prompt, draft.gameName);
    logAgent("cover:complete", {
      gameName: draft.gameName,
      source: intro.source,
      note: intro.note,
    });

    logAgent("response:success", {
      gameName: draft.gameName,
      files: [draft.analysisFileName, draft.fileName],
      verificationConclusion: draft.verificationConclusion,
    });
    return NextResponse.json({
      ...draft,
      imageUrl: intro.imageUrl,
      imageSource: intro.source,
      imageNote: intro.note,
      skillPath: SKILL_DISPLAY_PATH,
      openAiModel: OPENAI_MODEL,
    });
  } catch (error) {
    logAgent("request:error", {
      error: error instanceof Error ? error.message : "Game generation failed.",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Game generation failed." },
      { status: 500 },
    );
  }
}
