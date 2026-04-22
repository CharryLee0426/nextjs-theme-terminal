# Terminal Theme Next.js

A modern, retro terminal-inspired blog theme built with Next.js 15, featuring MDX support and a sleek command-line aesthetic. This project brings the beloved Hugo Terminal theme experience to the React ecosystem with enhanced functionality and modern web development practices.

**中文说明：** [README.cn.md](./README.cn.md)

![Terminal Theme Preview](./public/terminal-preview.svg)

## ✨ Features

- 🖥️ **Authentic Terminal Aesthetic** - Retro command-line interface with customizable color schemes
- 📝 **MDX Support** - Write posts in MDX format with React component integration
- 🎨 **Syntax Highlighting** - Beautiful code blocks with multiple language support
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- ⚡ **Performance Optimized** - Built with Next.js 15 and React 19 for lightning-fast performance
- 🔍 **SEO Friendly** - Proper meta tags, structured data, and sitemap generation
- 🌙 **Terminal Color Schemes** - Customizable themes inspired by classic terminal emulators
- 🚀 **Modern Stack** - TypeScript, Tailwind CSS, and cutting-edge web technologies

## 🏗️ Project Structure
```
terminal-theme-nextjs/
├── content/
│   └── posts/                 # MDX blog posts
│       ├── hello_world.mdx
│       └── showcase.mdx
├── public/
│   ├── fonts/                 # Fira Code font files
│   └── *.svg                  # Static assets and icons
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── about/             # About page
│   │   ├── posts/             # Dynamic post routes
│   │   ├── tags/              # Tag-based filtering
│   │   ├── globals.css        # Global styles and terminal theme
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable React components
│   │   ├── CodeBlock.tsx      # Syntax highlighted code blocks
│   │   ├── Header.tsx         # Terminal-style navigation
│   │   ├── Footer.tsx         # Site footer
│   │   ├── MDXContent.tsx     # MDX content renderer
│   │   ├── PostCard.tsx       # Blog post preview cards
│   │   └── *.tsx              # Other UI components
│   └── lib/                   # Utility functions and types
│       ├── posts.ts           # Post management utilities
│       └── types.ts           # TypeScript type definitions
├── mdx-components.tsx         # Global MDX component mapping
├── next.config.ts             # Next.js configuration
└── package.json               # Dependencies and scripts
```

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Content & Styling
- **[MDX](https://mdxjs.com/)** - Markdown with React components
- **[next-mdx-remote](https://github.com/hashicorp/next-mdx-remote)** - Server-side MDX rendering
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Fira Code](https://github.com/tonsky/FiraCode)** - Monospace font with ligatures

### Content Processing
- **[gray-matter](https://github.com/jonschlinkert/gray-matter)** - Front matter parsing
- **[remark](https://remark.js.org/)** - Markdown processing
- **[rehype](https://rehype.js.org/)** - HTML processing
- **[rehype-highlight](https://github.com/rehypejs/rehype-highlight)** - Syntax highlighting

### Utilities
- **[date-fns](https://date-fns.org/)** - Date manipulation
- **[reading-time](https://github.com/ngryman/reading-time)** - Reading time estimation
- **[lucide-react](https://lucide.dev/)** - Beautiful icons
- **[clsx](https://github.com/lukeed/clsx)** - Conditional class names

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CharryLee0426/terminal-theme-nextjs.git
   cd terminal-theme-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see your site.

## 📝 Creating Content

### Writing Posts

Create new MDX files in the `content/posts/` directory:

```markdown
---
title: "Your Post Title"
date: "2024-01-15"
description: "A brief description of your post"
tags: ["nextjs", "react", "terminal"]
---

# Your Content Here

You can use **markdown** and React components!

```javascript
console.log("Hello, Terminal!");
```

<Callout type="info">
  This is a custom React component in MDX!
</Callout>
```

### Available Components

- `<CodeBlock>` - Enhanced code blocks with copy functionality
- `<Callout>` - Information, warning, and error callouts
- `<CustomImage>` - Optimized images with captions
- `<YouTubeEmbed>` - Embedded YouTube videos

## 🎨 Customization

### Color Schemes

The theme uses CSS custom properties for easy customization. Edit `src/app/globals.css`:

```css
:root {
  --accent: #ffa86a;           /* Primary accent color */
  --background: #1d1e20;       /* Background color */
  --color: #c9c9c9;            /* Text color */
  --border-color: rgba(255, 255, 255, 0.1); /* Border color */
  
  /* Terminal colors */
  --terminal-green: #00ff41;
  --terminal-blue: #66d9ef;
  --terminal-yellow: #e6db74;
  /* ... more colors */
}
```

### Adding Custom Components

1. Create your component in `src/components/`
2. Export it in `mdx-components.tsx`
3. Use it in your MDX files

### Modifying Layout

- **Header**: Edit `src/components/Header.tsx`
- **Footer**: Edit `src/components/Footer.tsx`
- **Global Layout**: Edit `src/app/layout.tsx`

## Convex Auth and JWT keys (dev and production)

This project uses **[Convex](https://www.convex.dev/)** with **[@convex-dev/auth](https://labs.convex.dev/auth)** (password provider). After a successful sign-in, Convex issues **session JWTs** signed with **RS256**. That requires a key pair stored as **Convex deployment environment variables**—not only in Vercel or `.env.local`.

### Required Convex variables

| Variable | Purpose |
|----------|---------|
| `JWT_PRIVATE_KEY` | PKCS #8 PEM **private** key used to **sign** JWTs (keep secret). |
| `JWKS` | JSON Web Key Set containing the **public** key material used to **verify** tokens. |

If `JWT_PRIVATE_KEY` is missing, sign-in fails with an error like `Missing environment variable JWT_PRIVATE_KEY`.

**Do not** try to set `CONVEX_SITE_URL` yourself on Convex Cloud: it is a **built-in** deployment value (your `*.convex.site` URL). The issuer claim in JWTs comes from there.

Official reference: [Convex Auth — manual setup](https://labs.convex.dev/auth/setup/manual).

### Local development

1. Link the repo to a Convex project (`npx convex dev` once).
2. Generate a key pair and push it to the **currently linked** deployment (from `.env.local` / `CONVEX_DEPLOYMENT`):

   ```bash
   npm run convex:apply-auth-keys
   ```

   This runs `scripts/generate-convex-auth-keys.mjs --apply`, which sets `JWT_PRIVATE_KEY` and `JWKS` via `npx convex env set … --from-file` (PEM/JSON values must not be passed as a single shell argument with spaces).

3. To **print** values instead (e.g. to paste into the Dashboard), run:

   ```bash
   npm run convex:generate-auth-keys
   ```

4. Restart `npx convex dev` after changing Convex env vars.

### Production deployment

Convex **dev** and **prod** are separate deployments. You must configure **`JWT_PRIVATE_KEY` and `JWKS` on the production deployment** as well—copying dev keys is possible but **rotating** or using a **dedicated prod key pair** is recommended.

**Option A — Convex Dashboard (simplest)**

1. Open [Convex Dashboard](https://dashboard.convex.dev) → your project → select the **Production** deployment.
2. Go to **Settings → Environment variables**.
3. Run `npm run convex:generate-auth-keys` locally, then add:
   - `JWT_PRIVATE_KEY` — the full one-line or PEM value printed for the private key (Dashboard accepts multiline PEM).
   - `JWKS` — the exact JSON string printed for `JWKS=`.

**Option B — Convex CLI targeting production**

Generate PEM and JWKS files locally (never commit them), then:

```bash
npx convex env set --prod JWT_PRIVATE_KEY --from-file ./jwt-private.pem
npx convex env set --prod JWKS --from-file ./jwks.json
```

Use `--deployment <name>` instead of `--prod` if you use a named deployment.

### Vercel (or other Next.js host)

Set the **public** Convex URLs for the browser (see `.env.local` example):

- `NEXT_PUBLIC_CONVEX_URL` — e.g. `https://<deployment>.convex.cloud`
- `NEXT_PUBLIC_CONVEX_SITE_URL` — e.g. `https://<deployment>.convex.site`

Production builds should use the **production** Convex URLs. JWT secrets stay on Convex only; they are **not** `NEXT_PUBLIC_*` variables.

### Rotating keys

Regenerating and overwriting `JWT_PRIVATE_KEY` / `JWKS` **invalidates existing sessions**; users will need to sign in again. Plan rotations accordingly.

## 🚀 Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CharryLee0426/terminal-theme-nextjs)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings (auto-detected)
   - Deploy!

3. **Environment variables**
   - Add `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` for your **production** Convex deployment (see [Convex Auth and JWT keys](#convex-auth-and-jwt-keys-dev-and-production)).
   - On Convex **production**, set `JWT_PRIVATE_KEY` and `JWKS` (same section).
   - Redeploy after changing env vars.

### Build Configuration

The project is optimized for Vercel with:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## 📚 Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial

### MDX Resources
- [MDX Documentation](https://mdxjs.com/) - Learn about MDX syntax and features
- [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) - Server-side MDX rendering

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

This project was inspired by and pays homage to:

- **[panr/hugo-theme-terminal](https://github.com/panr/hugo-theme-terminal)** - The original Hugo Terminal theme that inspired this Next.js port. Special thanks to [panr](https://github.com/panr) for creating such a beautiful and iconic terminal aesthetic that has influenced countless developers and designers.

- **[Terminal.css](https://panr.github.io/terminal-css/)** - The color scheme generator that makes customization effortless

- The open-source community for the amazing tools and libraries that make this project possible

---

<div align="center">

**[🌟 Star this repo](https://github.com/CharryLee0426/terminal-theme-nextjs)** • **[🐛 Report Bug](https://github.com/CharryLee0426/terminal-theme-nextjs/issues)** • **[💡 Request Feature](https://github.com/CharryLee0426/terminal-theme-nextjs/issues)**

Made with ❤️ by [CharryLee](https://github.com/CharryLee0426)


</div>
