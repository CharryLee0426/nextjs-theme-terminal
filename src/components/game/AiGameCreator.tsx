"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  Gamepad2,
  Heart,
  LoaderCircle,
  Send,
  Upload,
  X,
} from "lucide-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useAppToast } from "@/components/ToastProvider";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  details?: string[];
};

type DraftGame = {
  gameName: string;
  slug: string;
  fileName: string;
  analysisFileName: string;
  analysisMarkdown: string;
  html: string;
  imageUrl: string;
  imageSource: string;
  imageNote?: string | null;
  prompt: string;
  visibleProcess: string[];
  verificationConclusion: "PASS" | "FAIL";
  verificationReasons: string[];
  skillPath: string;
  openAiModel: string;
};

type PublishedGame = {
  _id: Id<"games">;
  name: string;
  prompt: string;
  createdAt: number;
  likes: number;
  htmlUrl: string | null;
  analysisUrl?: string | null;
  htmlFileName?: string;
  analysisFileName?: string;
  imageUrl: string | null;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AiGameCreator() {
  const toast = useAppToast();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const games = useQuery(api.games.listPublished) as PublishedGame[] | undefined;
  const likeGame = useMutation(api.games.like);
  const generateUploadUrl = useMutation(api.games.generateUploadUrl);
  const createGame = useMutation(api.games.createGame);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<DraftGame | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [submitImageFile, setSubmitImageFile] = useState<File | null>(null);
  const [submitImagePreviewUrl, setSubmitImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConversation = messages.length > 0;
  const canSubmit = Boolean(draft) && !isSubmitting && !authLoading;
  const sortedGames = useMemo(() => games ?? [], [games]);

  useEffect(() => {
    if (!submitImageFile) {
      setSubmitImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(submitImageFile);
    setSubmitImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [submitImageFile]);

  const uploadBlob = async (blob: Blob, contentType: string) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!response.ok) {
      throw new Error("Upload to Convex storage failed.");
    }
    const payload = (await response.json()) as { storageId: string };
    return payload.storageId;
  };

  const generateGame = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const nextPrompt = prompt.trim();
    if (!nextPrompt || isGenerating) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: nextPrompt,
    };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsGenerating(true);
    setGenerationStatus(draft ? "Editing game" : "Generating game");

    try {
      const response = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nextPrompt,
          previousHtml: draft?.html,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Game generation failed.");
      }

      const nextDraft: DraftGame = {
        gameName: payload.gameName,
        slug: payload.slug,
        fileName: payload.fileName,
        analysisFileName: payload.analysisFileName,
        analysisMarkdown: payload.analysisMarkdown,
        html: payload.html,
        imageUrl: payload.imageUrl,
        imageSource: payload.imageSource,
        imageNote: payload.imageNote,
        prompt: nextPrompt,
        visibleProcess: payload.visibleProcess,
        verificationConclusion: payload.verificationConclusion,
        verificationReasons: payload.verificationReasons,
        skillPath: payload.skillPath,
        openAiModel: payload.openAiModel,
      };

      setDraft(nextDraft);
      setSubmitName(payload.gameName);
      setSubmitImageFile(null);
      const trace = [
        `Model: ${payload.openAiModel}`,
        `Skill: ${payload.skillPath}`,
        ...(Array.isArray(payload.visibleProcess) ? payload.visibleProcess : []),
        `Verification: ${payload.verificationConclusion}`,
        ...(Array.isArray(payload.verificationReasons) ? payload.verificationReasons : []),
      ];
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: payload.imageNote
            ? `Generated ${payload.gameName}. ${payload.imageNote}`
            : `Generated ${payload.gameName}. Preview it, submit it, or keep editing by chat.`,
          details: trace,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game generation failed.";
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: message },
      ]);
      toast.show(message, "error");
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  const submitGame = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || isSubmitting) return;
    if (!isAuthenticated) {
      toast.show("Sign in before submitting a game.", "error");
      return;
    }

    const name = submitName.trim();
    if (!name) {
      toast.show("Game name is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const htmlBlob = new Blob([draft.html], { type: "text/html;charset=utf-8" });
      const htmlId = await uploadBlob(htmlBlob, "text/html;charset=utf-8");
      const analysisBlob = new Blob([draft.analysisMarkdown], { type: "text/markdown;charset=utf-8" });
      const analysisId = await uploadBlob(analysisBlob, "text/markdown;charset=utf-8");

      let imageBlob: Blob;
      if (submitImageFile) {
        imageBlob = submitImageFile;
      } else {
        const imageResponse = await fetch(`/api/games/image?url=${encodeURIComponent(draft.imageUrl)}`);
        if (!imageResponse.ok) {
          const payload = await imageResponse.json().catch(() => ({}));
          throw new Error(payload.error || "Could not download game intro image.");
        }
        imageBlob = await imageResponse.blob();
      }
      const imageId = await uploadBlob(imageBlob, imageBlob.type || "image/png");

      await createGame({
        name,
        slug: draft.slug,
        prompt: draft.prompt,
        htmlId: htmlId as Id<"_storage">,
        analysisId: analysisId as Id<"_storage">,
        htmlFileName: draft.fileName,
        analysisFileName: draft.analysisFileName,
        imageId: imageId as Id<"_storage">,
      });

      setSubmitOpen(false);
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: `${name} was submitted and published.` },
      ]);
      toast.show("Game submitted.", "info");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Game submission failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPublishedGame = async (game: PublishedGame) => {
    if (!game.htmlUrl) {
      toast.show("Published game HTML is unavailable.", "error");
      return;
    }

    try {
      const response = await fetch(game.htmlUrl);
      if (!response.ok) {
        throw new Error("Could not load published game.");
      }
      setPreviewHtml(await response.text());
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not load published game.", "error");
    }
  };

  const downloadBlob = (content: string, fileName: string, contentType: string) => {
    const objectUrl = URL.createObjectURL(new Blob([content], { type: contentType }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const downloadDraftHtml = () => {
    if (!draft) return;
    downloadBlob(draft.html, draft.fileName, "text/html;charset=utf-8");
  };

  const downloadDraftAnalysis = () => {
    if (!draft) return;
    downloadBlob(draft.analysisMarkdown, draft.analysisFileName, "text/markdown;charset=utf-8");
  };

  const returnToGameHome = () => {
    setPrompt("");
    setMessages([]);
    setDraft(null);
    setGenerationStatus("");
    setPreviewHtml(null);
    setSubmitOpen(false);
    setSubmitName("");
    setSubmitImageFile(null);
  };

  return (
    <section className="game-page" aria-label="AI Game Creator">
      <div className={isConversation ? "game-chat game-chat--active" : "game-chat"}>
        {!isConversation && (
          <div className="game-chat__intro">
            <Gamepad2 size={34} aria-hidden="true" />
            <h1>AI Game Creator</h1>
          </div>
        )}

        {isConversation && (
          <div className="game-chat__conversation">
            <div className="game-chat__bar">
              <button type="button" onClick={returnToGameHome} className="game-chat__back">
                <ArrowLeft size={18} />
                <span>Back to games</span>
              </button>
            </div>

            <div className="game-chat__messages" aria-live="polite">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={message.role === "user" ? "game-message game-message--user" : "game-message game-message--assistant"}
                >
                  <p>{message.content}</p>
                  {message.details && message.details.length > 0 && (
                    <ol className="game-message__details">
                      {message.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ol>
                  )}
                </article>
              ))}

              {draft && (
                <article className="game-result-card" aria-label="Generated game result">
                  <div className="game-result-card__image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.imageUrl} alt={`${draft.gameName} intro`} />
                  </div>
                  <div className="game-result-card__body">
                    <h2>{draft.gameName}</h2>
                    <p>{draft.analysisFileName} + {draft.fileName}</p>
                    <details className="game-result-card__details">
                      <summary>Analysis markdown</summary>
                      <pre>{draft.analysisMarkdown}</pre>
                    </details>
                    <div className="game-result-card__actions">
                      <button type="button" onClick={() => setPreviewHtml(draft.html)}>
                        Preview
                      </button>
                      <button type="button" onClick={() => setSubmitOpen(true)} disabled={!canSubmit}>
                        Submit
                      </button>
                      <button type="button" onClick={downloadDraftAnalysis}>
                        Save MD
                      </button>
                      <button type="button" onClick={downloadDraftHtml}>
                        Save HTML
                      </button>
                    </div>
                  </div>
                </article>
              )}

              {isGenerating && (
                <div className="game-chat__loading" role="status">
                  <LoaderCircle size={20} />
                  <span>{generationStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form className="game-prompt" onSubmit={generateGame}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void generateGame();
              }
            }}
            placeholder={draft ? "Ask for edits to the generated game" : "Describe the mini game you want to create"}
            disabled={isGenerating}
            rows={1}
            aria-label="Game prompt"
          />
          <button type="submit" disabled={isGenerating || !prompt.trim()} aria-label="Generate game" title="Generate">
            {isGenerating ? <LoaderCircle size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>

      {!isConversation && (
        <section className="game-library" aria-label="Published games">
          <div className="game-library__header">
            <h2>Published Games</h2>
            <span>{sortedGames.length} total</span>
          </div>

          {games === undefined ? (
            <div className="game-library__empty">
              <LoaderCircle size={22} />
              <span>Loading games</span>
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="game-library__empty">No published games yet.</div>
          ) : (
            <div className="game-grid">
              {sortedGames.map((game) => (
                <article key={game._id} className="published-game-card">
                  <button
                    type="button"
                    className="published-game-card__image"
                    onClick={() => void previewPublishedGame(game)}
                    aria-label={`Preview ${game.name}`}
                  >
                    {game.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={game.imageUrl} alt={`${game.name} intro`} />
                    ) : (
                      <Gamepad2 size={36} />
                    )}
                  </button>
                  <div className="published-game-card__body">
                    <h3>{game.name}</h3>
                    <time dateTime={new Date(game.createdAt).toISOString()}>
                      {format(new Date(game.createdAt), "MMM d, yyyy HH:mm")}
                    </time>
                    <div className="published-game-card__actions">
                      <button type="button" onClick={() => void likeGame({ gameId: game._id })}>
                        <Heart size={16} />
                        <span>{game.likes}</span>
                      </button>
                      {game.htmlUrl && (
                        <Link href={game.htmlUrl} target="_blank" rel="noopener">
                          <ExternalLink size={16} />
                        </Link>
                      )}
                      {game.analysisUrl && (
                        <Link href={game.analysisUrl} target="_blank" rel="noopener" title={game.analysisFileName || "Analysis"}>
                          MD
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {previewHtml && (
        <div
          className="game-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Game preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewHtml(null);
          }}
        >
          <div className="game-preview-modal__window">
            <button
              type="button"
              className="game-preview-modal__close"
              onClick={() => setPreviewHtml(null)}
              aria-label="Close preview"
            >
              <X size={22} />
            </button>
            <div className="game-preview-modal__stage">
              <iframe title="Generated game preview" srcDoc={previewHtml} sandbox="allow-scripts" />
            </div>
          </div>
        </div>
      )}

      {submitOpen && draft && (
        <div
          className="game-submit-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Submit game"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) setSubmitOpen(false);
          }}
        >
          <form className="game-submit-form" onSubmit={submitGame}>
            <button
              type="button"
              className="game-submit-form__close"
              onClick={() => setSubmitOpen(false)}
              disabled={isSubmitting}
              aria-label="Close submit form"
            >
              <X size={22} />
            </button>
            <h2>Submit Game</h2>
            {!isAuthenticated && (
              <p className="game-submit-form__notice">Sign in is required before publishing.</p>
            )}
            <label>
              <span>Game name</span>
              <input
                value={submitName}
                onChange={(event) => setSubmitName(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </label>
            <label>
              <span>Game intro image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSubmitImageFile(event.target.files?.[0] ?? null)}
                disabled={isSubmitting}
              />
            </label>
            <div className="game-submit-form__preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submitImagePreviewUrl || draft.imageUrl}
                alt="Selected game intro"
              />
            </div>
            <button type="submit" disabled={!canSubmit || !isAuthenticated}>
              {isSubmitting ? <LoaderCircle size={18} /> : <Upload size={18} />}
              <span>Submit</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
