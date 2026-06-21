/**
 * @jest-environment node
 */

import { POST } from "@/app/api/games/generate/route";
import {
  answerUnrelatedHarmlessQuestion,
  classifyGameRequest,
  generateGameWithAgents,
} from "@/lib/gameCreator/agents";

jest.mock("@/lib/gameCreator/agents", () => ({
  answerUnrelatedHarmlessQuestion: jest.fn(),
  classifyGameRequest: jest.fn(),
  generateGameWithAgents: jest.fn(),
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
});
