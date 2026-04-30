"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X } from "lucide-react";
import { normalizeImageFileForUpload } from "@/lib/heicNormalize";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function GalleryUploadModal({ open, onClose }: Props) {
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const createPost = useMutation(api.gallery.createPost);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [displayAtLocal, setDisplayAtLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setText("");
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDisplayAtLocal(d.toISOString().slice(0, 16));
    setFiles([]);
    setError(null);
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !text.trim()) {
      setError("Title and text are required.");
      return;
    }
    if (files.length === 0) {
      setError("Please add at least one image.");
      return;
    }
    setSubmitting(true);
    try {
      const imageIds: Id<"_storage">[] = [];
      for (const file of files) {
        const toUpload = await normalizeImageFileForUpload(file);
        const postUrl = await generateUploadUrl();
        const res = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": toUpload.type || "application/octet-stream",
          },
          body: toUpload,
        });
        if (!res.ok) {
          throw new Error("Image upload failed. Please try again.");
        }
        const json = (await res.json()) as { storageId: string };
        imageIds.push(json.storageId as Id<"_storage">);
      }
      const displayAt = new Date(displayAtLocal).getTime();
      await createPost({
        title: title.trim(),
        text: text.trim(),
        imageIds,
        displayAt,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="gallery-modal-backdrop"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) handleClose();
      }}
    >
      <div
        className="gallery-modal gallery-upload-modal"
        role="dialog"
        aria-labelledby="gallery-upload-title"
        aria-modal="true"
      >
        <div className="gallery-modal__head">
          <h2 id="gallery-upload-title">New gallery post</h2>
          <button
            type="button"
            className="gallery-icon-btn"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form className="gallery-upload-form" onSubmit={onSubmit}>
          <label className="gallery-field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={submitting}
              required
            />
          </label>
          <label className="gallery-field">
            <span>Text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              disabled={submitting}
              required
            />
          </label>
          <label className="gallery-field">
            <span>Display time (used for sorting; newest appears on the left)</span>
            <input
              type="datetime-local"
              value={displayAtLocal}
              onChange={(e) => setDisplayAtLocal(e.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <label className="gallery-field">
            <span>Images (at least one)</span>
            <input
              type="file"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              multiple
              disabled={submitting}
              onChange={(e) =>
                setFiles(e.target.files ? Array.from(e.target.files) : [])
              }
            />
          </label>
          {error ? <p className="gallery-upload-error">{error}</p> : null}
          <div className="gallery-upload-actions">
            <button
              type="button"
              className="gallery-btn gallery-btn--ghost"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gallery-btn gallery-btn--primary"
              disabled={submitting}
            >
              {submitting ? "Publishing…" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
