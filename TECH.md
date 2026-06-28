# Technical Documentation

This document provides an overview of the website's architecture, the technology stack it employs, and the core functionality implementations.

## Technology Stack

The website is built using a modern, performance-oriented stack centered around the React ecosystem:

*   **Framework**: [Next.js (v15.5)](https://nextjs.org/) using the **App Router** for layout-based routing and Server Components.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) for static typing and enhanced developer experience.
*   **UI Library**: [React 19](https://react.dev/) for building user interfaces.
*   **Styling**: 
    *   [Tailwind CSS (v4)](https://tailwindcss.com/) for utility-first styling.
    *   `clsx` and `tailwind-merge` for conditional and merged class name handling.
*   **Content Processing**:
    *   [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) for rendering MDX content securely on the server.
    *   [gray-matter](https://github.com/jonschlinkert/gray-matter) for parsing markdown file frontmatter.
    *   `remark` (remark-gfm, remark-math) and `rehype` (rehype-katex, rehype-slug, rehype-highlight) ecosystems for markdown processing, including GitHub Flavored Markdown, Math formatting (KaTeX), and syntax highlighting.
    *   `reading-time` for calculating estimated time to read.
*   **Icons**: [Lucide React](https://lucide.dev/) for crisp, customizable SVG icons.
*   **AI generation**: OpenAI Agents SDK for AI Game Creator planning, standalone HTML generation, and verification.
*   **Image generation**: [@fal-ai/client](https://fal.ai/) for server-side fal.ai image-to-image requests used by Magic Canvas.
*   **Date Formatting**: `date-fns` for lightweight date manipulation and formatting.
*   **Testing**: [Jest](https://jestjs.io/) via **next/jest**, [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/), `jest-environment-jsdom`. Tests live under **`tests/`** and apply coverage to **`src/**/*.{ts,tsx}`**.

## Architecture & Project Structure

The project follows a standard Next.js App Router structure. The separation of concerns is maintained by dividing the application into pages (routing), components (UI), lib (business logic), and content (data).

```text
.
├── content/              # The database: Markdown/MDX files containing the actual blog posts.
│   └── posts/            # Individual blog post files (.md, .mdx).
├── public/               # Static assets (images, fonts, favicons).
├── tests/                # Unit tests (*.test.ts, *.tsx); imports app code via @/ → src/.
├── test_reports/         # Generated each test run (gitignored): Markdown summary + Istanbul HTML/lcov.
├── jest.config.js        # Jest config (next/jest, coverage, custom Markdown reporter).
├── jest.setup.ts         # @testing-library/jest-dom and shared test defaults.
├── jest.env.js           # e.g. TZ=UTC for stable date assertions.
├── jest.markdownReporter.cjs  # Writes jest-report-*.md including coverage tables.
├── .github/
│   ├── workflows/jest-pr.yml   # PR → main: Jest CI with coverage + artifact upload.
│   └── scripts/run-jest-for-pr.sh  # Select findRelatedTests vs full npm test from git diff.
├── src/
│   ├── app/              # Next.js App Router pages and layouts.
│   │   ├── page.tsx      # Root page showcasing latest posts or general info.
│   │   ├── about/        # About page route.
│   │   ├── api/
│   │   │   ├── games/         # OpenAI Agents game generation + generated-image proxy.
│   │   │   └── magic-canvas/  # fal.ai generation endpoint + generated-image download proxy.
│   │   ├── canvas/       # Magic Canvas page route.
│   │   ├── game/         # AI Game Creator route.
│   │   ├── gallery/      # Gallery browsing/upload route.
│   │   ├── posts/        # Blog post listing and individual post routes (/posts/[slug]).
│   │   ├── profile/      # Account profile route.
│   │   ├── sign/         # Sign-in and password reset route.
│   │   ├── signup/       # Sign-up route.
│   │   └── tags/         # Tag listing and tag-specific post routes (/tags/[tag]).
│   ├── components/       # Reusable React components.
│   │   ├── game/              # AI Game Creator chat, result card, modal preview, submit flow.
│   │   ├── MagicCanvas.tsx    # Canvas drawing UI, fal status UI, preview, and download.
│   │   ├── MDXContent.tsx# Core component mapping MDX elements to React components.
│   │   └── ...           # Structural (Header, Footer) and specific MDX components (Callout, CodeBlock, etc.).
│   └── lib/              # Core business and data-fetching logic.
│       ├── gameCreator/  # Agents workflow + vendored html-minigame skill used in production.
│       ├── posts.ts      # Functions to read the file system, parse markdown, and fetch posts.
│       └── types.ts      # TypeScript interfaces defining Post and Frontmatter shapes.
└── package.json          # Project dependencies and operational scripts.
```

Note: the tree above abbreviates `src/lib`; see repository for the full file list.

### Testing pipeline

*   **Commands**: `npm test` runs Jest with **`collectCoverage: true`** for all matching files under `src/` (TypeScript and TSX). `npm run test:watch` uses the same configuration in watch mode.
*   **Environment**: `jest.config.js` composes **[next/jest](https://nextjs.org/docs/app/building-your-application/testing/jest)** so transforms align with Next.js. **`moduleNameMapper`** maps `@/` to `src/`, matching `tsconfig.json` paths.
*   **Output**: After each run, **`test_reports/jest-report-<ISO-timestamp>.md`** records pass/fail per test and appends **coverage totals and per-file percentages** (from `coverage-summary.json`). **`test_reports/coverage/`** holds Istanbul **`index.html`**, **`lcov.info`**, and **`coverage-summary.json`** for tooling or CI.
*   **Middleware**: `src/middleware.ts` wraps `@convex-dev/auth` Next.js middleware and passes the Convex URL explicitly; tests mock that package rather than hitting Convex.

### Continuous integration (GitHub Actions)

*   **Workflow**: `.github/workflows/jest-pr.yml` runs on **`pull_request`** events when the **base branch is `main`** (`opened`, `synchronize`, `reopened`).
*   **Documentation-only PRs**: `paths-ignore` lists `**/*.md` and `**/*.mdx`. If **every** changed file matches those patterns, GitHub does **not** enqueue the workflow.
*   **Runner**: `.github/scripts/run-jest-for-pr.sh` uses `git diff` between `github.event.pull_request.base.sha` and `head.sha`. Updates under `jest.config.js`, `jest.setup.ts`, `jest.env.js`, `jest.markdownReporter.cjs`, `package.json`, `package-lock.json`, `tsconfig.json`, or `next.config.*` trigger **`npm test`**. Otherwise, changed paths under `src/` or `tests/` invoke **`npx jest --findRelatedTests --coverage --passWithNoTests`**; unrelated-only changes skip Jest but leave the job green.
*   **Artifacts**: successful focused or full runs upload **`test_reports/`** (timestamped Markdown report plus Istanbul output under `coverage/`). A step also **`cat`**s the newest **`jest-report-*.md`** into **`GITHUB_STEP_SUMMARY`** for the Actions run page.
*   **PR comment**: **`marocchino/sticky-pull-request-comment`** (header **`jest-ci-report`**) publishes the Markdown report body to one updating comment per PR (body truncated around 60 KB if needed). The step uses **`continue-on-error`** because **`pull_request` workflows triggered from forks** often cannot post comments with the default **`GITHUB_TOKEN`**.

## Core Functionality Implementations

### 1. File-System Based Content Management

Instead of a traditional database or Headless CMS, the website uses the local file system to store and manage content.

*   **Logic Location**: `src/lib/posts.ts`
*   **Implementation**: 
    *   The `getAllPosts` function uses Node.js `fs` and `path` modules to read all files in the `content/posts/` directory.
    *   It filters for `.md` and `.mdx` files.
    *   For each file, it reads the raw string content and passes it through `gray-matter`. This extracts the YAML frontmatter (like `title`, `date`, `tags`, `draft` status) and the raw markdown body.
    *   The `reading-time` library is used on the markdown body to calculate an estimated reading time.
    *   Posts marked as `draft: true` are filtered out. The final list is sorted by publication date in descending order.

### 2. MDX Rendering and Custom Components

The website supports writing content in MDX, which allows embedding interactive React components directly within markdown files.

*   **Logic Location**: `src/components/MDXContent.tsx`
*   **Implementation**:
    *   The raw markdown string (fetched via `getPostBySlug`) is passed to the `<MDXRemote />` component from `next-mdx-remote/rsc`.
    *   **Server-Side Rendering**: By using the `/rsc` (React Server Components) version of `next-mdx-remote`, the markdown parsing happens entirely on the server, ensuring zero client-side JavaScript bundle weight for the parser itself.
    *   **Component Mapping**: The `MDXRemote` component is configured with a `components` map. Standard markdown elements (like headings `h2`, `h3`, links `a`, blocks `pre`, and images `img`) are replaced with custom React components. For example:
        *   `<pre>` becomes `<CodeBlock>` (providing syntax highlighting and copy functionality).
        *   `<img>` becomes `<CustomImage>` (potentially leveraging Next.js Image optimization).
        *   Custom tags like `<Callout>` or `<YouTube>` become available for use directly in the `.mdx` files.
    *   **Plugins**: The processing pipeline is enhanced with `remark` and `rehype` plugins to support math equations (`remark-math`, `rehype-katex`) and other advanced formatting.

### 3. Dynamic Routing and Static Generation

The Next.js App Router dynamically handles URLs for blog posts and tags.

*   **Logic Location**: `src/app/posts/[slug]/page.tsx` and `src/app/tags/[tag]/page.tsx`
*   **Implementation**:
    *   **Individual Posts**: The URL parameter `slug` is used to query the file system (e.g., matching `/posts/my-first-post` to `content/posts/my-first-post.mdx`). If found, the data is passed to the `<MDXContent />` component for rendering.
    *   **Tag Filtering**: The `src/lib/posts.ts` exposes functions like `getAllTags` and `getPostsByTag`. The Tag index page aggregates all unique tags across all posts, and the individual Tag pages filter the master post list to only show posts containing that specific tag.

### 4. Authentication, Convex, and password reset (Turnstile)

The app uses **[Convex](https://www.convex.dev/)** with **[@convex-dev/auth](https://labs.convex.dev/auth)** for password-based accounts (sign-in, sign-up, profile updates). Session JWT signing relies on `JWT_PRIVATE_KEY` / `JWKS` on the Convex deployment (see [README.md](./README.md#convex-auth-and-jwt-keys-dev-and-production)).

**Forgot password** is implemented only on the sign-in route (`src/app/sign/page.tsx`). It collects username and new password, embeds a **[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)** widget via `@marsidev/react-turnstile` (site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the Next.js environment), and calls the Convex **action** `resetPasswordWithCaptcha` in `convex/passwordReset.ts`. That action:

*   Verifies the Turnstile token with Cloudflare’s **siteverify** API using `TURNSTILE_SECRET_KEY` from **Convex** environment variables (not from `.env.local`).
*   On success, updates the password with `modifyAccountCredentials` and revokes existing sessions with `invalidateSessions` from `@convex-dev/auth/server`.

Setup for both env vars and dev/prod deployments is documented in [README.md — Cloudflare Turnstile](./README.md#cloudflare-turnstile-forgot-password).

Local development scripts set `NODE_OPTIONS=--dns-result-order=ipv4first` so Node/undici resolves Convex Cloud with IPv4 preference. This avoids intermittent `fetch failed` / timeout failures when the Next.js middleware proxies `auth:signIn` and `auth:signOut` actions to Convex.

### 5. Magic Canvas image-to-image workflow

Magic Canvas is a dedicated drawing and style-transfer route at **`/canvas`**.

*   **UI route**: `src/app/canvas/page.tsx` renders `src/components/MagicCanvas.tsx`.
*   **Navigation**: `src/components/Header.tsx` exposes the route as `canvas` in both desktop and mobile nav.
*   **Access control**: the component uses `useConvexAuth()` and only renders the editor for authenticated users. Signed-out users see a login guide linking to `/sign`; auth-loading users see a lightweight loading state.
*   **Canvas behavior**:
    *   The component owns a blank white `<canvas>` surface and supports pen, eraser, color swatches, stroke-size control, undo, and clear.
    *   The style selector currently supports `No` and `Anime`. Selecting `Anime` causes the server route to prepend a long anime art-direction prompt to the user’s extra prompt.
    *   While generation is in progress, drawing controls and the prompt input are disabled and a loading overlay is shown.
    *   When an image returns, it replaces the canvas stage with a smooth result view. Result controls provide direct browser download, close-to-canvas, and click-to-preview behavior.
    *   Before the result is shown, the client downloads the generated image through the same-origin proxy, uploads it to Convex storage, and creates a metadata record tied to the signed-in user.
*   **Server route**: `src/app/api/magic-canvas/route.ts`
    *   `POST` accepts `{ style, extraPrompt, imageDataUrl }`, validates that a prompt source exists, uploads the canvas PNG to fal storage, and calls `fal-ai/bytedance/seedream/v4.5/edit`.
    *   Credentials are read from server-only `FAL_KEY` or `FAL_API_KEY`. They must not be exposed as `NEXT_PUBLIC_*` values.
    *   If the client sends `Accept: text/event-stream`, the route returns Server-Sent Events with fal queue/log updates (`progress`), the final image URL (`result`), or generation errors (`error`). fal does not provide a stable percentage for this model, so the UI displays real status/log text rather than simulated progress.
    *   `GET ?url=...` proxies a generated image through the same origin with `Content-Disposition: attachment`, so the browser starts a download instead of navigating to the fal-hosted asset.
*   **Convex persistence**:
    *   `convex/schema.ts` defines `canvasImages` with `userId`, `imageId`, `createdAt`, `style`, `model`, and `extraPrompt`.
    *   `convex/magicCanvas.ts` exposes authenticated `generateUploadUrl` and `createImage` mutations, plus `listMine` for retrieving a user’s saved generations.
    *   `createdAt` is assigned server-side in Convex with `Date.now()`, so clients cannot spoof creation time.
    *   Deploy these schema/function changes with `npx convex deploy` before relying on production persistence.
*   **Styling**: `src/app/globals.css` keeps the tool surface close to GoodNotes-style ergonomics: compact top toolbar, centered whiteboard stage with margin, prompt bar at the bottom, hover-only result actions, and fullscreen preview overlay matching the gallery preview pattern.

### 6. Unit testing and coverage

*   **Location**: test files under `tests/`; production code under `src/` is what coverage measures (see **Testing pipeline** under [Architecture & Project Structure](#architecture--project-structure) in this file).
*   **Stack**: Jest, `next/jest`, React Testing Library, and `jsdom` for component tests. Heavy dependencies (e.g. `fs` for `src/lib/posts.ts`, `heic2any` for `src/lib/heicNormalize.ts`, Convex auth in middleware) are **mocked** in tests so the suite runs without a real Convex deployment or browser HEIC decode.
*   **Canvas tests**: `tests/components/MagicCanvas.test.tsx` covers controls, auth gating, streaming generation request payloads, Convex save flow, preview behavior, and proxied download behavior. `tests/app/magicCanvasRoute.test.ts` covers route validation, fal upload/subscribe payloads, SSE output, and download proxy headers.
*   **Game creator tests**: `tests/app/gamesGenerateRoute.test.ts` covers the `/api/games/generate` JSON response path, NDJSON streaming progress contract, streamed error events, and missing OpenAI credentials. `tests/components/AiGameCreator.test.tsx` covers frontend stream parsing, agent progress timeline rendering, final draft rendering, and streamed error display.
*   **Artifacts**: each `npm test` run produces a timestamped Markdown report and refreshes `test_reports/coverage/` (see [README.md — Testing](./README.md#testing)).
*   **CI**: Pull requests targeting **`main`** run Jest on GitHub Actions with the same report layout uploaded as artifacts; behavior is detailed under **[Continuous integration (GitHub Actions)](#continuous-integration-github-actions)** above.

### 7. AI Game Creator workflow

AI Game Creator is a browser-game generation and publishing flow at **`/game`**.

*   **UI route**: `src/app/game/page.tsx` renders `src/components/game/AiGameCreator.tsx`.
*   **Navigation**: `src/components/Header.tsx` exposes the route as `game` in desktop and mobile nav.
*   **Initial page**:
    *   Shows a ChatGPT-style prompt input.
    *   Lists published games from Convex in a fixed-size responsive card grid.
    *   Each card shows name, intro image, creation time, like count, and preview/open controls.
*   **Conversation page**:
    *   Submitting a prompt switches to chat mode.
    *   User messages render on the right; assistant messages render on the left.
    *   While generation is running, the client reads NDJSON progress events and displays a compact agent progress timeline. Events include skill loading, planning, building, verification, cover image generation, and concise `visibleProcess` summaries. Hidden chain-of-thought is not exposed.
    *   Assistant responses include user-visible generation steps, the OpenAI model, the vendored skill path, and verification status.
    *   After generation, the result card includes the intro image, generated analysis and HTML filenames, preview, submit, save-Markdown, save-HTML controls, and an expandable analysis Markdown document.
    *   Additional prompts after the first generation pass the previous HTML plus draft metadata (`gameName`, `slug`, filenames, and analysis markdown) back to the server so the Agents SDK workflow can edit the current draft while preserving the existing game identity unless the user asks for a rename or redesign.
*   **Game generation API**: `src/app/api/games/generate/route.ts`
    *   Keeps intent classification, safety routing, NDJSON progress events, HTML validation, and the existing response shape.
    *   In default legacy mode, reads the vendored `html-minigame` skill from `src/lib/gameCreator/html-minigame/SKILL.md` and the analysis template from `src/lib/gameCreator/html-minigame/reference/analysis-template.md`. This avoids depending on local Codex or Claude skill paths, so the route works on Vercel.
    *   When `OPENAI_GAME_GENERATION_MODE=skill`, calls `generateGameWithOpenAISkill()` in `src/lib/gameCreator/skillGeneration.ts`. That path uses the OpenAI Responses API directly with a shell `container_auto` tool and `skill_reference` from `OPENAI_HTML_MINIGAME_SKILL_ID`.
    *   The skill includes an edit contract: treat existing HTML as the current source of truth, preserve title/slug/core behavior by default, update the analysis markdown, and return a complete revised HTML file rather than a patch.
    *   Calls OpenAI with `OPENAI_API_KEY`.
    *   Legacy mode uses `OPENAI_GAME_MODEL` when set, then `OPENAI_MODEL`, then defaults to `gpt-4.1-mini`. Skill mode uses `OPENAI_GAME_MODEL`, defaulting to `gpt-5.5`.
    *   Runs three agents in sequence through `src/lib/gameCreator/agents.ts`:
        *   planner: produces concrete analysis Markdown for `<slug>_analysis.md`;
        *   builder: produces standalone `<slug>.html`;
        *   verifier: returns a `PASS` or `FAIL` verification conclusion and concise reasons.
    *   Returns normal JSON for legacy/non-stream callers. When the request includes `stream: true`, returns newline-delimited JSON (`application/x-ndjson`) progress events plus a final `complete` event containing the full draft.
    *   Validates that the returned HTML looks like a full document, contains embedded `<style>` and `<script>` blocks, and does not contain obvious external dependency loaders.
    *   Emits server console logs with request ids and the same observable progress events used by the frontend. These logs intentionally avoid hidden chain-of-thought.
*   **Skill mode environment**:
    *   `OPENAI_HTML_MINIGAME_SKILL_ID=skill_6a40208961188198ad19d4df039c20a40e193ab2fc8911f2`
    *   `OPENAI_HTML_MINIGAME_SKILL_VERSION=1`
    *   `OPENAI_GAME_MODEL=gpt-5.5`
    *   `OPENAI_GAME_GENERATION_MODE=skill`
    *   Pin the skill version in production to avoid silent behavior changes.
*   **Intro image generation**:
    *   The same route uses fal.ai model `fal-ai/flux/schnell` to generate a game intro image from the prompt and generated game name.
    *   Credentials come from server-only `FAL_KEY` or `FAL_API_KEY`.
    *   If fal credentials are absent, the route returns a generated SVG data URL placeholder so local game generation can still be tested.
    *   `src/app/api/games/image/route.ts` downloads/proxies either remote fal images or data URL images so the browser can upload a blob to Convex storage.
*   **Preview**:
    *   Draft and published games preview in an in-page modal using an iframe with `sandbox="allow-scripts"`.
    *   The preview modal uses a fixed 16:9 stage inside a larger scrollable shell to reduce clipping when generated games use their own viewport assumptions.
*   **Convex persistence**:
    *   `convex/schema.ts` defines `games` with `userId`, `name`, optional `slug`, `prompt`, `htmlId`, optional `analysisId`, optional `htmlFileName`, optional `analysisFileName`, `imageId`, `createdAt`, and `likes`.
    *   `convex/games.ts` exposes `listPublished`, authenticated `generateUploadUrl`, authenticated `createGame`, and `like`.
    *   Published analysis Markdown, game HTML, and intro images are stored as Convex storage objects. The database record stores only metadata and storage ids.
    *   Deploy schema/function changes with `npx convex deploy` before relying on production publishing.
*   **Production environment**:
    *   Next.js host: `OPENAI_API_KEY`, optional `OPENAI_GAME_MODEL`, and `FAL_KEY` or `FAL_API_KEY`.
    *   Convex deployment: same auth variables documented in README, plus deployed `games` schema/functions.
