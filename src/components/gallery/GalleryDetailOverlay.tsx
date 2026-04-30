"use client";

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GalleryDetailImageCarousel } from "./GalleryDetailImageCarousel";

export type GalleryPostClient = {
  _id: Id<"galleryPosts">;
  title: string;
  text: string;
  displayAt: number;
  likes: number;
  dislikes: number;
  imageUrls: string[];
};

type Props = {
  post: GalleryPostClient | null;
  onClose: () => void;
};

export function GalleryDetailOverlay({ post, onClose }: Props) {
  const likeMut = useMutation(api.gallery.like);
  const dislikeMut = useMutation(api.gallery.dislike);
  const [likeBusy, setLikeBusy] = useState(false);
  const [dislikeBusy, setDislikeBusy] = useState(false);

  const [slideIndex, setSlideIndex] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    setSlideIndex(0);
    setImagePreviewOpen(false);
  }, [post?._id]);

  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (imagePreviewOpen) {
          e.preventDefault();
          setImagePreviewOpen(false);
          return;
        }
        onClose();
        return;
      }
      const count = post.imageUrls.length;
      if (count <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSlideIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSlideIndex((i) => Math.min(count - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post, onClose, imagePreviewOpen]);

  if (!post) return null;

  const onLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      await likeMut({ postId: post._id });
    } finally {
      setLikeBusy(false);
    }
  };

  const onDislike = async () => {
    if (dislikeBusy) return;
    setDislikeBusy(true);
    try {
      await dislikeMut({ postId: post._id });
    } finally {
      setDislikeBusy(false);
    }
  };

  const hasImages = post.imageUrls.length > 0;

  return (
    <>
      <div
        className="gallery-modal-backdrop gallery-detail-backdrop"
        role="presentation"
        onMouseDown={(ev) => {
          if (ev.target === ev.currentTarget) onClose();
        }}
      >
        <div
          className="gallery-detail-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-detail-title"
        >
          <button
            type="button"
            className="gallery-detail-close gallery-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
          <div className="gallery-detail-inner">
            {hasImages ? (
              <GalleryDetailImageCarousel
                imageUrls={post.imageUrls}
                index={slideIndex}
                onIndexChange={setSlideIndex}
                variant="embedded"
                onImageClick={() => setImagePreviewOpen(true)}
              />
            ) : null}
            <div className="gallery-detail-body">
              <p className="gallery-detail-time">
                {format(post.displayAt, "PPpp", { locale: enUS })}
              </p>
              <h2 id="gallery-detail-title">{post.title}</h2>
              <p className="gallery-detail-text">{post.text}</p>
              <div className="gallery-card__votes gallery-detail-votes">
                <button
                  type="button"
                  className="gallery-vote-btn"
                  onClick={onLike}
                  disabled={likeBusy}
                  aria-label="Like"
                >
                  <ThumbsUp size={18} />
                  <span>{post.likes}</span>
                </button>
                <button
                  type="button"
                  className="gallery-vote-btn"
                  onClick={onDislike}
                  disabled={dislikeBusy}
                  aria-label="Dislike"
                >
                  <ThumbsDown size={18} />
                  <span>{post.dislikes}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {imagePreviewOpen && hasImages ? (
        <div
          className="gallery-fullscreen-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setImagePreviewOpen(false);
          }}
        >
          <button
            type="button"
            className="gallery-fullscreen-preview__close gallery-icon-btn"
            onClick={() => setImagePreviewOpen(false)}
            aria-label="Close preview"
          >
            <X size={26} />
          </button>
          <div
            className="gallery-fullscreen-preview__inner"
            onClick={(e) => e.stopPropagation()}
          >
            <GalleryDetailImageCarousel
              imageUrls={post.imageUrls}
              index={slideIndex}
              onIndexChange={setSlideIndex}
              variant="fullscreen"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
