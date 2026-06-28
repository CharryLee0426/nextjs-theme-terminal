/**
 * @jest-environment node
 */

import {
  extractHtmlFromSkillResponse,
  generateGameWithOpenAISkill,
} from "@/lib/gameCreator/skillGeneration";

const mockResponsesCreate = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    responses: {
      create: mockResponsesCreate,
    },
  })),
);

const originalEnv = process.env;

const completeHtml = [
  "<!doctype html>",
  "<html>",
  "<head><title>Skill Game</title><style>body{margin:0}</style></head>",
  "<body><button id=\"restart\">Restart</button><script>document.getElementById('restart');</script></body>",
  "</html>",
].join("");

function mockResponse(outputText: string) {
  mockResponsesCreate.mockResolvedValue({
    id: "resp_test",
    model: "gpt-5.5",
    status: "completed",
    error: null,
    output_text: outputText,
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: outputText,
          },
        ],
      },
    ],
  });
}

describe("OpenAI skill game generation helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-openai-key",
      OPENAI_HTML_MINIGAME_SKILL_ID: "skill_test",
      OPENAI_HTML_MINIGAME_SKILL_VERSION: "1",
      OPENAI_GAME_MODEL: "gpt-5.5",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("extracts the first fenced HTML block", () => {
    expect(
      extractHtmlFromSkillResponse(
        ["Summary", "```html", completeHtml, "```", "More text"].join("\n"),
      ),
    ).toBe(completeHtml);
  });

  it("falls back to slicing raw text from doctype through final html close", () => {
    expect(
      extractHtmlFromSkillResponse(`Summary before\n${completeHtml}\nSummary after`),
    ).toBe(completeHtml);
  });

  it("throws a clear error when no complete HTML exists", () => {
    expect(() => extractHtmlFromSkillResponse("summary only")).toThrow(
      "OpenAI skill response did not include a complete HTML document.",
    );
  });

  it("runs assertCompleteHtml after extracting the Responses output", async () => {
    mockResponse("```html\n<!doctype html><html><body>No CSS or JS</body></html>\n```");

    await expect(generateGameWithOpenAISkill({ prompt: "make a game" })).rejects.toThrow(
      "Generated game must include embedded CSS and JavaScript.",
    );
  });

  it("calls Responses with shell container_auto and the uploaded skill reference", async () => {
    mockResponse(["Summary", "```html", completeHtml, "```"].join("\n"));

    await expect(
      generateGameWithOpenAISkill({ prompt: "make a clicker" }),
    ).resolves.toMatchObject({
      html: completeHtml,
      metadata: {
        model: "gpt-5.5",
        skillId: "skill_test",
        skillVersion: "1",
      },
    });
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        tools: [
          {
            type: "shell",
            environment: {
              type: "container_auto",
              skills: [
                {
                  type: "skill_reference",
                  skill_id: "skill_test",
                  version: "1",
                },
              ],
            },
          },
        ],
        tool_choice: "auto",
      }),
    );
  });
});
