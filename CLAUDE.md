# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (localhost:5173)
npm run build     # type-check + production build → dist/
npm run lint      # ESLint
npm run preview   # serve the dist/ build locally
```

No test suite is configured.

## Architecture

Cluster is a Connections-style puzzle game. Players pair tiles from a shuffled grid — two matching tiles create a shelf group, which can be grown by dragging more tiles onto it or merging with another group of the same category.

### Data flow

`src/data/game.json` → `buildFlatItems()` (shuffle.ts) → `FlatItem[]` (stable, seeded shuffle) → rendered by `VirtualGrid` as tiles.

Player actions mutate `GameState` (persisted to `localStorage` under key `cluster-v3`) via pure updater functions in `gameLogic.ts`. UI-only state (selections, feedback, compact mode) lives in `UIState` in `App.tsx` and is never persisted.

### Key files

- **`src/types.ts`** — all shared types. `GameState` is what gets saved; `UIState` is ephemeral.
- **`src/gameLogic.ts`** — pure functions: `validate*` check if a move is legal, `apply*` return the next `GameState`. Also contains view model builders (`buildTileViewModels`, `buildGroupTokenViewModels`).
- **`src/store.ts`** — `useGameState` hook; handles localStorage load/save. Bump `STORAGE_KEY` when `GameState` shape changes to avoid loading stale data.
- **`src/useDrag.ts`** — pointer-event drag and drop. Uses a global drop zone registry (`registerDropZone`) so any component can declare itself a drop target. Drag threshold is 6px; scroll is not suppressed until threshold is crossed (important for touch).
- **`src/shuffle.ts`** — seeded LCG shuffle so the board is reproducible from `GameState.shuffleSeed`.
- **`src/App.tsx`** — wires everything together. Contains all event handlers. Uses `resetUI(prev, overrides)` helper to reset UI state while preserving `compactMode`.
- **`src/App.css`** — all component styles (no CSS modules). Uses CSS custom properties from `src/index.css` for theming.

### Game puzzle data

`src/data/game.json` defines the puzzle: a top-level `id`, `title`, and an array of `categories`, each with an `id`, `name`, and `items: string[]`. The game supports any number of categories and any number of items per category. The `gameId` from this file is stored in `GameState` to detect stale saves.

### Theming

CSS variables defined in `src/index.css` under `:root` (light) and `:root[data-theme="dark"]` / `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` (dark). The `data-theme` attribute is set on `<html>` and persisted to `localStorage` under `cluster-theme`.

### Virtual grid

`VirtualGrid` uses `@tanstack/react-virtual` with the page (`document.documentElement`) as the scroll element. `scrollMargin` tracks the grid's offset from the top of the page so the virtualizer positions rows correctly. Collected tiles render as zero-height placeholder `<div>`s to keep grid positions stable; when `compactMode` is true they are omitted entirely so rows collapse.

### Category colors

`categoryColorMap` in `App.tsx` assigns each category a distinct HSL color using golden-angle hue spacing. Always computed; passed to `SolvedShelf` unconditionally (for completed group coloring) and to `VirtualGrid` only when `debugMode` is on (toggled with the `d` key).
