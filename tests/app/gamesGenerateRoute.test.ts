/**
 * @jest-environment node
 */

import { POST } from "@/app/api/games/generate/route";
import {
  answerUnrelatedHarmlessQuestion,
  classifyGameRequest,
  generateGameWithAgents,
} from "@/lib/gameCreator/agents";
import { generateGameWithOpenAISkill } from "@/lib/gameCreator/skillGeneration";

jest.mock("@/lib/gameCreator/agents", () => ({
  answerUnrelatedHarmlessQuestion: jest.fn(),
  classifyGameRequest: jest.fn(),
  generateGameWithAgents: jest.fn(),
  normalizeSlug: jest.fn((slug: string) => slug),
  slugify: jest.fn((value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ai-game",
  ),
}));

jest.mock("@/lib/gameCreator/skillGeneration", () => ({
  generateGameWithOpenAISkill: jest.fn(),
}));

jest.mock("@fal-ai/client", () => ({
  fal: {
    config: jest.fn(),
    subscribe: jest.fn(),
  },
}));

const mockedGenerateGameWithAgents = generateGameWithAgents as jest.MockedFunction<
  typeof generateGameWithAgents
>;
const mockedClassifyGameRequest = classifyGameRequest as jest.MockedFunction<
  typeof classifyGameRequest
>;
const mockedAnswerUnrelatedHarmlessQuestion =
  answerUnrelatedHarmlessQuestion as jest.MockedFunction<
    typeof answerUnrelatedHarmlessQuestion
  >;
const mockedGenerateGameWithOpenAISkill =
  generateGameWithOpenAISkill as jest.MockedFunction<
    typeof generateGameWithOpenAISkill
  >;
const originalEnv = process.env;
const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

const draft = {
  gameName: "Test Runner",
  slug: "test-runner",
  fileName: "test-runner.html",
  analysisFileName: "test-runner_analysis.md",
  analysisMarkdown: "# Test Runner\n\nDesign notes",
  html: "<!DOCTYPE html><html><head><style></style></head><body><script></script></body></html>",
  visibleProcess: ["Planned controls", "Built canvas loop"],
  verificationConclusion: "PASS" as const,
  verificationReasons: ["Standalone HTML"],
};

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/games/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("games generate API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-openai-key",
      OPENAI_GAME_MODEL: "gpt-5.4-mini",
      OPENAI_GAME_GENERATION_MODE: "",
      OPENAI_HTML_MINIGAME_SKILL_ID: "skill_test",
      OPENAI_HTML_MINIGAME_SKILL_VERSION: "1",
      FAL_KEY: "",
      FAL_API_KEY: "",
    };
    mockedClassifyGameRequest.mockResolvedValue({
      intent: "RELATED_WITHIN_CAPABILITY",
      response: "",
      visibleProcess: ["Classified as a feasible HTML/WebJS minigame request."],
    });
    mockedAnswerUnrelatedHarmlessQuestion.mockResolvedValue({
      response: "I can give a brief answer. Would you like to turn this into a web game?",
      visibleProcess: ["Answered the harmless question."],
    });
    mockedGenerateGameWithAgents.mockImplementation(async (args) => {
      args.logger?.("planner:start", { agent: "HTML Minigame Planner" });
      args.logger?.("planner:complete", {
        gameName: draft.gameName,
        analysisFileName: draft.analysisFileName,
        fileName: draft.fileName,
      });
      args.logger?.("builder:visibleProcess", {
        index: 1,
        step: "Built a responsive canvas game",
      });
      args.logger?.("verifier:complete", {
        verificationConclusion: "PASS",
        verificationReasons: ["Standalone HTML"],
      });
      return draft;
    });
    mockedGenerateGameWithOpenAISkill.mockResolvedValue({
      html: [
        "<!doctype html>",
        "<html>",
        "<head><title>Skill Runner</title><style>body{margin:0}</style></head>",
        "<body><button>Restart</button><script>let score=0;</script></body>",
        "</html>",
      ].join(""),
      rawText: [
        "Built Skill Runner.",
        "```html",
        "<!doctype html><html><head><title>Skill Runner</title><style>body{margin:0}</style></head><body><button>Restart</button><script>let score=0;</script></body></html>",
        "```",
      ].join("\n"),
      metadata: {
        responseId: "resp_skill",
        model: "gpt-5.5",
        skillId: "skill_test",
        skillVersion: "1",
      },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleInfoSpy.mockRestore();
  });

  it("returns the generated draft as JSON for non-stream callers", async () => {
    const response = await POST(makeRequest({ prompt: "make a runner" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      gameName: "Test Runner",
      fileName: "test-runner.html",
      analysisFileName: "test-runner_analysis.md",
      imageSource: "fallback",
      openAiModel: "gpt-4.1-mini",
    });
    expect(mockedGenerateGameWithAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-openai-key",
        model: "gpt-4.1-mini",
        prompt: "make a runner",
        previousHtml: undefined,
        logger: expect.any(Function),
      }),
    );
    expect(mockedGenerateGameWithOpenAISkill).not.toHaveBeenCalled();
  });

  it("passes previous HTML and game metadata through edit requests", async () => {
    const previousGame = {
      gameName: "Original Runner",
      slug: "original-runner",
      fileName: "original-runner.html",
      analysisFileName: "original-runner_analysis.md",
      analysisMarkdown: "# Original Runner\n\nExisting design",
    };

    const response = await POST(
      makeRequest({
        prompt: "make the background space themed",
        previousHtml: "<!DOCTYPE html><html><body>old game</body></html>",
        previousGame,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedClassifyGameRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "make the background space themed",
        previousHtml: "<!DOCTYPE html><html><body>old game</body></html>",
      }),
    );
    expect(mockedGenerateGameWithAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "make the background space themed",
        previousHtml: "<!DOCTYPE html><html><body>old game</body></html>",
        previousGame,
      }),
    );
  });

  it("passes a bounded recent conversation context to the agents", async () => {
    const longText = "x".repeat(1200);
    const conversationContext = [
      { role: "user", content: "oldest message should be dropped" },
      { role: "assistant", content: "old assistant message should be dropped" },
      { role: "user", content: "make a paddle game" },
      { role: "assistant", content: "Generated Paddle Pop." },
      { role: "user", content: "add enemies" },
      { role: "assistant", content: "Generated Paddle Pop with enemies." },
      { role: "user", content: "make it faster" },
      { role: "assistant", content: "Generated a faster version." },
      { role: "user", content: longText },
      { role: "assistant", content: "Generated a very fast version." },
    ];

    const response = await POST(
      makeRequest({
        prompt: "make that last version neon",
        conversationContext,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedClassifyGameRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "make that last version neon",
        conversationContext: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "make a paddle game" }),
          expect.objectContaining({
            role: "assistant",
            content: "Generated a very fast version.",
          }),
        ]),
      }),
    );
    const classifyArgs = mockedClassifyGameRequest.mock.calls[0][0];
    expect(classifyArgs.conversationContext).toHaveLength(8);
    expect(classifyArgs.conversationContext?.[0].content).toBe("make a paddle game");
    expect(classifyArgs.conversationContext?.some((message) =>
      message.content.includes("oldest message should be dropped"),
    )).toBe(false);
    expect(classifyArgs.conversationContext?.some((message) =>
      message.content.includes("[truncated]"),
    )).toBe(true);
    expect(mockedGenerateGameWithAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationContext: classifyArgs.conversationContext,
      }),
    );
  });

  it("returns downgrade guidance for infeasible edit prompts without running the edit pipeline", async () => {
    const previousGame = {
      gameName: "Original Runner",
      slug: "original-runner",
      fileName: "original-runner.html",
      analysisFileName: "original-runner_analysis.md",
      analysisMarkdown: "# Original Runner\n\nExisting design",
    };
    mockedClassifyGameRequest.mockResolvedValueOnce({
      intent: "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE",
      response:
        "That full edit is not possible in a single-file HTML/WebJS minigame. We can downgrade it to local two-player controls, a saved high score, or simulated rival racers.",
      visibleProcess: ["Classified the edit as too complex for the current minigame scope."],
    });

    const response = await POST(
      makeRequest({
        prompt: "add realtime multiplayer accounts with a global ranked leaderboard",
        previousHtml: "<!DOCTYPE html><html><body>old game</body></html>",
        previousGame,
        stream: true,
      }),
    );
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(mockedClassifyGameRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "add realtime multiplayer accounts with a global ranked leaderboard",
        previousHtml: "<!DOCTYPE html><html><body>old game</body></html>",
      }),
    );
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
    expect(lines).toContainEqual(
      expect.objectContaining({
        type: "reply",
        reply: expect.objectContaining({
          generated: false,
          intent: "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE",
          message:
            "That full edit is not possible in a single-file HTML/WebJS minigame. We can downgrade it to local two-player controls, a saved high score, or simulated rival racers.",
          visibleProcess: [
            "Classified the edit as too complex for the current minigame scope.",
          ],
        }),
      }),
    );
  });

  it("streams progress events and a final draft as NDJSON", async () => {
    const response = await POST(makeRequest({ prompt: "make a runner", stream: true }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "progress",
          event: "planner:start",
          details: expect.objectContaining({ agent: "HTML Minigame Planner" }),
        }),
        expect.objectContaining({
          type: "progress",
          event: "builder:visibleProcess",
          details: expect.objectContaining({ step: "Built a responsive canvas game" }),
        }),
        expect.objectContaining({
          type: "complete",
          draft: expect.objectContaining({
            gameName: "Test Runner",
            imageSource: "fallback",
            skillPath: "src/lib/gameCreator/html-minigame/SKILL.md",
          }),
        }),
      ]),
    );
  });

  it("returns assistant replies without calling game generation for greetings", async () => {
    mockedClassifyGameRequest.mockResolvedValueOnce({
      intent: "GREETING",
      response: "Hi! I can help you create HTML/CSS/JavaScript minigames.",
      visibleProcess: ["Classified the message as a greeting."],
    });

    const response = await POST(makeRequest({ prompt: "Hi" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generated: false,
      intent: "GREETING",
      message: "Hi! I can help you create HTML/CSS/JavaScript minigames.",
      openAiModel: "gpt-4.1-mini",
    });
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
  });

  it("streams assistant replies without a draft for downgradable requests", async () => {
    mockedClassifyGameRequest.mockResolvedValueOnce({
      intent: "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE",
      response: "That full version is too large, but we can make a smaller 2D browser version.",
      visibleProcess: ["Identified the request as game-related but too advanced."],
    });

    const response = await POST(makeRequest({ prompt: "Build a giant MMO", stream: true }));
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(lines).toContainEqual(
      expect.objectContaining({
        type: "reply",
        reply: expect.objectContaining({
          generated: false,
          intent: "RELATED_OUT_OF_CAPABILITY_DOWNGRADABLE",
          message: "That full version is too large, but we can make a smaller 2D browser version.",
        }),
      }),
    );
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
  });

  it("answers unrelated harmless prompts with the answer agent and skips generation", async () => {
    mockedClassifyGameRequest.mockResolvedValueOnce({
      intent: "UNRELATED_HARMLESS",
      response: "",
      visibleProcess: ["Classified as harmless but unrelated to game creation."],
    });
    mockedAnswerUnrelatedHarmlessQuestion.mockResolvedValueOnce({
      response:
        "Tomorrow's listed games are Team A vs Team B. Would you like to turn this into a small sports quiz game?",
      visibleProcess: ["Searched for current schedule information."],
    });

    const response = await POST(
      makeRequest({ prompt: "what are tomorrow's world cup games?", stream: true }),
    );
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(mockedAnswerUnrelatedHarmlessQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-openai-key",
        model: "gpt-4.1-mini",
        prompt: "what are tomorrow's world cup games?",
        logger: expect.any(Function),
      }),
    );
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
    expect(lines).toContainEqual(
      expect.objectContaining({
        type: "reply",
        reply: expect.objectContaining({
          generated: false,
          intent: "UNRELATED_HARMLESS",
          message:
            "Tomorrow's listed games are Team A vs Team B. Would you like to turn this into a small sports quiz game?",
          visibleProcess: [
            "Classified as harmless but unrelated to game creation.",
            "Searched for current schedule information.",
          ],
        }),
      }),
    );
  });

  it("streams an error event when agent generation fails", async () => {
    mockedGenerateGameWithAgents.mockRejectedValueOnce(new Error("agent failed"));

    const response = await POST(makeRequest({ prompt: "make a runner", stream: true }));
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(response.status).toBe(200);
    expect(lines).toContainEqual(
      expect.objectContaining({
        type: "error",
        error: "agent failed",
      }),
    );
  });

  it("returns a clear JSON error when OpenAI credentials are missing", async () => {
    process.env = { ...process.env, OPENAI_API_KEY: "" };

    const response = await POST(makeRequest({ prompt: "make a runner" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Missing OPENAI_API_KEY environment variable.",
    });
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
  });

  it("chooses the OpenAI skill path when OPENAI_GAME_GENERATION_MODE is skill", async () => {
    process.env = {
      ...process.env,
      OPENAI_GAME_GENERATION_MODE: "skill",
      OPENAI_GAME_MODEL: "gpt-5.5",
    };

    const response = await POST(makeRequest({ prompt: "make a skill runner" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      gameName: "Skill Runner",
      slug: "skill-runner",
      fileName: "skill-runner.html",
      analysisFileName: "skill-runner_analysis.md",
      imageSource: "fallback",
      openAiModel: "gpt-5.5",
      verificationConclusion: "PASS",
    });
    expect(mockedGenerateGameWithOpenAISkill).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "make a skill runner",
        mode: "create",
        intent: expect.objectContaining({
          intent: "RELATED_WITHIN_CAPABILITY",
        }),
      }),
    );
    expect(mockedGenerateGameWithAgents).not.toHaveBeenCalled();
  });

  it("falls back to the legacy builder path when generation mode is not set", async () => {
    process.env = { ...process.env, OPENAI_GAME_GENERATION_MODE: "" };

    const response = await POST(makeRequest({ prompt: "make a legacy runner" }));

    expect(response.status).toBe(200);
    expect(mockedGenerateGameWithAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "make a legacy runner",
      }),
    );
    expect(mockedGenerateGameWithOpenAISkill).not.toHaveBeenCalled();
  });
});
