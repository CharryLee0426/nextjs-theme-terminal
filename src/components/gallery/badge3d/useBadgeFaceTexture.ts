"use client";

import heic2any from "heic2any";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

const CANVAS_HEIGHT = 720;
const CANVAS_WIDTH = Math.round(
  CANVAS_HEIGHT * (CARD_WIDTH / CARD_HEIGHT),
);
const FONT_STACK =
  "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, -apple-system, 'Segoe UI', sans-serif";

async function loadCoverImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = async () => {
      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const converted = await heic2any({
          blob,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const out = Array.isArray(converted) ? converted[0] : converted;
        const objectUrl = URL.createObjectURL(out);
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error("image decode failed"));
        fallbackImg.src = objectUrl;
      } catch (err) {
        reject(err instanceof Error ? err : new Error("image load failed"));
      }
    };
    img.src = url;
  });
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#14171a";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  const imgAspect = img.width / img.height;
  let drawWidth: number;
  let drawHeight: number;
  if (imgAspect > canvasAspect) {
    drawHeight = CANVAS_HEIGHT;
    drawWidth = drawHeight * imgAspect;
  } else {
    drawWidth = CANVAS_WIDTH;
    drawHeight = drawWidth / imgAspect;
  }
  const dx = (CANVAS_WIDTH - drawWidth) / 2;
  const dy = (CANVAS_HEIGHT - drawHeight) / 2;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function drawTitleBar(ctx: CanvasRenderingContext2D, title: string) {
  const barHeight = CANVAS_HEIGHT * 0.22;
  const barY = CANVAS_HEIGHT - barHeight;
  const gradient = ctx.createLinearGradient(0, barY, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "rgba(10, 12, 10, 0)");
  gradient.addColorStop(0.45, "rgba(10, 12, 10, 0.85)");
  gradient.addColorStop(1, "rgba(10, 12, 10, 0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, barY, CANVAS_WIDTH, barHeight);

  const maxWidth = CANVAS_WIDTH * 0.88;
  const minFontSize = 26;
  let fontSize = 52;
  let text = title.trim() || "Untitled";

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const setFont = () => {
    ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  };
  setFont();
  while (fontSize > minFontSize && ctx.measureText(text).width > maxWidth) {
    fontSize -= 2;
    setFont();
  }
  while (text.length > 1 && ctx.measureText(text).width > maxWidth) {
    text = text.slice(0, -1);
  }
  if (text !== title.trim()) {
    text = `${text.replace(/[…]$/, "").slice(0, -1)}…`;
  }

  ctx.fillStyle = "#00ff41";
  ctx.shadowColor = "rgba(0, 255, 65, 0.35)";
  ctx.shadowBlur = 12;
  ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - barHeight * 0.32);
  ctx.shadowBlur = 0;
}

/**
 * Draws the post's cover image + title onto a canvas and exposes it as a
 * live-updating THREE.CanvasTexture for the physical badge card mesh.
 * Using a 2D canvas (instead of drei's Text3D, which needs a pre-baked
 * glyph atlas) keeps full Unicode/CJK support for arbitrary post titles.
 */
export function useBadgeFaceTexture(title: string, coverUrl?: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current && typeof document !== "undefined") {
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = CANVAS_WIDTH;
    canvasRef.current.height = CANVAS_HEIGHT;
  }

  const texture = useMemo(() => {
    if (!canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !texture) return;

    let cancelled = false;

    drawBackground(ctx);
    drawTitleBar(ctx, title);
    texture.needsUpdate = true;

    if (coverUrl) {
      loadCoverImage(coverUrl)
        .then((img) => {
          if (cancelled) return;
          drawBackground(ctx);
          drawCover(ctx, img);
          drawTitleBar(ctx, title);
          texture.needsUpdate = true;
        })
        .catch(() => {
          /* keep the plain background + title */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [title, coverUrl, texture]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}
