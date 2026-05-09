"use client";

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
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/components/ToastProvider";

type Tool = "pen" | "eraser";
type StyleChoice = "none" | "anime";

const STYLE_LABELS: Record<StyleChoice, string> = {
  none: "No",
  anime: "Anime",
};

const INK_COLORS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f97316"];

export function MagicCanvas() {
  const toast = useAppToast();
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

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    return { canvas, ctx };
  }, []);

  const paintPaper = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(107, 114, 128, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 48; y < height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
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
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

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

  const generateImage = async () => {
    const state = getCanvasContext();
    if (!state || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/magic-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          extraPrompt,
          imageDataUrl: state.canvas.toDataURL("image/png"),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Image generation failed.");
      }
      if (!payload.imageUrl) {
        throw new Error("The image generator did not return an image.");
      }

      setGeneratedImageUrl(payload.imageUrl);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Image generation failed.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitPrompt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void generateImage();
  };

  const saveGeneratedImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = "magic-canvas.png";
    link.rel = "noopener";
    link.click();
  };

  return (
    <section className="magic-canvas" aria-label="Magic canvas">
      <div className="magic-canvas__toolbar" aria-label="Canvas tools">
        <label className="magic-canvas__style">
          <Sparkles size={16} aria-hidden="true" />
          <select
            value={style}
            onChange={(event) => setStyle(event.target.value as StyleChoice)}
            disabled={isGenerating}
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
            disabled={isGenerating || Boolean(generatedImageUrl)}
            title="Pen"
            aria-label="Pen"
          >
            <Brush size={18} />
          </button>
          <button
            type="button"
            className={tool === "eraser" ? "magic-canvas__tool is-active" : "magic-canvas__tool"}
            onClick={() => setTool("eraser")}
            disabled={isGenerating || Boolean(generatedImageUrl)}
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
              disabled={isGenerating || Boolean(generatedImageUrl)}
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
            disabled={isGenerating || Boolean(generatedImageUrl)}
          />
        </label>

        <div className="magic-canvas__tool-group magic-canvas__tool-group--end">
          <button
            type="button"
            className="magic-canvas__tool"
            onClick={undo}
            disabled={isGenerating || Boolean(generatedImageUrl)}
            title="Undo"
            aria-label="Undo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            className="magic-canvas__tool"
            onClick={clearCanvas}
            disabled={isGenerating || Boolean(generatedImageUrl)}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImageUrl} alt="Generated magic canvas artwork" />
            <div className="magic-canvas__result-actions" aria-label="Generated image actions">
              <button type="button" onClick={saveGeneratedImage} title="Save" aria-label="Save image">
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
            <span>Generating</span>
          </div>
        )}
      </div>

      <form className="magic-canvas__prompt" onSubmit={submitPrompt}>
        <input
          value={extraPrompt}
          onChange={(event) => setExtraPrompt(event.target.value)}
          placeholder="Add extra prompt"
          disabled={isGenerating}
          aria-label="Extra image prompt"
        />
        <button type="submit" disabled={isGenerating} aria-label="Generate image" title="Generate">
          {isGenerating ? <LoaderCircle size={20} /> : <Send size={20} />}
        </button>
      </form>
    </section>
  );
}
