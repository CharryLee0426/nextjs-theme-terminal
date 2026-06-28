import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";
import { AiGameCreator } from "@/components/game/AiGameCreator";
import { ToastProvider } from "@/components/ToastProvider";

const mockUseConvexAuth = jest.fn();
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockLikeGame = jest.fn();
const mockGenerateUploadUrl = jest.fn();
const mockCreateGame = jest.fn();
const mockDeleteGame = jest.fn();

jest.mock("convex/react", () => ({
  useConvexAuth: () => mockUseConvexAuth(),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

function ndjsonResponse(events: unknown[]) {
  const chunks = events.map((event) => new TextEncoder().encode(`${JSON.stringify(event)}\n`));
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: jest.fn(async () => {
          const value = chunks.shift();
          return value ? { done: false, value } : { done: true, value: undefined };
        }),
      }),
    },
    json: jest.fn(),
  };
}

function controlledNdjsonResponse(progressEvents: unknown[], finalEvents: unknown[]) {
  const progressChunks = progressEvents.map((event) =>
    new TextEncoder().encode(`${JSON.stringify(event)}\n`),
  );
  const finalChunks = finalEvents.map((event) =>
    new TextEncoder().encode(`${JSON.stringify(event)}\n`),
  );
  let releaseFinalEvents!: () => void;
  const finalEventsReleased = new Promise<void>((resolve) => {
    releaseFinalEvents = resolve;
  });

  return {
    response: {
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn(async () => {
            const progressValue = progressChunks.shift();
            if (progressValue) return { done: false, value: progressValue };

            await finalEventsReleased;
            const finalValue = finalChunks.shift();
            return finalValue
              ? { done: false, value: finalValue }
              : { done: true, value: undefined };
          }),
        }),
      },
      json: jest.fn(),
    },
    releaseFinalEvents,
  };
}

function renderGameCreator() {
  return render(
    <ToastProvider>
      <AiGameCreator />
    </ToastProvider>,
  );
}

function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    gameName: "Test Runner",
    slug: "test-runner",
    fileName: "test-runner.html",
    analysisFileName: "test-runner_analysis.md",
    analysisMarkdown: "# Test Runner\n\nDesign notes",
    html: "<!DOCTYPE html><html><body><canvas></canvas><script></script></body></html>",
    imageUrl: "data:image/svg+xml,test",
    imageSource: "fallback",
    imageNote: null,
    prompt: "",
    visibleProcess: [],
    verificationConclusion: "PASS",
    verificationReasons: [],
    skillPath: "src/lib/gameCreator/html-minigame/SKILL.md",
    openAiModel: "gpt-5.4-mini",
    ...overrides,
  };
}

beforeAll(() => {
  if (typeof TextEncoder === "undefined") {
    global.TextEncoder = NodeTextEncoder as typeof TextEncoder;
  }
  if (typeof TextDecoder === "undefined") {
    global.TextDecoder = NodeTextDecoder as typeof TextDecoder;
  }
});

