import { Agent, run, setDefaultOpenAIKey, setOpenAIAPI, webSearchTool } from "@openai/agents";
import { z } from "zod";

export type GeneratedGameArtifacts = {
  gameName: string;
  slug: string;
  fileName: string;
  analysisFileName: string;
  analysisMarkdown: string;
  html: string;
  visibleProcess: string[];
  verificationConclusion: "PASS" | "FAIL";
  verificationReasons: string[];
};

export type GameRequestIntent =
  | "GREETING"
  | "UNRELATED_HARMLESS"
  | "UNRELATED_HARMFUL"
  | "RELATED_WITHIN_CAPABILITY"
  | "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE"
  | "RELATED_OUT_OF_CAPABILITY_NOT_POSSIBLE";

export type GameRequestClassification = {
  intent: GameRequestIntent;
  response: string;
  visibleProcess: string[];
};

export type HarmlessQuestionAnswer = {
  response: string;
  visibleProcess: string[];
};

type AgentWorkflowLogger = (event: string, details?: Record<string, unknown>) => void;

const intentClassificationSchema = z.object({
  intent: z.enum([
    "GREETING",
    "UNRELATED_HARMLESS",
    "UNRELATED_HARMFUL",
    "RELATED_WITHIN_CAPABILITY",
    "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE",
    "RELATED_OUT_OF_CAPABILITY_NOT_POSSIBLE",
  ]),
  response: z.string().default(""),
  visibleProcess: z.array(z.string()).default([]),
});

const harmlessAnswerSchema = z.object({
  response: z.string().min(1),
  visibleProcess: z.array(z.string()).default([]),
});

const planningSchema = z.object({
  gameName: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  analysisMarkdown: z.string().min(500),
  visibleProcess: z.array(z.string()).default([]),
});

const htmlSchema = z.object({
  html: z.string().min(2000),
  visibleProcess: z.array(z.string()).default([]),
});

const verificationSchema = z.object({
  verificationConclusion: z.enum(["PASS", "FAIL"]),
  verificationReasons: z.array(z.string()).default([]),
  visibleProcess: z.array(z.string()).default([]),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ai-game"
  );
}

function normalizeSlug(slug: string, gameName: string) {
  const normalized = slugify(slug);
  return normalized === "ai-game" ? slugify(gameName) : normalized;
}

