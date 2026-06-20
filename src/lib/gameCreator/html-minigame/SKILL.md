---
name: html-minigame
description: Generate a complete, playable minigame as a single standalone HTML file from a natural-language description. Produces a `<name>_analysis.md` design doc and a self-contained `<name>.html` with embedded CSS, JS, and inline SVG.
---

# HTML Minigame Builder

Turn a natural-language game idea into a polished, single-file browser minigame.
The output must feel like a small finished game, not a static demo.

## Output contract

For a game titled e.g. "Space Dodge", produce exactly two files, named in
lowercase kebab-case:

1. `space-dodge_analysis.md` - the design document
2. `space-dodge.html` - the complete, standalone, playable game

Kebab-case rule: lowercase, spaces/punctuation -> single hyphens, strip other
symbols. "Flappy Bird!" -> `flappy-bird`. Derive the slug once and reuse it for
both filenames.

## Workflow

### Step 1 - Analyze and write `<slug>_analysis.md`

Use `reference/analysis-template.md` as the structure. The analysis must cover:

- Game title and derived kebab-case slug
- Genre
- Target player experience
- Core mechanics
- Controls for desktop and mobile
- Win / loss conditions
- Scoring system
- Game objects / entities
- Visual style
- Required assets
- Implementation plan
- Mobile / desktop compatibility checklist

### Step 2 - Design the game logic

- Vanilla JS only. No frameworks, npm, CDN scripts, or external dependencies.
- Support keyboard, mouse, and touch where each makes sense.
- Use a clear state object, input handling, update step, collision logic,
  render step, scoring, and `ready` -> `playing` -> `gameover` state machine.
- Use `requestAnimationFrame` with delta time.
- Restart must fully reset state without reloading the page.

### Step 3 - Design the assets

- Prefer inline SVG, Canvas shapes, CSS shapes, gradients, and generated effects.
- No external image, audio, or font files.
- Keep silhouettes clear and UI legible.

### Step 4 - Assemble `<slug>.html`

Build one self-contained file. It must include:

- `<!DOCTYPE html>`, `<meta charset>`, and a responsive viewport meta tag
- Embedded CSS in one `<style>` block
- Embedded JavaScript in one `<script>` block at the end of `<body>`
- Inline SVG or code-native assets only
- Responsive layout that fits small phone screens
- Visible instructions
- Start / restart UI
- Score display and local high score when sensible
- Mobile-friendly controls when the genre needs them
- Accessibility basics: `lang`, ARIA labels on controls, focusable buttons,
  sufficient contrast, and reduced-motion handling where easy

Touch hygiene: set `touch-action: none` on the play surface when needed, call
`preventDefault()` on touch handlers that would otherwise scroll or zoom, and
use pointer events where possible.

### Step 5 - Verify and summarize

Verify these items:

- Opens directly in a browser with no server
- Zero external dependencies
- Desktop controls work
- Mobile / touch controls work
- Layout fits small screens
- Clear start -> gameplay -> game-over -> restart states
- No obvious JavaScript syntax errors
- Both files use correct kebab-case names

## Quality bar

Prioritize simplicity, playability, responsiveness, and clean code. A tight,
fun, bug-free small game beats an ambitious broken one.
