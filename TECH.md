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
│   │   │   └── magic-canvas/  # fal.ai generation endpoint + generated-image download proxy.
│   │   ├── canvas/       # Magic Canvas page route.
│   │   ├── gallery/      # Gallery browsing/upload route.
│   │   ├── posts/        # Blog post listing and individual post routes (/posts/[slug]).
│   │   ├── profile/      # Account profile route.
│   │   ├── sign/         # Sign-in and password reset route.
│   │   ├── signup/       # Sign-up route.
│   │   └── tags/         # Tag listing and tag-specific post routes (/tags/[tag]).
│   ├── components/       # Reusable React components.
│   │   ├── MagicCanvas.tsx    # Canvas drawing UI, fal status UI, preview, and download.
│   │   ├── MDXContent.tsx# Core component mapping MDX elements to React components.
│   │   └── ...           # Structural (Header, Footer) and specific MDX components (Callout, CodeBlock, etc.).
│   └── lib/              # Core business and data-fetching logic.
│       ├── posts.ts      # Functions to read the file system, parse markdown, and fetch posts.
│       └── types.ts      # TypeScript interfaces defining Post and Frontmatter shapes.
└── package.json          # Project dependencies and operational scripts.
```

Note: the tree above abbreviates `src/lib`; see repository for the full file list.

### Testing pipeline

*   **Commands**: `npm test` runs Jest with **`collectCoverage: true`** for all matching files under `src/` (TypeScript and TSX). `npm run test:watch` uses the same configuration in watch mode.
*   **Environment**: `jest.config.js` composes **[next/jest](https://nextjs.org/docs/app/building-your-application/testing/jest)** so transforms align with Next.js. **`moduleNameMapper`** maps `@/` to `src/`, matching `tsconfig.json` paths.
*   **Output**: After each run, **`test_reports/jest-report-<ISO-timestamp>.md`** records pass/fail per test and appends **coverage totals and per-file percentages** (from `coverage-summary.json`). **`test_reports/coverage/`** holds Istanbul **`index.html`**, **`lcov.info`**, and **`coverage-summary.json`** for tooling or CI.
*   **Middleware**: `src/middleware.ts` wraps `@convex-dev/auth` Next.js middleware; tests mock that package rather than hitting Convex.

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

### 5. Magic Canvas image-to-image workflow

Magic Canvas is a dedicated drawing and style-transfer route at **`/canvas`**.

*   **UI route**: `src/app/canvas/page.tsx` renders `src/components/MagicCanvas.tsx`.
*   **Navigation**: `src/components/Header.tsx` exposes the route as `canvas` in both desktop and mobile nav.
*   **Canvas behavior**:
    *   The component owns a blank white `<canvas>` surface and supports pen, eraser, color swatches, stroke-size control, undo, and clear.
    *   The style selector currently supports `No` and `Anime`. Selecting `Anime` causes the server route to prepend a long anime art-direction prompt to the user’s extra prompt.
    *   While generation is in progress, drawing controls and the prompt input are disabled and a loading overlay is shown.
    *   When an image returns, it replaces the canvas stage with a smooth result view. Result controls provide direct browser download, close-to-canvas, and click-to-preview behavior.
*   **Server route**: `src/app/api/magic-canvas/route.ts`
    *   `POST` accepts `{ style, extraPrompt, imageDataUrl }`, validates that a prompt source exists, uploads the canvas PNG to fal storage, and calls `fal-ai/bytedance/seedream/v4.5/edit`.
    *   Credentials are read from server-only `FAL_KEY` or `FAL_API_KEY`. They must not be exposed as `NEXT_PUBLIC_*` values.
    *   If the client sends `Accept: text/event-stream`, the route returns Server-Sent Events with fal queue/log updates (`progress`), the final image URL (`result`), or generation errors (`error`). fal does not provide a stable percentage for this model, so the UI displays real status/log text rather than simulated progress.
    *   `GET ?url=...` proxies a generated image through the same origin with `Content-Disposition: attachment`, so the browser starts a download instead of navigating to the fal-hosted asset.
*   **Styling**: `src/app/globals.css` keeps the tool surface close to GoodNotes-style ergonomics: compact top toolbar, centered whiteboard stage with margin, prompt bar at the bottom, hover-only result actions, and fullscreen preview overlay matching the gallery preview pattern.

### 6. Unit testing and coverage

*   **Location**: test files under `tests/`; production code under `src/` is what coverage measures (see **Testing pipeline** under [Architecture & Project Structure](#architecture--project-structure) in this file).
*   **Stack**: Jest, `next/jest`, React Testing Library, and `jsdom` for component tests. Heavy dependencies (e.g. `fs` for `src/lib/posts.ts`, `heic2any` for `src/lib/heicNormalize.ts`, Convex auth in middleware) are **mocked** in tests so the suite runs without a real Convex deployment or browser HEIC decode.
*   **Canvas tests**: `tests/components/MagicCanvas.test.tsx` covers controls, streaming generation request payloads, preview behavior, and proxied download behavior. `tests/app/magicCanvasRoute.test.ts` covers route validation, fal upload/subscribe payloads, SSE output, and download proxy headers.
*   **Artifacts**: each `npm test` run produces a timestamped Markdown report and refreshes `test_reports/coverage/` (see [README.md — Testing](./README.md#testing)).
*   **CI**: Pull requests targeting **`main`** run Jest on GitHub Actions with the same report layout uploaded as artifacts; behavior is detailed under **[Continuous integration (GitHub Actions)](#continuous-integration-github-actions)** above.
