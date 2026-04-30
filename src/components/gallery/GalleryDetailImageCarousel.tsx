"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef } from "react";
import { GalleryHeicImage } from "./GalleryHeicImage";

const SWIPE_THRESHOLD_PX = 48;

type Props = {
  imageUrls: string[];
  index: number;
  onIndexChange: (next: number) => void;
  variant: "embedded" | "fullscreen";
  /** Opens fullscreen preview when the main image is clicked (embedded only). */
  onImageClick?: () => void;
};

export function GalleryDetailImageCarousel({
  imageUrls,
  index,
  onIndexChange,
  variant,
  onImageClick,
}: Props) {
  const touchStartX = useRef<number | null>(null);

  const n = imageUrls.length;
  const safeIndex = n === 0 ? 0 : Math.min(Math.max(0, index), n - 1);
  const src = imageUrls[safeIndex];

  const goPrev = useCallback(() => {
    if (safeIndex <= 0) return;
    onIndexChange(safeIndex - 1);
  }, [onIndexChange, safeIndex]);

  const goNext = useCallback(() => {
    if (safeIndex >= n - 1) return;
    onIndexChange(safeIndex + 1);
  }, [n, onIndexChange, safeIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null || n <= 1) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (dx < -SWIPE_THRESHOLD_PX) goNext();
    else if (dx > SWIPE_THRESHOLD_PX) goPrev();
  };

  if (n === 0 || !src) return null;

  const rootClass =
    variant === "embedded"
      ? "gallery-detail-carousel gallery-detail-carousel--embedded"
      : "gallery-detail-carousel gallery-detail-carousel--fullscreen";

  return (
    <div
      className={rootClass}
      role="region"
      aria-roledescription="carousel"
      aria-label="Post images"
    >
      <div
        className="gallery-detail-carousel__viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {n > 1 ? (
          <>
            <button
              type="button"
              className="gallery-detail-carousel__nav gallery-detail-carousel__nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              disabled={safeIndex <= 0}
              aria-label="Previous image"
            >
              <ChevronLeft size={variant === "fullscreen" ? 36 : 28} />
            </button>
            <button
              type="button"
              className="gallery-detail-carousel__nav gallery-detail-carousel__nav--next"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              disabled={safeIndex >= n - 1}
              aria-label="Next image"
            >
              <ChevronRight size={variant === "fullscreen" ? 36 : 28} />
            </button>
          </>
        ) : null}
        {onImageClick ? (
          <button
            type="button"
            className="gallery-detail-carousel__stage"
            onClick={() => onImageClick()}
            aria-label="Open full image preview"
          >
            <GalleryHeicImage
              key={src}
              src={src}
              alt=""
              className="gallery-detail-carousel__img"
            />
          </button>
        ) : (
          <div
            className="gallery-detail-carousel__stage gallery-detail-carousel__stage--static"
            role="img"
            aria-label={`Image ${safeIndex + 1} of ${n}`}
          >
            <GalleryHeicImage
              key={src}
              src={src}
              alt=""
              className="gallery-detail-carousel__img"
            />
          </div>
        )}
      </div>
      {n > 1 ? (
        <p className="gallery-detail-carousel__counter" aria-live="polite">
          {safeIndex + 1} / {n}
        </p>
      ) : null}
    </div>
  );
}