function assertCompleteHtml(html: string) {
  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype html") || !lower.includes("<html")) {
    throw new Error("Generated game did not include a complete HTML document.");
  }
  if (!lower.includes("<style") || !lower.includes("<script")) {
    throw new Error("Generated game must include embedded CSS and JavaScript.");
  }
  if (
    /<script[^>]+src=/i.test(html) ||
    /<link[^>]+href=/i.test(html) ||
    /url\(\s*["']?https?:/i.test(html) ||
    /\b(fetch|importScripts)\s*\(\s*["']https?:/i.test(html) ||
    /\bimport\s*\(\s*["']https?:/i.test(html)
  ) {
    throw new Error("Generated game contains an external dependency.");
  }
}

function buildProcess(...groups: string[][]) {
  return groups
    .flat()
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifyGreetingLocally(prompt: string): GameRequestClassification | null {
  const normalized = prompt.trim().toLowerCase().replace(/[!.?\s]+$/g, "");
  if (!/^(hi|hello|hey|yo|what can you do|what do you do)$/.test(normalized)) {
    return null;
  }

  return {
    intent: "GREETING",
    response:
      "Hi! I can help you create browser-based HTML/CSS/JavaScript minigames. Tell me what kind of game you want to build, such as a puzzle game, clicker game, platformer, shooter, or quiz game.",
    visibleProcess: ["Classified the message as a greeting."],
  };
}

function logVisibleProcess(
  logger: AgentWorkflowLogger | undefined,
  stage: string,
  visibleProcess: string[],
) {
  if (!logger || visibleProcess.length === 0) return;
  visibleProcess.forEach((step, index) => {
    logger(`${stage}:visibleProcess`, { index: index + 1, step });
  });
}

export async function classifyGameRequest({
  apiKey,
  model,
  prompt,
  previousHtml,
  logger,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  previousHtml?: string;
  logger?: AgentWorkflowLogger;
}): Promise<GameRequestClassification> {
  const localGreeting = classifyGreetingLocally(prompt);
  if (localGreeting) {
    logger?.("intent:complete", {
      intent: localGreeting.intent,
      source: "local",
    });
    logVisibleProcess(logger, "intent", localGreeting.visibleProcess);
    return localGreeting;
  }

  setDefaultOpenAIKey(apiKey);
  setOpenAIAPI("responses");

  const classifier = new Agent({
    name: "HTML Minigame Intent Classifier",
    model,
    modelSettings: {
      maxTokens: 2500,
      text: { verbosity: "low" as const },
      reasoning: { effort: "low" as const },
    },
    outputType: intentClassificationSchema,
    instructions: [
      "Classify a user message before deciding whether to create or edit an HTML/CSS/JavaScript browser minigame.",
      "The product's core purpose is helping users create, modify, and refine safe HTML/WebJS minigames.",
      "Choose exactly one intent:",
      "- GREETING: greetings, casual openings, or asking what the agent can do.",
      "- UNRELATED_HARMLESS: harmless non-game questions or casual conversation.",
      "- UNRELATED_HARMFUL: unsafe or disallowed non-game requests, including sexual content, graphic violence, instructions for harm, abuse, exploitation, illegal activity, political persuasion/campaigning/manipulation, hate, harassment, extremist content, or other unsafe topics.",
      "- RELATED_WITHIN_CAPABILITY: clearly asks to create, modify, or refine a feasible self-contained HTML/CSS/JavaScript browser minigame.",
      "- RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE: game-related but too advanced for a simple HTML/WebJS minigame, yet can be simplified into a feasible 2D/single-file/browser version.",
      "- RELATED_OUT_OF_CAPABILITY_NOT_POSSIBLE: game-related but cannot reasonably be simplified into this product's scope.",
      "",
      "Only RELATED_WITHIN_CAPABILITY should trigger game generation. For that intent, keep response empty.",
      "For GREETING, reply politely, briefly explain the agent can create HTML/CSS/JavaScript minigames, and ask for a game idea.",
      "For UNRELATED_HARMLESS, classify only. Keep response empty unless the user only needs a very simple static answer. A separate answer agent can use web search for current facts.",
      "For UNRELATED_HARMFUL, refuse briefly and redirect to safe minigame creation. Do not provide harmful details.",
      "For RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE, ask the user to simplify or approve a feasible smaller HTML/WebJS version and suggest concrete features.",
      "For RELATED_OUT_OF_CAPABILITY_NOT_POSSIBLE, acknowledge the limitation and ask for another browser-based minigame idea.",
      "Be concise. Do not reveal hidden chain-of-thought. visibleProcess must contain only short user-visible summary steps.",
    ].join("\n"),
  });

  logger?.("intent:start", { agent: classifier.name });
  const startedAt = Date.now();
  const result = await run(
    classifier,
    [
      previousHtml
        ? "There is an existing generated HTML game. Classify whether the message is a feasible edit request."
        : "There is no current generated game. Classify whether the message is a feasible game creation request.",
      `User message: ${prompt}`,
      previousHtml ? `Existing HTML length: ${previousHtml.length}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    { maxTurns: 2 },
  );

  if (!result.finalOutput) {
    throw new Error("Intent classifier did not return a classification.");
  }

  const classification = result.finalOutput;
  logger?.("intent:complete", {
    elapsedMs: Date.now() - startedAt,
    intent: classification.intent,
  });
  logVisibleProcess(logger, "intent", classification.visibleProcess);

  return {
    intent: classification.intent,
    response: classification.response,
    visibleProcess: classification.visibleProcess,
  };
}

export async function answerUnrelatedHarmlessQuestion({
  apiKey,
  model,
  prompt,
  logger,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  logger?: AgentWorkflowLogger;
}): Promise<HarmlessQuestionAnswer> {
  setDefaultOpenAIKey(apiKey);
  setOpenAIAPI("responses");

  const answerer = new Agent({
    name: "HTML Minigame Harmless Question Answerer",
    model,
    modelSettings: {
      maxTokens: 5000,
      text: { verbosity: "low" as const },
      reasoning: { effort: "low" as const },
    },
    tools: [
      webSearchTool({
        searchContextSize: "medium",
        externalWebAccess: true,
      }),
    ],
    outputType: harmlessAnswerSchema,
    instructions: [
      "Answer harmless non-game user questions briefly, then guide the user back to HTML/CSS/JavaScript minigame creation.",
      "Use web search for current, time-sensitive, or niche facts such as schedules, scores, weather, travel, prices, laws, releases, or anything likely to have changed.",
      "If you use web search, include concise source links in the response when available.",
      "If the question cannot be answered reliably, say so briefly and guide back to minigame creation.",
      "Do not create game code. Do not answer unsafe, sexual, graphic, illegal, hateful, extremist, harassment, or political persuasion requests.",
      "End with a natural redirect such as asking whether the user wants to turn the topic into a small web game.",
      "Do not reveal hidden chain-of-thought. visibleProcess must contain short user-visible steps only.",
    ].join("\n"),
  });

  logger?.("answer:start", { agent: answerer.name });
  const startedAt = Date.now();
  const result = await run(
    answerer,
    [
      `User question: ${prompt}`,
      "Answer as the HTML/WebJS minigame assistant. Keep it concise and redirect back to minigame creation.",
    ].join("\n\n"),
    { maxTurns: 4 },
  );

  if (!result.finalOutput) {
    throw new Error("Harmless question answerer did not return a response.");
  }

  logger?.("answer:complete", {
    elapsedMs: Date.now() - startedAt,
    responseLength: result.finalOutput.response.length,
  });
  logVisibleProcess(logger, "answer", result.finalOutput.visibleProcess);

  return {
    response: result.finalOutput.response,
    visibleProcess: result.finalOutput.visibleProcess,
  };
}

export async function generateGameWithAgents({
  apiKey,
  model,
  prompt,
  skill,
  analysisTemplate,
  previousHtml,
  logger,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  skill: string;
  analysisTemplate: string;
  previousHtml?: string;
  logger?: AgentWorkflowLogger;
}): Promise<GeneratedGameArtifacts> {
  setDefaultOpenAIKey(apiKey);
  setOpenAIAPI("responses");
  logger?.("workflow:start", {
    model,
    mode: previousHtml ? "edit" : "create",
    promptLength: prompt.length,
    previousHtmlLength: previousHtml?.length ?? 0,
  });

  const commonModelSettings = {
    maxTokens: 24000,
    text: { verbosity: "medium" as const },
    reasoning: { effort: "low" as const },
  };

  const planner = new Agent({
    name: "HTML Minigame Planner",
    model,
    modelSettings: commonModelSettings,
    outputType: planningSchema,
    instructions: [
      "You create the first required artifact for the html-minigame skill.",
      "Return a concrete design analysis markdown document only through the structured output.",
      "Choose sensible defaults without asking follow-up questions.",
      "Use the same slug for the analysis and HTML filenames.",
      "Do not reveal hidden chain-of-thought; visibleProcess must contain concise user-visible steps only.",
      "",
      "Skill instructions:",
      skill,
      "",
      "Analysis template:",
      analysisTemplate,
    ].join("\n"),
  });

  logger?.("planner:start", { agent: planner.name });
  const planStartedAt = Date.now();
  const planResult = await run(
    planner,
    [
      previousHtml ? "Revise the existing game based on the new request." : "Create a new game.",
      `User prompt: ${prompt}`,
      previousHtml ? `Existing HTML:\n${previousHtml}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    { maxTurns: 3 },
  );

  if (!planResult.finalOutput) {
    throw new Error("Planner agent did not return a design analysis.");
  }

  const plan = planResult.finalOutput;
  const slug = normalizeSlug(plan.slug, plan.gameName);
  const analysisFileName = `${slug}_analysis.md`;
  const fileName = `${slug}.html`;
  logger?.("planner:complete", {
    elapsedMs: Date.now() - planStartedAt,
    gameName: plan.gameName,
    slug,
    analysisFileName,
    fileName,
    analysisMarkdownChars: plan.analysisMarkdown.length,
  });
  logVisibleProcess(logger, "planner", plan.visibleProcess);

  const builder = new Agent({
    name: "HTML Minigame Builder",
    model,
    modelSettings: commonModelSettings,
    outputType: htmlSchema,
    instructions: [
      "You create the second required artifact for the html-minigame skill.",
      "Build a complete standalone HTML game from the supplied analysis markdown.",
      "Use vanilla HTML, CSS, and JavaScript only.",
      "Do not use external scripts, stylesheets, fonts, images, CDN URLs, package managers, or network requests.",
      "The HTML must fit in an iframe preview and on small phone screens without horizontal scroll.",
      "Use visible start, gameplay, game-over, restart, score, desktop controls, and mobile/touch controls.",
      "Return only the structured output.",
      "",
      "Skill instructions:",
      skill,
    ].join("\n"),
  });

  logger?.("builder:start", { agent: builder.name, fileName });
  const buildStartedAt = Date.now();
  const htmlResult = await run(
    builder,
    [
      `Game name: ${plan.gameName}`,
      `Required slug: ${slug}`,
      `Required HTML filename: ${fileName}`,
      `Required analysis filename: ${analysisFileName}`,
      "Design analysis markdown:",
      plan.analysisMarkdown,
      previousHtml ? `Existing HTML to revise:\n${previousHtml}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    { maxTurns: 3 },
  );

  if (!htmlResult.finalOutput) {
    throw new Error("Builder agent did not return HTML.");
  }

  const htmlArtifact = htmlResult.finalOutput;
  assertCompleteHtml(htmlArtifact.html);
  logger?.("builder:complete", {
    elapsedMs: Date.now() - buildStartedAt,
    fileName,
    htmlChars: htmlArtifact.html.length,
    hasStyle: /<style[\s>]/i.test(htmlArtifact.html),
    hasScript: /<script[\s>]/i.test(htmlArtifact.html),
  });
  logVisibleProcess(logger, "builder", htmlArtifact.visibleProcess);

  const verifier = new Agent({
    name: "HTML Minigame Verifier",
    model,
    modelSettings: {
      maxTokens: 4000,
      text: { verbosity: "low" as const },
      reasoning: { effort: "medium" as const },
    },
    outputType: verificationSchema,
    instructions: [
      "Verify whether the two generated artifacts satisfy the html-minigame skill contract.",
      "Return PASS only if the analysis markdown and HTML filenames use the same slug, the HTML is standalone, and the checklist is satisfied by inspection.",
      "Return concise reasons. Do not include hidden chain-of-thought.",
      "",
      "Skill instructions:",
      skill,
    ].join("\n"),
  });

  logger?.("verifier:start", { agent: verifier.name });
  const verifyStartedAt = Date.now();
  const verificationResult = await run(
    verifier,
    [
      `Expected analysis filename: ${analysisFileName}`,
      `Expected HTML filename: ${fileName}`,
      "Analysis markdown:",
      plan.analysisMarkdown,
      "HTML:",
      htmlArtifact.html,
    ].join("\n\n"),
    { maxTurns: 2 },
  );

  if (!verificationResult.finalOutput) {
    throw new Error("Verifier agent did not return a verification report.");
  }

  const verification = verificationResult.finalOutput;
  logger?.("verifier:complete", {
    elapsedMs: Date.now() - verifyStartedAt,
    verificationConclusion: verification.verificationConclusion,
    verificationReasons: verification.verificationReasons,
  });
  logVisibleProcess(logger, "verifier", verification.visibleProcess);

  logger?.("workflow:complete", {
    gameName: plan.gameName,
    slug,
    files: [analysisFileName, fileName],
    verificationConclusion: verification.verificationConclusion,
  });

  return {
    gameName: plan.gameName,
    slug,
    fileName,
    analysisFileName,
    analysisMarkdown: plan.analysisMarkdown,
    html: htmlArtifact.html,
    visibleProcess: buildProcess(
      plan.visibleProcess,
      htmlArtifact.visibleProcess,
      verification.visibleProcess,
    ),
    verificationConclusion: verification.verificationConclusion,
    verificationReasons: verification.verificationReasons,
  };
}
