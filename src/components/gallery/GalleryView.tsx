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
import { usePhysicalBadgeDrag } from "./usePhysicalBadgeDrag";

type GalleryPost = {
  _id: Id<"galleryPosts">;
  title: string;
  text: string;
  displayAt: number;
  likes: number;
  dislikes: number;
  imageUrls: string[];
};

type GalleryBadgeItemProps = {
  post: GalleryPost;
  likeBusy: Id<"galleryPosts"> | null;
  dislikeBusy: Id<"galleryPosts"> | null;
  likeMut: (args: { postId: Id<"galleryPosts"> }) => Promise<unknown>;
  dislikeMut: (args: { postId: Id<"galleryPosts"> }) => Promise<unknown>;
  onOpen: (id: Id<"galleryPosts">) => void;
  setLikeBusy: (id: Id<"galleryPosts"> | null) => void;
  setDislikeBusy: (id: Id<"galleryPosts"> | null) => void;
};

function GalleryBadgeItem({
  post,
  likeBusy,
  dislikeBusy,
  likeMut,
  dislikeMut,
  onOpen,
  setLikeBusy,
  setDislikeBusy,
}: GalleryBadgeItemProps) {
  const drag = usePhysicalBadgeDrag<HTMLDivElement>({
    ignoreSelector: ".gallery-vote-btn",
    onTap: () => onOpen(post._id),
  });

  const cover = post.imageUrls[0];
  const titlePrev = truncateText(post.title, GALLERY_TITLE_PREVIEW_MAX);
  const textPrev = truncateText(post.text, GALLERY_BODY_PREVIEW_MAX);
  const displayDate = format(post.displayAt, "PP", {
    locale: enUS,
  });

  return (
    <div className="gallery-node">
      <div
        ref={drag.ref}
        role="button"
        tabIndex={0}
        className="gallery-badge-card"
        aria-label={`Open post: ${post.title}`}
        onClickCapture={drag.onClickCapture}
        onPointerCancel={drag.onPointerCancel}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(post._id);
          }
        }}
      >
        <div className="gallery-badge-lanyard" aria-hidden>
          <span>terminal</span>
          <b>24</b>
        </div>
        <span className="gallery-badge-ring" aria-hidden />
        <span className="gallery-badge-hole" aria-hidden />
        <div
          className={
            cover
              ? "gallery-badge-card__media"
              : "gallery-badge-card__media gallery-badge-card__media--empty"
          }
        >
          {cover ? (
            <GalleryHeicImage
              src={cover}
              alt=""
              className="gallery-badge-card__cover"
            />
          ) : (
            <span className="gallery-img-fallback">No image</span>
          )}
        </div>
        <div className="gallery-badge-card__body">
          <h2 className="gallery-badge-card__title">{titlePrev}</h2>
          <p className="gallery-badge-card__excerpt">{textPrev}</p>
          <time
            className="gallery-badge-card__time"
            dateTime={new Date(post.displayAt).toISOString()}
          >
            {displayDate}
          </time>
          <div
            className="gallery-badge-card__votes"
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
    </div>
  );
}

export function GalleryView() {
  const posts = useQuery(api.gallery.listPosts);
  const viewer = useQuery(api.account.viewer);
  const likeMut = useMutation(api.gallery.like);
  const dislikeMut = useMutation(api.gallery.dislike);

  const canPost = viewer != null && viewer.role === "admin";

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
      {posts.length === 0 ? (
        <p className="gallery-empty">
          {canPost
            ? "No posts yet — use the + button in the bottom-left corner to add one."
            : "No posts yet."}
        </p>
      ) : (
        <div className="gallery-scroll-wrap">
          <div className="gallery-scroll" aria-label="画廊时间轴">
            <div className="gallery-track">
              {posts.map((post) => (
                <GalleryBadgeItem
                  key={post._id}
                  post={post}
                  likeBusy={likeBusy}
                  dislikeBusy={dislikeBusy}
                  likeMut={likeMut}
                  dislikeMut={dislikeMut}
                  onOpen={setDetailId}
                  setLikeBusy={setLikeBusy}
                  setDislikeBusy={setDislikeBusy}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {canPost ? (
        <button
          type="button"
          className="gallery-fab"
          aria-label="Add post"
          onClick={() => setUploadOpen(true)}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      ) : null}

      <GalleryUploadModal
        open={uploadOpen && canPost}
        onClose={() => setUploadOpen(false)}
      />

      <GalleryDetailOverlay
        post={detailPost}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
