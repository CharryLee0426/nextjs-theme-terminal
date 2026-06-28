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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  generated?: true;
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

type AssistantReply = {
  generated: false;
  intent: string;
  message: string;
  visibleProcess: string[];
  openAiModel: string;
};

type AgentProgressItem = {
  id: string;
  label: string;
  detail?: string;
};

type AgentProgressEvent = {
  type: "progress";
  event: string;
  details?: Record<string, unknown>;
};

type AgentCompleteEvent = {
  type: "complete";
  draft: DraftGame;
};

type AgentReplyEvent = {
  type: "reply";
  reply: AssistantReply;
};

type AgentErrorEvent = {
  type: "error";
  error: string;
};

type AgentStreamEvent = AgentProgressEvent | AgentCompleteEvent | AgentReplyEvent | AgentErrorEvent;

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

function formatAgentProgress(
  event: string,
  details: Record<string, unknown> = {},
): { label: string; detail?: string } | null {
  const stringValue = (key: string) =>
    typeof details[key] === "string" ? details[key] : undefined;
  const numberValue = (key: string) =>
    typeof details[key] === "number" ? details[key] : undefined;

  switch (event) {
    case "stream:start":
      return { label: "Starting agent workflow" };
    case "skill:load:start":
      return { label: "Loading minigame skill" };
    case "skill:load:complete":
      return { label: "Skill loaded", detail: "Analysis template ready" };
    case "workflow:start":
      return {
        label: stringValue("mode") === "edit" ? "Preparing game edit" : "Preparing new game",
        detail: `Model: ${stringValue("model") ?? "default"}`,
      };
    case "intent:start":
      return { label: "Classifying request intent" };
    case "intent:complete":
      return {
        label: `Intent: ${stringValue("intent") ?? "classified"}`,
      };
    case "answer:start":
      return { label: "Answering harmless question" };
    case "answer:complete":
      return { label: "Answer ready" };
    case "planner:start":
      return { label: "Planning game design" };
    case "planner:complete":
      return {
        label: `Analysis created for ${stringValue("gameName") ?? "game"}`,
        detail: [stringValue("analysisFileName"), stringValue("fileName")]
          .filter(Boolean)
          .join(" + "),
      };
    case "builder:start":
      return { label: "Building playable HTML", detail: stringValue("fileName") };
    case "builder:complete": {
      const htmlChars = numberValue("htmlChars");
      return {
        label: "Standalone game file generated",
        detail: htmlChars ? `${htmlChars.toLocaleString()} HTML characters` : undefined,
      };
    }
    case "verifier:start":
      return { label: "Verifying game package" };
    case "verifier:complete":
      return {
        label: `Verification ${stringValue("verificationConclusion") ?? "complete"}`,
        detail: Array.isArray(details.verificationReasons)
          ? details.verificationReasons.join("; ")
          : undefined,
      };
    case "cover:start":
      return { label: "Preparing cover image", detail: stringValue("provider") };
    case "cover:complete":
      return { label: "Cover image ready", detail: stringValue("source") };
    case "workflow:complete":
      return {
        label: `Agent workflow complete for ${stringValue("gameName") ?? "game"}`,
        detail: stringValue("verificationConclusion"),
      };
    case "response:success":
      return { label: "Packaging generated files" };
    case "response:assistant_reply":
      return {
        label: "Replying without game generation",
        detail: stringValue("intent"),
      };
    default:
      if (event.endsWith(":visibleProcess") && typeof details.step === "string") {
        return { label: details.step };
      }
      return null;
  }
}

