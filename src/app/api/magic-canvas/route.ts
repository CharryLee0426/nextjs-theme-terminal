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

export async function POST(request: Request) {
  try {
    const credentials = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!credentials) {
      return NextResponse.json(
        { error: "Missing FAL_KEY or FAL_API_KEY environment variable." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as MagicCanvasRequest;
    if (!body.imageDataUrl) {
      return NextResponse.json({ error: "Canvas image is required." }, { status: 400 });
    }

    const prompt = [
      body.style === "anime" ? ANIME_STYLE_PROMPT : "",
      body.extraPrompt?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!prompt) {
      return NextResponse.json({ error: "Choose a style or add a prompt." }, { status: 400 });
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
