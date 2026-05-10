"use client";

import Link from "next/link";
import {
  Brush,
  Download,
  Eraser,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useConvexAuth, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/components/ToastProvider";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Tool = "pen" | "eraser";
type StyleChoice = "none" | "anime";

const STYLE_LABELS: Record<StyleChoice, string> = {
  none: "No",
  anime: "Anime",
};

const INK_COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f97316"];
const MAGIC_CANVAS_MODEL = "fal-ai/bytedance/seedream/v4.5/edit";

export function MagicCanvas() {
  const toast = useAppToast();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const generateConvexUploadUrl = useMutation(api.magicCanvas.generateUploadUrl);
  const createCanvasImage = useMutation(api.magicCanvas.createImage);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [style, setStyle] = useState<StyleChoice>("none");
  const [ink, setInk] = useState(INK_COLORS[0]);
  const [size, setSize] = useState(6);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState("Generating image");

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    return { canvas, ctx };
  }, []);

  const paintPaper = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, []);

  const saveHistory = useCallback(() => {
    const state = getCanvasContext();
    if (!state) return;
    const snapshot = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    historyRef.current = [...historyRef.current.slice(-19), snapshot];
  }, [getCanvasContext]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const previous = canvas.width > 0 && canvas.height > 0
      ? canvas.toDataURL("image/png")
      : null;
    const ratio = window.devicePixelRatio || 1;
    const style = window.getComputedStyle(parent);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const width = Math.max(1, parent.clientWidth - horizontalPadding);
    const height = Math.max(1, parent.clientHeight - verticalPadding);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    paintPaper(ctx, canvas.width, canvas.height);

    if (previous) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = previous;
    } else {
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
  }, [paintPaper]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const state = getCanvasContext();
    if (!state) return;
    const { ctx } = state;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * (window.devicePixelRatio || 1);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isGenerating || generatedImageUrl) return;
    const point = getPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    saveHistory();
    lastPointRef.current = point;
    setIsDrawing(true);
  };

  const moveDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    const point = getPoint(event);
    if (!point) return;
    drawLine(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const stopDrawing = () => {
    lastPointRef.current = null;
    setIsDrawing(false);
  };

  const undo = () => {
    const state = getCanvasContext();
    const snapshot = historyRef.current.pop();
    if (!state || !snapshot || isGenerating || generatedImageUrl) return;
    state.ctx.putImageData(snapshot, 0, 0);
  };

  const clearCanvas = () => {
    const state = getCanvasContext();
    if (!state || isGenerating || generatedImageUrl) return;
    saveHistory();
    paintPaper(state.ctx, state.canvas.width, state.canvas.height);
  };

  const persistGeneratedImage = async (
    imageUrl: string,
    selectedStyle: StyleChoice,
    prompt: string,
  ) => {
    setGenerationStatus("Saving image");
    const imageResponse = await fetch(`/api/magic-canvas?url=${encodeURIComponent(imageUrl)}`);
    if (!imageResponse.ok) {
      const payload = await imageResponse.json().catch(() => ({}));
      throw new Error(payload.error || "Generated image could not be saved.");
    }

    const imageBlob = await imageResponse.blob();
    const uploadUrl = await generateConvexUploadUrl();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": imageBlob.type || "image/png",
      },
      body: imageBlob,
    });
    if (!uploadResponse.ok) {
      throw new Error("Generated image upload failed.");
    }

    const uploadJson = (await uploadResponse.json()) as { storageId: string };
    await createCanvasImage({
      imageId: uploadJson.storageId as Id<"_storage">,
      style: selectedStyle,
      model: MAGIC_CANVAS_MODEL,
      extraPrompt: prompt,
    });
  };

  const generateImage = async () => {
    const state = getCanvasContext();
    if (!state || isGenerating) return;
    if (authLoading) {
      toast.show("Authentication is still loading. Try again in a moment.", "error");
      return;
    }
    if (!isAuthenticated) {
      toast.show("Sign in before generating so the image can be saved to your account.", "error");
      return;
    }

    const selectedStyle = style;
    const prompt = extraPrompt;
    setIsGenerating(true);
    setGenerationStatus("Preparing sketch");
    try {
      const response = await fetch("/api/magic-canvas", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          style: selectedStyle,
          extraPrompt: prompt,
          imageDataUrl: state.canvas.toDataURL("image/png"),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Image generation failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Image generation response could not be read.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let imageUrl: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const event = chunk.match(/^event: (.+)$/m)?.[1];
          const dataText = chunk.match(/^data: (.+)$/m)?.[1];
          if (!event || !dataText) continue;

          const data = JSON.parse(dataText) as {
            error?: string;
            imageUrl?: string;
            message?: string;
          };

          if (event === "progress" && data.message) {
            setGenerationStatus(data.message);
          }
          if (event === "result" && data.imageUrl) {
            imageUrl = data.imageUrl;
          }
          if (event === "error") {
            throw new Error(data.error || "Image generation failed.");
          }
        }
      }

      if (!imageUrl) {
        throw new Error("The image generator did not return an image.");
      }

      await persistGeneratedImage(imageUrl, selectedStyle, prompt);
      setGeneratedImageUrl(imageUrl);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Image generation failed.", "error");
    } finally {
      setIsGenerating(false);
      setGenerationStatus("Generating image");
    }
  };

  const submitPrompt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void generateImage();
  };

  const saveGeneratedImage = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(`/api/magic-canvas?url=${encodeURIComponent(generatedImageUrl)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not download generated image.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "magic-canvas.png";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not download generated image.", "error");
    }
  };

  if (authLoading) {
    return (
      <section className="magic-canvas magic-canvas-auth" aria-label="Magic canvas">
        <LoaderCircle size={30} aria-hidden="true" />
        <p>Checking account status</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="magic-canvas magic-canvas-auth" aria-label="Magic canvas">
        <Sparkles size={32} aria-hidden="true" />
        <h1>Sign in to use Magic Canvas</h1>
        <p>
          Magic Canvas saves every generated image to your account with its style,
          model, prompt, and creation time.
        </p>
        <Link href="/sign" className="magic-canvas-auth__link">
          Log in
        </Link>
      </section>
    );
  }

  return (
    <section className="magic-canvas" aria-label="Magic canvas">
      <div className="magic-canvas__toolbar" aria-label="Canvas tools">
        <label className="magic-canvas__style">
          <Sparkles size={16} aria-hidden="true" />
          <select
            value={style}
            onChange={(event) => setStyle(event.target.value as StyleChoice)}
            disabled={isGenerating || authLoading}
            aria-label="Choose image style"
          >
            {Object.entries(STYLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="magic-canvas__tool-group" role="group" aria-label="Drawing tools">
          <button
            type="button"
            className={tool === "pen" ? "magic-canvas__tool is-active" : "magic-canvas__tool"}
            onClick={() => setTool("pen")}
            disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
            title="Pen"
            aria-label="Pen"
          >
            <Brush size={18} />
          </button>
          <button
            type="button"
            className={tool === "eraser" ? "magic-canvas__tool is-active" : "magic-canvas__tool"}
            onClick={() => setTool("eraser")}
            disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
            title="Eraser"
            aria-label="Eraser"
          >
            <Eraser size={18} />
          </button>
        </div>

        <div className="magic-canvas__swatches" role="group" aria-label="Ink colors">
          {INK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={ink === color ? "magic-canvas__swatch is-active" : "magic-canvas__swatch"}
              style={{ backgroundColor: color }}
              onClick={() => setInk(color)}
              disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
              aria-label={`Use ink ${color}`}
              title={color}
            />
          ))}
        </div>

        <label className="magic-canvas__size" aria-label="Stroke size">
          <input
            type="range"
            min="2"
            max="22"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
          />
        </label>

        <div className="magic-canvas__tool-group magic-canvas__tool-group--end">
          <button
            type="button"
            className="magic-canvas__tool"
            onClick={undo}
            disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
            title="Undo"
            aria-label="Undo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            className="magic-canvas__tool"
            onClick={clearCanvas}
            disabled={isGenerating || authLoading || Boolean(generatedImageUrl)}
            title="Clear"
            aria-label="Clear"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="magic-canvas__stage">
        <canvas
          ref={canvasRef}
          className="magic-canvas__surface"
          onPointerDown={startDrawing}
          onPointerMove={moveDrawing}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="Sketch painting canvas"
        />

        {generatedImageUrl && (
          <div className="magic-canvas__result">
            <button
              type="button"
              className="magic-canvas__result-preview"
              onClick={() => setPreviewImageUrl(generatedImageUrl)}
              aria-label="Preview generated image"
            >
            {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImageUrl} alt="Generated magic canvas artwork" />
            </button>
            <div className="magic-canvas__result-actions" aria-label="Generated image actions">
              <button type="button" onClick={() => void saveGeneratedImage()} title="Save" aria-label="Save image">
                <Download size={18} />
              </button>
              <button
                type="button"
                onClick={() => setGeneratedImageUrl(null)}
                title="Close"
                aria-label="Close generated image"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="magic-canvas__loading" role="status" aria-live="polite">
            <LoaderCircle size={34} />
            <span>{generationStatus}</span>
          </div>
        )}
      </div>

      <form className="magic-canvas__prompt" onSubmit={submitPrompt}>
        <input
          value={extraPrompt}
          onChange={(event) => setExtraPrompt(event.target.value)}
          placeholder="Add extra prompt"
          disabled={isGenerating || authLoading}
          aria-label="Extra image prompt"
        />
        <button type="submit" disabled={isGenerating || authLoading} aria-label="Generate image" title="Generate">
          {isGenerating ? <LoaderCircle size={20} /> : <Send size={20} />}
        </button>
      </form>

      {previewImageUrl && (
        <div
          className="magic-canvas-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Generated image preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewImageUrl(null);
          }}
        >
          <button
            type="button"
            className="magic-canvas-preview__close"
            onClick={() => setPreviewImageUrl(null)}
            aria-label="Close preview"
          >
            <X size={26} />
          </button>
          <div className="magic-canvas-preview__inner" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Generated magic canvas artwork preview" />
          </div>
        </div>
      )}
    </section>
  );
}