function safeMarkdownHref(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [, rawToken, linkText, rawHref, strongText] = match;
    if (linkText && rawHref) {
      const href = safeMarkdownHref(rawHref);
      if (href) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>,
        );
      } else {
        nodes.push(rawToken);
      }
    } else if (strongText) {
      nodes.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{strongText}</strong>);
    } else {
      nodes.push(rawToken);
    }

    lastIndex = match.index + rawToken.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function ChatMessageContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/);

  return (
    <div className="game-message__content">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split("\n");
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 12)}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${paragraphIndex}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInlineMarkdown(line, `${paragraphIndex}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AiGameCreator() {
  const toast = useAppToast();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const games = useQuery(api.games.listPublished) as PublishedGame[] | undefined;
  const viewer = useQuery(api.account.viewer);
  const likeGame = useMutation(api.games.like);
  const generateUploadUrl = useMutation(api.games.generateUploadUrl);
  const createGame = useMutation(api.games.createGame);
  const deleteGame = useMutation(api.games.deleteGame);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<DraftGame | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [agentProgress, setAgentProgress] = useState<AgentProgressItem[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [submitImageFile, setSubmitImageFile] = useState<File | null>(null);
  const [submitImagePreviewUrl, setSubmitImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<Id<"games"> | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const isConversation = messages.length > 0;
  const canSubmit = Boolean(draft) && !isSubmitting && !authLoading;
  const canDeleteGames = viewer != null && viewer.role === "admin";
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

  const focusPreviewFrame = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;

    frame.focus();
    if (process.env.NODE_ENV !== "test") {
      try {
        frame.contentWindow?.focus();
      } catch {
        // Cross-document focus can fail in some browser/sandbox combinations.
      }
    }
  }, []);

  useEffect(() => {
    if (!previewHtml) return;

    const frameId = window.requestAnimationFrame(focusPreviewFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, [focusPreviewFrame, previewHtml]);

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

  const addAgentProgress = (eventName: string, details?: Record<string, unknown>) => {
    const formatted = formatAgentProgress(eventName, details);
    if (!formatted) return;
    setGenerationStatus(formatted.label);
    setAgentProgress((current) => {
      const nextItem = { id: makeId(), ...formatted };
      const last = current[current.length - 1];
      if (last?.label === nextItem.label && last.detail === nextItem.detail) return current;
      return [...current, nextItem].slice(-12);
    });
  };

  const readGenerationStream = async (response: Response) => {
    if (!response.body) {
      throw new Error("Game generation stream was unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completedDraft: DraftGame | null = null;
    let assistantReply: AssistantReply | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const streamEvent = JSON.parse(line) as AgentStreamEvent;

        if (streamEvent.type === "progress") {
          addAgentProgress(streamEvent.event, streamEvent.details);
        } else if (streamEvent.type === "complete") {
          completedDraft = streamEvent.draft;
        } else if (streamEvent.type === "reply") {
          assistantReply = streamEvent.reply;
        } else if (streamEvent.type === "error") {
          throw new Error(streamEvent.error);
        }
      }
    }

    if (buffer.trim()) {
      const streamEvent = JSON.parse(buffer) as AgentStreamEvent;
      if (streamEvent.type === "complete") {
        completedDraft = streamEvent.draft;
      } else if (streamEvent.type === "reply") {
        assistantReply = streamEvent.reply;
      } else if (streamEvent.type === "error") {
        throw new Error(streamEvent.error);
      } else if (streamEvent.type === "progress") {
        addAgentProgress(streamEvent.event, streamEvent.details);
      }
    }

    if (assistantReply) {
      return assistantReply;
    }

    if (!completedDraft) {
      throw new Error("Game generation finished without a draft or reply.");
    }

    return completedDraft;
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
    setAgentProgress([
      {
        id: makeId(),
        label: draft ? "Editing game" : "Generating game",
      },
    ]);

    try {
      const response = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nextPrompt,
          previousHtml: draft?.html,
          previousGame: draft
            ? {
                gameName: draft.gameName,
                slug: draft.slug,
                fileName: draft.fileName,
                analysisFileName: draft.analysisFileName,
                analysisMarkdown: draft.analysisMarkdown,
              }
            : undefined,
          stream: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Game generation failed.");
      }

      const result = await readGenerationStream(response);

      if (result.generated === false) {
        setMessages((current) => [
          ...current,
          {
            id: makeId(),
            role: "assistant",
            content: result.message,
          },
        ]);
        return;
      }

      const nextDraft = result;
      nextDraft.prompt = nextPrompt;

      setDraft(nextDraft);
      setSubmitName(nextDraft.gameName);
      setSubmitImageFile(null);
      const trace = [
        `Model: ${nextDraft.openAiModel}`,
        `Skill: ${nextDraft.skillPath}`,
        ...(Array.isArray(nextDraft.visibleProcess) ? nextDraft.visibleProcess : []),
        `Verification: ${nextDraft.verificationConclusion}`,
        ...(Array.isArray(nextDraft.verificationReasons) ? nextDraft.verificationReasons : []),
      ];
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: nextDraft.imageNote
            ? `Generated ${nextDraft.gameName}. ${nextDraft.imageNote}`
            : `Generated ${nextDraft.gameName}. Preview it, submit it, or keep editing by chat.`,
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

  const deletePublishedGame = async (game: PublishedGame) => {
    if (deletingGameId) return;
    const confirmed = window.confirm(`Delete "${game.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingGameId(game._id);
    try {
      await deleteGame({ gameId: game._id });
      toast.show("Game deleted.", "info");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Game deletion failed.", "error");
    } finally {
      setDeletingGameId(null);
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
    setAgentProgress([]);
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
                  <ChatMessageContent content={message.content} />
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
                  <div className="game-chat__loading-heading">
                    <LoaderCircle size={20} />
                    <span>{generationStatus}</span>
                  </div>
                  {agentProgress.length > 0 && (
                    <ol className="game-agent-progress" aria-label="Agent progress">
                      {agentProgress.map((item) => (
                        <li key={item.id}>
                          <span>{item.label}</span>
                          {item.detail && <small>{item.detail}</small>}
                        </li>
                      ))}
                    </ol>
                  )}
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
                      {canDeleteGames && (
                        <button
                          type="button"
                          className="published-game-card__delete"
                          onClick={() => void deletePublishedGame(game)}
                          disabled={deletingGameId === game._id}
                          aria-label={`Delete ${game.name}`}
                          title="Delete game"
                        >
                          {deletingGameId === game._id ? (
                            <LoaderCircle size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
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
              <iframe
                ref={previewFrameRef}
                title="Generated game preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-pointer-lock"
                allow="gamepad; fullscreen"
                allowFullScreen
                tabIndex={0}
                onLoad={focusPreviewFrame}
                onPointerDown={focusPreviewFrame}
              />
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
