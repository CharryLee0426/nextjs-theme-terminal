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
*   **Date Formatting**: `date-fns` for lightweight date manipulation and formatting.

## Architecture & Project Structure

The project follows a standard Next.js App Router structure. The separation of concerns is maintained by dividing the application into pages (routing), components (UI), lib (business logic), and content (data).

```text
.
├── content/              # The database: Markdown/MDX files containing the actual blog posts.
│   └── posts/            # Individual blog post files (.md, .mdx).
├── public/               # Static assets (images, fonts, favicons).
├── src/
│   ├── app/              # Next.js App Router pages and layouts.
│   │   ├── (home)/       # Root page showcasing latest posts or general info.
│   │   ├── about/        # About page route.
│   │   ├── posts/        # Blog post listing and individual post routes (/posts/[slug]).
│   │   └── tags/         # Tag listing and tag-specific post routes (/tags/[tag]).
│   ├── components/       # Reusable React components.
│   │   ├── MDXContent.tsx# Core component mapping MDX elements to React components.
│   │   └── ...           # Structural (Header, Footer) and specific MDX components (Callout, CodeBlock, etc.).
│   └── lib/              # Core business and data-fetching logic.
│       ├── posts.ts      # Functions to read the file system, parse markdown, and fetch posts.
│       └── types.ts      # TypeScript interfaces defining Post and Frontmatter shapes.
└── package.json          # Project dependencies and operational scripts.
```

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
