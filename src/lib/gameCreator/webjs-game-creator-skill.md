---
name: webjs-game-creator
description: Create lightweight browser mini games using pure HTML, CSS, and JavaScript in a single runnable .html file. Use when Codex is asked to design, implement, asset-build, assemble, package, or verify an H5-style web game, browser game, arcade mini game, puzzle, casual game, or mobile-friendly single-file game without frameworks or external build tooling.
---

# WebJS Game Creator

## Overview

Create a complete browser mini game as one self-contained HTML file. Follow the required four-step process: clarify and document requirements, generate game logic, generate code-native assets, assemble everything into `<gamename>.html`, and verify with a clear `PASS` or `FAIL` conclusion.

## Required Workflow

### 1. Requirements and Design

Understand the user's game request before coding.

- Ask concise follow-up questions only when missing details would materially change the game, such as controls, win/loss condition, target device, theme, difficulty, or required mechanics.
- If the user leaves details open, make pragmatic defaults suitable for an H5/mobile browser mini game: keyboard and touch controls, responsive layout, no external dependencies, short sessions, clear score/state feedback.
- Produce a brief design document before implementation. Include: game name, genre, target device/orientation, controls, gameplay loop, entities, scoring, win/loss states, screens/states, visual style, sound policy, and verification criteria.

### 2. Game Code

Based on the design document, implement the game using only inline HTML, CSS, and JavaScript.

- Use a single HTML document with embedded `<style>` and `<script>`.
- Do not require npm, bundlers, frameworks, remote scripts, or remote assets.
- Keep the game playable from a local file URL when possible.
- Include complete state handling: start/restart, active play, pause when appropriate, game over or win state, score/progress display, and input handling.
- Use `requestAnimationFrame` for real-time games and deterministic event/state updates for turn-based games.
- Support desktop and mobile controls unless the user explicitly scopes the game to one input mode.

### 3. Game Assets

Based on the design document, generate all game assets directly in HTML, CSS, Canvas, SVG markup, or JavaScript drawing code.

- Prefer code-native assets: Canvas rendering, CSS shapes, inline SVG, gradients, procedural particles, and simple generated sprites.
- Keep assets self-contained in the final HTML file.
- Do not link to external images, fonts, audio, CDN scripts, or remote stylesheets unless the user explicitly asks and verification accounts for network dependency.
- If audio is included, synthesize it with Web Audio API or make it optional and user-gesture safe.
- Ensure assets match gameplay needs first: readable characters, clear hazards, visible pickups, legible UI, and responsive sizing.

### 4. Assemble and Verify

Assemble game logic and assets into one file named `<gamename>.html`, where `<gamename>` is a lowercase hyphenated version of the game name unless the user specified an exact filename.

Verify the HTML package before finalizing.

- Check that the file exists and is non-empty.
- Check that it contains a valid HTML structure, embedded CSS, and embedded JavaScript.
- Check that there are no unintended external dependencies.
- Run an available local verification method, such as opening/parsing with a browser automation tool, running a lightweight static check, or serving/opening the file if needed.
- For interactive/canvas games, inspect for common runtime failures: JavaScript syntax errors, missing DOM elements, blank canvas, broken controls, and layout overflow.

End verification with one explicit conclusion line:

`Conclusion: PASS`

or

`Conclusion: FAIL`

If `PASS`, save the final game HTML file and tell the user the game was successfully generated, including the path. If `FAIL`, tell the user the game failed to generate and give concrete reasons and any partial artifact path.

## Implementation Standards

- Use pure HTML, CSS, and JavaScript only.
- Keep all code in the final `.html` file.
- Make layout responsive for common phone and desktop viewport sizes.
- Prefer accessible controls and visible state feedback: score, lives/health/time, start/restart buttons, and touch targets large enough for mobile.
- Prevent default browser scrolling/zoom gestures only when needed for gameplay, and avoid trapping input outside the game surface.
- Keep code readable with small functions for initialization, update, rendering, input, collision, and state transitions.
- Avoid overengineering. A polished, complete mini game is better than a large unfinished system.

## Final Response Format

After creating and verifying the game, summarize:

- The saved HTML file path.
- The verification conclusion, exactly `PASS` or `FAIL`.
- If `PASS`, a short note that the game was successfully generated.
- If `FAIL`, the failure reasons.