describe("AiGameCreator", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockUseConvexAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
    mockUseQuery.mockReturnValue([]);
    mockUseMutation
      .mockReturnValueOnce(mockLikeGame)
      .mockReturnValueOnce(mockGenerateUploadUrl)
      .mockReturnValueOnce(mockCreateGame)
      .mockReturnValueOnce(mockDeleteGame);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("requests streamed game generation and renders agent progress", async () => {
    const stream = controlledNdjsonResponse(
      [
        { type: "progress", event: "planner:start", details: { agent: "HTML Minigame Planner" } },
        {
          type: "progress",
          event: "planner:complete",
          details: {
            gameName: "Test Runner",
            analysisFileName: "test-runner_analysis.md",
            fileName: "test-runner.html",
          },
        },
        {
          type: "progress",
          event: "builder:visibleProcess",
          details: { step: "Built a responsive canvas loop" },
        },
        {
          type: "progress",
          event: "verifier:complete",
          details: {
            verificationConclusion: "PASS",
            verificationReasons: ["Standalone HTML"],
          },
        },
      ],
      [
        {
          type: "complete",
          draft: {
            gameName: "Test Runner",
            slug: "test-runner",
            fileName: "test-runner.html",
            analysisFileName: "test-runner_analysis.md",
            analysisMarkdown: "# Test Runner\n\nDesign notes",
            html: "<!DOCTYPE html><html><body><script></script></body></html>",
            imageUrl: "data:image/svg+xml,test",
            imageSource: "fallback",
            imageNote: "Fallback image used.",
            prompt: "",
            visibleProcess: ["Planned controls", "Built canvas loop"],
            verificationConclusion: "PASS",
            verificationReasons: ["Standalone HTML"],
            skillPath: "src/lib/gameCreator/html-minigame/SKILL.md",
            openAiModel: "gpt-5.4-mini",
          },
        },
      ],
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(stream.response);

    renderGameCreator();

    fireEvent.change(screen.getByLabelText("Game prompt"), {
      target: { value: "make a runner" },
    });
    fireEvent.click(screen.getByLabelText("Generate game"));

    await waitFor(() => {
      expect(screen.getByText("Planning game design")).toBeInTheDocument();
    });
    expect(screen.getByText("Built a responsive canvas loop")).toBeInTheDocument();

    stream.releaseFinalEvents();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Runner" })).toBeInTheDocument();
    });
    expect(screen.getByText("test-runner_analysis.md + test-runner.html")).toBeInTheDocument();
    expect(screen.getByText("Generated Test Runner. Fallback image used.")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/games/generate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }),
    );
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
      prompt: "make a runner",
      stream: true,
    });
  });

  it("sends existing draft metadata when asking for game edits", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        ndjsonResponse([
          {
            type: "complete",
            draft: {
              gameName: "Test Runner",
              slug: "test-runner",
              fileName: "test-runner.html",
              analysisFileName: "test-runner_analysis.md",
              analysisMarkdown: "# Test Runner\n\nDesign notes",
              html: "<!DOCTYPE html><html><body><script></script></body></html>",
              imageUrl: "data:image/svg+xml,test",
              imageSource: "fallback",
              imageNote: null,
              prompt: "",
              visibleProcess: [],
              verificationConclusion: "PASS",
              verificationReasons: [],
              skillPath: "src/lib/gameCreator/html-minigame/SKILL.md",
              openAiModel: "gpt-5.4-mini",
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        ndjsonResponse([
          {
            type: "reply",
            reply: {
              generated: false,
              intent: "GREETING",
              message: "Edit received.",
              visibleProcess: [],
              openAiModel: "gpt-5.4-mini",
            },
          },
        ]),
      );

    renderGameCreator();

    fireEvent.change(screen.getByLabelText("Game prompt"), {
      target: { value: "make a runner" },
    });
    fireEvent.click(screen.getByLabelText("Generate game"));

    await screen.findByRole("heading", { name: "Test Runner" });

    fireEvent.change(screen.getByLabelText("Game prompt"), {
      target: { value: "make the background space themed" },
    });
    fireEvent.click(screen.getByLabelText("Generate game"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toMatchObject({
      prompt: "make the background space themed",
      previousHtml: "<!DOCTYPE html><html><body><script></script></body></html>",
      previousGame: {
        gameName: "Test Runner",
        slug: "test-runner",
        fileName: "test-runner.html",
        analysisFileName: "test-runner_analysis.md",
        analysisMarkdown: "# Test Runner\n\nDesign notes",
      },
      stream: true,
    });
  });

  it("surfaces streamed generation errors in the conversation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      ndjsonResponse([
        { type: "progress", event: "planner:start", details: {} },
        { type: "error", error: "agent failed" },
      ]),
    );

    renderGameCreator();

    fireEvent.change(screen.getByLabelText("Game prompt"), {
      target: { value: "make a runner" },
    });
    fireEvent.click(screen.getByLabelText("Generate game"));

    await waitFor(() => {
      expect(screen.getAllByText("agent failed").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("heading", { name: "Test Runner" })).not.toBeInTheDocument();
  });

  it("opens generated games in a focusable playable preview iframe", async () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, "focus").mockImplementation();
    try {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        ndjsonResponse([
          {
            type: "complete",
            draft: makeDraft(),
          },
        ]),
      );

      renderGameCreator();

      fireEvent.change(screen.getByLabelText("Game prompt"), {
        target: { value: "make a runner" },
      });
      fireEvent.click(screen.getByLabelText("Generate game"));

      await screen.findByRole("heading", { name: "Test Runner" });
      fireEvent.click(screen.getByText("Preview"));

      const frame = screen.getByTitle("Generated game preview");
      expect(frame).toHaveAttribute("tabindex", "0");
      expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-pointer-lock");
      expect(frame).toHaveAttribute("allow", "gamepad; fullscreen");

      fireEvent.load(frame);
      expect(focusSpy).toHaveBeenCalled();
    } finally {
      focusSpy.mockRestore();
    }
  });

  it("renders classified assistant replies without a generated game card", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      ndjsonResponse([
        { type: "progress", event: "intent:complete", details: { intent: "GREETING" } },
        {
          type: "reply",
          reply: {
            generated: false,
            intent: "GREETING",
            message:
              "Hi! I can help you create browser-based HTML/CSS/JavaScript minigames.",
            visibleProcess: ["Classified the message as a greeting."],
            openAiModel: "gpt-5.4-mini",
          },
        },
      ]),
    );

    renderGameCreator();

    fireEvent.change(screen.getByLabelText("Game prompt"), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByLabelText("Generate game"));

    await waitFor(() => {
      expect(
        screen.getByText("Hi! I can help you create browser-based HTML/CSS/JavaScript minigames."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Intent: GREETING")).not.toBeInTheDocument();
    expect(screen.queryByText("Classified the message as a greeting.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Generated game result")).not.toBeInTheDocument();
  });

  it("lets admins delete published games after confirmation", async () => {
    jest.spyOn(window, "confirm").mockReturnValueOnce(true);
    mockUseQuery
      .mockReturnValueOnce([
        {
          _id: "game-1",
          name: "Delete Me",
          prompt: "make a puzzle",
          createdAt: Date.UTC(2026, 0, 1),
          likes: 3,
          htmlUrl: "https://example.com/game.html",
          analysisUrl: null,
          imageUrl: null,
        },
      ])
      .mockReturnValueOnce({ role: "admin" });

    renderGameCreator();

    fireEvent.click(screen.getByLabelText("Delete Delete Me"));

    await waitFor(() => {
      expect(mockDeleteGame).toHaveBeenCalledWith({ gameId: "game-1" });
    });
    expect(window.confirm).toHaveBeenCalledWith('Delete "Delete Me"? This cannot be undone.');
  });
});
