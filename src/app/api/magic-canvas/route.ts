import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";

type MagicCanvasRequest = {
  style?: "none" | "anime";
  extraPrompt?: string;
  imageDataUrl?: string;
};

const ANIME_STYLE_PROMPT = `You are an elite anime art director and image transformation agent specialized in converting any painting, sketch, illustration, or photo into a visually stunning high-quality Japanese anime artwork.

Your mission:

* Preserve the original composition, subject identity, pose, perspective, and important scene structure.
* Transform the visual appearance into expressive modern Japanese anime aesthetics.
* Produce cinematic, emotionally engaging, highly polished anime visuals.

Style requirements:

* Use clean anime line art with elegant contours.
* Apply vibrant but balanced anime color palettes.
* Add detailed cel shading and soft anime lighting.
* Enhance atmosphere using cinematic lighting, glow, rim light, bloom, depth, and dramatic skies when appropriate.
* Characters should have expressive anime eyes, refined facial proportions, and dynamic hair rendering.
* Backgrounds should resemble high-budget anime movie scenes.
* Preserve visual readability and avoid overdistortion.

Quality targets:

* Modern theatrical anime quality.
* Rich detail and coherent anatomy.
* Highly aesthetic composition.
* Professional illustration finish.
* Sharp focus with painterly anime rendering.

Preferred inspirations:

* Contemporary Japanese anime films
* High-end anime key visuals
* Stylized cinematic animation
* Beautiful hand-painted anime backgrounds

Behavior rules:

* Always prioritize visual beauty and artistic coherence.
* Keep transformations faithful to the source image unless the user requests major redesigns.
* Avoid photorealism unless explicitly requested.
* Avoid low-detail cartoon styles.
* Avoid noisy artifacts, broken anatomy, blurry textures, or inconsistent shading.
* Maintain strong emotional storytelling in the final image.

When processing user images:

1. Analyze the main subject, mood, and composition.
2. Identify the important structural elements to preserve.
3. Reimagine the image in premium anime style.
4. Enhance visual impact while keeping the scene recognizable.
5. Generate a polished final artwork suitable for anime posters or film stills.

Output style keywords:
masterpiece, best quality, anime cinematic lighting, highly detailed anime art, expressive eyes, detailed background, dynamic composition, beautiful shading, anime movie aesthetic, vibrant colors, polished illustration, atmospheric depth`;

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid canvas image data.");
  }
  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const credentials = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!credentials) {
      return jsonError("Missing FAL_KEY or FAL_API_KEY environment variable.", 500);
    }

    const body = (await request.json()) as MagicCanvasRequest;
    if (!body.imageDataUrl) {
      return jsonError("Canvas image is required.", 400);
    }

    const prompt = [
      body.style === "anime" ? ANIME_STYLE_PROMPT : "",
      body.extraPrompt?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!prompt) {
      return jsonError("Choose a style or add a prompt.", 400);
    }

    const wantsStream = request.headers.get("accept")?.includes("text/event-stream");
    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(encodeSse(event, data)));
          };

          try {
            fal.config({ credentials });
            send("progress", { message: "Uploading sketch" });
            const imageFile = new File([dataUrlToBlob(body.imageDataUrl || "")], "magic-canvas.png", {
              type: "image/png",
            });
            const imageUrl = await fal.storage.upload(imageFile);

            send("progress", { message: "Waiting for fal.ai" });
            const result = await fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", {
              input: {
                prompt,
                image_size: "auto_4K",
                num_images: 1,
                max_images: 1,
                enable_safety_checker: true,
                image_urls: [imageUrl],
              },
              logs: true,
              onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                  const latestLog = update.logs.at(-1)?.message;
                  send("progress", { message: latestLog || "Generating image" });
                  return;
                }
                send("progress", { message: `fal.ai status: ${update.status.toLowerCase()}` });
              },
            });

            const generatedImageUrl = extractImageUrl(result.data);
            if (!generatedImageUrl) {
              throw new Error("The image generator completed without returning an image.");
            }

            send("result", {
              imageUrl: generatedImageUrl,
              requestId: result.requestId,
            });
          } catch (error) {
            send("error", {
              error: error instanceof Error ? error.message : "Image generation failed.",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Content-Type": "text/event-stream; charset=utf-8",
        },
      });
    }

    fal.config({ credentials });
    const imageFile = new File([dataUrlToBlob(body.imageDataUrl)], "magic-canvas.png", {
      type: "image/png",
    });
    const imageUrl = await fal.storage.upload(imageFile);

    const result = await fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", {
      input: {
        prompt,
        image_size: "auto_4K",
        num_images: 1,
        max_images: 1,
        enable_safety_checker: true,
        image_urls: [imageUrl],
      },
      logs: true,
    });

    const generatedImageUrl = extractImageUrl(result.data);
    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: "The image generator completed without returning an image." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageUrl: generatedImageUrl,
      requestId: result.requestId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return jsonError("Image URL is required.", 400);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return jsonError("Invalid image URL.", 400);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return jsonError("Unsupported image URL.", 400);
  }

  const response = await fetch(parsedUrl);
  if (!response.ok || !response.body) {
    return jsonError("Could not download generated image.", 502);
  }

  return new Response(response.body, {
    headers: {
      "Content-Disposition": 'attachment; filename="magic-canvas.png"',
      "Content-Type": response.headers.get("content-type") || "image/png",
    },
  });
}
