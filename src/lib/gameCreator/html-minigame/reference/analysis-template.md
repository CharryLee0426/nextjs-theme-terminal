# <Game Title> - Design Analysis

> Slug: `<kebab-case-slug>` -> files: `<slug>_analysis.md`, `<slug>.html`

## Game title
<Name>

## Genre
<e.g. arcade survival, puzzle, endless runner>

## Target player experience
<The core feeling / hook. What makes 30 seconds of this fun?>

## Core mechanics
- <verb 1 - what the player does>
- <verb 2>
- <verb 3>

## Controls
**Desktop**
- Keyboard: <keys -> actions>
- Mouse: <movement/click -> actions>

**Mobile**
- Touch: <taps / drags / on-screen buttons -> actions>

## Win / loss conditions
- Win: <condition, or "endless - survive/score">
- Loss: <condition>

## Scoring system
- <how points are earned>
- High score: <persist via localStorage? yes/no>

## Game objects / entities
| Entity | Role | Behavior | Visual |
|--------|------|----------|--------|
| Player | <...> | <...> | <...> |

## Visual style
- Palette: <colors>
- Mood: <...>
- Art approach: <inline SVG / canvas shapes / gradients>

## Required assets
- <asset 1>
- (no external files)

## Implementation plan
- Rendering: <Canvas 2D | DOM+CSS> - why
- Game loop: requestAnimationFrame + delta time
- State machine: ready -> playing -> gameover (+ restart)
- Modules: state / input / update / collision / render / score
- Data structures: <arrays of entities, spawn timers>
- Difficulty curve: <how it ramps>

## Mobile / desktop compatibility checklist
- [ ] Responsive viewport meta + scalable canvas/layout
- [ ] Touch controls implemented and tested mentally
- [ ] Keyboard + mouse controls
- [ ] `touch-action: none` + preventDefault on play surface
- [ ] No horizontal scroll on small screens
- [ ] Readable text / tap targets >= 44px on mobile
- [ ] No external dependencies
