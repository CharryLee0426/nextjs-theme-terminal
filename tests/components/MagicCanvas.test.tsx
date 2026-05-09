import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";
import { MagicCanvas } from "@/components/MagicCanvas";
import { ToastProvider } from "@/components/ToastProvider";

function renderCanvas() {
  return render(
    <ToastProvider>
      <MagicCanvas />
    </ToastProvider>,
  );
}

function sseResponse(events: string[]) {
  const chunks = events.map((event) => new TextEncoder().encode(event));
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
  };
}

function blobResponse(blob: Blob) {
  return {
    ok: true,
    blob: jest.fn(async () => blob),
    json: jest.fn(async () => ({})),
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

describe("MagicCanvas", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();

    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      beginPath: jest.fn(),
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      lineTo: jest.fn(),
      moveTo: jest.fn(),
      putImageData: jest.fn(),
      stroke: jest.fn(),
    })) as HTMLCanvasElement["getContext"];
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => "data:image/png;base64,Y2FudmFz");
    URL.createObjectURL = jest.fn(() => "blob:magic-canvas") as typeof URL.createObjectURL;
    URL.revokeObjectURL = jest.fn() as typeof URL.revokeObjectURL;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("renders the drawing controls and default style choice", () => {
    renderCanvas();

    expect(screen.getByRole("region", { name: "Magic canvas" })).toBeInTheDocument();
    expect(screen.getByLabelText("Choose image style")).toHaveValue("none");
    expect(screen.getByLabelText("Pen")).toBeEnabled();
    expect(screen.getByLabelText("Eraser")).toBeEnabled();
    expect(screen.getByLabelText("Extra image prompt")).toHaveAttribute("placeholder", "Add extra prompt");
  });

  it("sends the selected style, prompt, and canvas image to the streaming API", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      sseResponse([
        'event: progress\ndata: {"message":"Rendering final image"}\n\n',
        'event: result\ndata: {"imageUrl":"https://fal.storage/generated.png"}\n\n',
      ]),
    );
    renderCanvas();

    fireEvent.change(screen.getByLabelText("Choose image style"), {
      target: { value: "anime" },
    });
    fireEvent.change(screen.getByLabelText("Extra image prompt"), {
      target: { value: "A quiet night market" },
    });
    fireEvent.click(screen.getByLabelText("Generate image"));

    await waitFor(() => {
      expect(screen.getByAltText("Generated magic canvas artwork")).toHaveAttribute(
        "src",
        "https://fal.storage/generated.png",
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/magic-canvas",
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      }),
    );
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
      style: "anime",
      extraPrompt: "A quiet night market",
      imageDataUrl: "data:image/png;base64,Y2FudmFz",
    });
  });

  it("opens and closes a page-local preview for generated images", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      sseResponse(['event: result\ndata: {"imageUrl":"https://fal.storage/generated.png"}\n\n']),
    );
    renderCanvas();

    fireEvent.change(screen.getByLabelText("Extra image prompt"), {
      target: { value: "preview test" },
    });
    fireEvent.click(screen.getByLabelText("Generate image"));

    const previewButton = await screen.findByLabelText("Preview generated image");
    fireEvent.click(previewButton);

    expect(screen.getByRole("dialog", { name: "Generated image preview" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close preview"));
    expect(screen.queryByRole("dialog", { name: "Generated image preview" })).not.toBeInTheDocument();
  });

  it("downloads generated images through the same-origin proxy", async () => {
    const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        sseResponse(['event: result\ndata: {"imageUrl":"https://fal.storage/generated.png"}\n\n']),
      )
      .mockResolvedValueOnce(blobResponse(new Blob(["png"], { type: "image/png" })));
    renderCanvas();

    fireEvent.change(screen.getByLabelText("Extra image prompt"), {
      target: { value: "download test" },
    });
    fireEvent.click(screen.getByLabelText("Generate image"));
    fireEvent.click(await screen.findByLabelText("Save image"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/magic-canvas?url=https%3A%2F%2Ffal.storage%2Fgenerated.png",
      );
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalled();
  });
});
