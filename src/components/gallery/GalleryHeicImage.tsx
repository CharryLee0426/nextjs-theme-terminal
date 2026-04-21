"use client";

import heic2any from "heic2any";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

/**
 * Renders a gallery image; if the browser cannot decode HEIC/HEIF from the URL,
 * fetches the blob and converts it with heic2any (same-origin / CORS permitting).
 */
export function GalleryHeicImage({ src, alt = "", className }: Props) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [showBroken, setShowBroken] = useState(false);
  const triedRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setDisplaySrc(src);
    setShowBroken(false);
    triedRef.current = false;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, [src]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const tryHeicFallback = useCallback(async () => {
    try {
      const res = await fetch(src, { mode: "cors", credentials: "omit" });
      if (!res.ok) {
        setShowBroken(true);
        return;
      }
      const blob = await res.blob();
      const result = await heic2any({
        blob,
        toType: "image/jpeg",
        quality: 0.9,
      });
      const out = Array.isArray(result) ? result[0] : result;
      const url = URL.createObjectURL(out);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setDisplaySrc(url);
    } catch {
      setShowBroken(true);
    }
  }, [src]);

  if (showBroken) {
    return (
      <div
        className={[className, "gallery-img-fallback"].filter(Boolean).join(" ")}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => {
        if (triedRef.current) return;
        triedRef.current = true;
        void tryHeicFallback();
      }}
    />
  );
}
