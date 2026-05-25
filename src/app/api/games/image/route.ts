import { NextResponse } from "next/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return jsonError("Image URL is required.", 400);
  }

  if (url.startsWith("data:image/")) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        "Content-Disposition": 'attachment; filename="game-intro-image"',
        "Content-Type": blob.type || "image/png",
      },
    });
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
      "Content-Disposition": 'attachment; filename="game-intro-image"',
      "Content-Type": response.headers.get("content-type") || "image/png",
    },
  });
}
