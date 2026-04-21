"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  GALLERY_BODY_PREVIEW_MAX,
  GALLERY_TITLE_PREVIEW_MAX,
  truncateText,
} from "@/lib/galleryText";
import { GalleryDetailOverlay } from "./GalleryDetailOverlay";
import { GalleryHeicImage } from "./GalleryHeicImage";
import { GalleryUploadModal } from "./GalleryUploadModal";

export function GalleryView() {
  const posts = useQuery(api.gallery.listPosts);
  const likeMut = useMutation(api.gallery.like);
  const dislikeMut = useMutation(api.gallery.dislike);

  const [detailId, setDetailId] = useState<Id<"galleryPosts"> | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState<Id<"galleryPosts"> | null>(null);
  const [dislikeBusy, setDislikeBusy] = useState<Id<"galleryPosts"> | null>(
    null,
  );

  const detailPost =
    posts?.find((p) => p._id === detailId) ?? null;

  if (posts === undefined) {
    return (
      <div className="gallery-loading">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">loading gallery…</span>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="page framed gallery-intro">
        <h1>Gallery</h1>
        <p>
          Scroll horizontally: newest posts are on the left. Tap a card to open
          a larger detail view. Anyone can like or dislike a post.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="gallery-empty">
          No posts yet — use the + button in the bottom-left corner to add one.
        </p>
      ) : (
        <div className="gallery-scroll-wrap">
          <div className="gallery-scroll" aria-label="画廊时间轴">
            <div className="gallery-track">
              {posts.map((post, index) => {
                const cover = post.imageUrls[0];
                const titlePrev = truncateText(
                  post.title,
                  GALLERY_TITLE_PREVIEW_MAX,
                );
                const textPrev = truncateText(
                  post.text,
                  GALLERY_BODY_PREVIEW_MAX,
                );
                return (
                  <div key={post._id} className="gallery-node">
                    <div
                      role="button"
                      tabIndex={0}
                      className="gallery-card"
                      aria-label={`Open post: ${post.title}`}
                      onClick={() => setDetailId(post._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailId(post._id);
                        }
                      }}
                    >
                      <div
                        className={
                          cover
                            ? "gallery-card__media"
                            : "gallery-card__media gallery-card__media--empty"
                        }
                      >
                        {cover ? (
                          <GalleryHeicImage
                            src={cover}
                            alt=""
                            className="gallery-card__cover"
                          />
                        ) : null}
                      </div>
                      <div className="gallery-card__body">
                        <h2 className="gallery-card__title">{titlePrev}</h2>
                        <p className="gallery-card__excerpt">{textPrev}</p>
                        <time
                          className="gallery-card__time"
                          dateTime={new Date(post.displayAt).toISOString()}
                        >
                          {format(post.displayAt, "PP", { locale: enUS })}
                        </time>
                        <div
                          className="gallery-card__votes"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="gallery-vote-btn"
                            aria-label="Like"
                            disabled={likeBusy === post._id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLikeBusy(post._id);
                              try {
                                await likeMut({ postId: post._id });
                              } finally {
                                setLikeBusy(null);
                              }
                            }}
                          >
                            <ThumbsUp size={16} />
                            <span>{post.likes}</span>
                          </button>
                          <button
                            type="button"
                            className="gallery-vote-btn"
                            aria-label="Dislike"
                            disabled={dislikeBusy === post._id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDislikeBusy(post._id);
                              try {
                                await dislikeMut({ postId: post._id });
                              } finally {
                                setDislikeBusy(null);
                              }
                            }}
                          >
                            <ThumbsDown size={16} />
                            <span>{post.dislikes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`gallery-foot${
                        index === 0 ? " gallery-foot--first" : ""
                      }${index === posts.length - 1 ? " gallery-foot--last" : ""}`}
                      aria-hidden
                    >
                      <span className="gallery-foot__line" />
                      <span className="gallery-foot__dot" />
                      <span className="gallery-foot__line" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="gallery-fab"
        aria-label="Add post"
        onClick={() => setUploadOpen(true)}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <GalleryUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      <GalleryDetailOverlay
        post={detailPost}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
