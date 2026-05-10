/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/magic-canvas/route";
import { fal } from "@fal-ai/client";

jest.mock("@fal-ai/client", () => ({
  fal: {
    config: jest.fn(),
    storage: {
      upload: jest.fn(),
    },
    subscribe: jest.fn(),
  },
}));

const mockedFal = fal as jest.Mocked<typeof fal>;
const originalEnv = process.env;
const imageDataUrl = `data:image/png;base64,${Buffer.from("canvas").toString("base64")}`;

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function responseText(response: Response) {
  return response.text();
}

describe("magic canvas API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, FAL_KEY: "test-fal-key" };
    mockedFal.storage.upload.mockResolvedValue("https://fal.storage/sketch.png");
    mockedFal.subscribe.mockResolvedValue({
      data: {
        images: [{ url: "https://fal.storage/generated.png" }],
      },
      requestId: "request-123",
    } as Awaited<ReturnType<typeof fal.subscribe>>);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns a clear error when fal credentials are missing", async () => {
    process.env = { ...originalEnv, FAL_KEY: "", FAL_API_KEY: "" };

    const response = await POST(
      new Request("http://localhost/api/magic-canvas", {
        method: "POST",
        body: JSON.stringify({ style: "anime", imageDataUrl }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(responseJson(response)).resolves.toMatchObject({
      error: "Missing FAL_KEY or FAL_API_KEY environment variable.",
    });
    expect(mockedFal.subscribe).not.toHaveBeenCalled();
  });

  it("rejects requests without a prompt source", async () => {
    const response = await POST(
      new Request("http://localhost/api/magic-canvas", {
        method: "POST",
        body: JSON.stringify({ style: "none", extraPrompt: "  ", imageDataUrl }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(responseJson(response)).resolves.toMatchObject({
      error: "Choose a style or add a prompt.",
    });
    expect(mockedFal.subscribe).not.toHaveBeenCalled();
  });

  it("uploads the sketch and calls the requested fal edit model", async () => {
    const response = await POST(
      new Request("http://localhost/api/magic-canvas", {
        method: "POST",
        body: JSON.stringify({
          style: "anime",
          extraPrompt: "make it rainy",
          imageDataUrl,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toMatchObject({
      imageUrl: "https://fal.storage/generated.png",
      requestId: "request-123",
    });
    expect(mockedFal.config).toHaveBeenCalledWith({ credentials: "test-fal-key" });
    expect(mockedFal.storage.upload).toHaveBeenCalledWith(expect.any(File));
    expect(mockedFal.subscribe).toHaveBeenCalledWith(
      "fal-ai/bytedance/seedream/v4.5/edit",
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: expect.stringContaining("make it rainy"),
          image_size: "auto_4K",
          num_images: 1,
          max_images: 1,
          enable_safety_checker: true,
          image_urls: ["https://fal.storage/sketch.png"],
        }),
        logs: true,
      }),
    );
  });

  it("streams fal progress and result events when requested", async () => {
    mockedFal.subscribe.mockImplementation(async (_model, options) => {
      options.onQueueUpdate?.({
        status: "IN_PROGRESS",
        logs: [{ message: "Rendering final image" }],
      } as Parameters<NonNullable<typeof options.onQueueUpdate>>[0]);

      return {
        data: {
          images: [{ url: "https://fal.storage/streamed.png" }],
        },
        requestId: "stream-request",
      } as Awaited<ReturnType<typeof fal.subscribe>>;
    });

    const response = await POST(
      new Request("http://localhost/api/magic-canvas", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: JSON.stringify({ style: "none", extraPrompt: "ink dragon", imageDataUrl }),
      }),
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await responseText(response);
    expect(body).toContain("Rendering final image");
    expect(body).toContain("https://fal.storage/streamed.png");
  });

  it("proxies generated images as attachments for browser download", async () => {
    const imageBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("png"));
        controller.close();
      },
    });
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(imageBody, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/magic-canvas?url=https%3A%2F%2Ffal.storage%2Fgenerated.png"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="magic-canvas.png"');
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
