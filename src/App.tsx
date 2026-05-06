import './App.css';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ScoreDisplay from './components/ScoreDisplay';
import SolvedShelf from './components/SolvedShelf';
import VirtualGrid from './components/VirtualGrid';
import gameData from './data/game.json';
import {
	applyMerge,
	applyPair,
	applyPlaceTile,
	buildGroupTokenViewModels,
	buildTileViewModels,
	countCompletedCategories,
	streakBonus,
	validateMerge,
	validatePair,
	validatePlaceTile,
} from './gameLogic';
import { buildFlatItems } from './shuffle';
import { useGameState } from './store';
import { useDrag } from './useDrag';

import type { GameData, UIState, FlatItem } from "./types";
import type { DragSource, DropTarget } from "./useDrag";
const typedGameData = gameData as GameData;

const emptyUI: UIState = {
  selectedTileIndex: null,
  selectedTileIndices: [],
  selectedGroupIds: [],
  lastResult: null,
  streakMilestone: null,
  compactMode: false,
};

function resetUI(prev: UIState, overrides: Partial<UIState> = {}): UIState {
  return { ...emptyUI, compactMode: prev.compactMode, ...overrides };
}

export default function App() {
  const [gameState, updateState, resetState] = useGameState(typedGameData);
  const [ui, setUI] = useState<UIState>(emptyUI);
  const [debugMode, setDebugMode] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("cluster-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cluster-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "d") setDebugMode((m) => !m);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const stride = Math.round(360 * (Math.sqrt(5) - 1) / 2); // golden angle ~137deg
    typedGameData.categories.forEach((cat, i) => {
      const hue = (i * stride) % 360;
      const lightness = i % 2 === 0 ? 55 : 75;
      map.set(cat.id, `hsl(${hue}, 75%, ${lightness}%)`);
    });
    return map;
  }, []);

  const flatItems: FlatItem[] = useMemo(
    () => buildFlatItems(typedGameData, gameState.shuffleSeed),
    [gameState.shuffleSeed]
  );

  // --- Drag drop ---
  const handleDrop = useCallback((source: DragSource, target: DropTarget) => {
    if (source.kind === "tile" && target.kind === "tile") {
      if (source.globalIndex === target.globalIndex) return;
      const result = validatePair(source.globalIndex, target.globalIndex, flatItems, gameState.groups);
      const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
      updateState((s) => applyPair(s, result, typedGameData));
      setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
    } else if (source.kind === "tile" && target.kind === "group") {
      const result = validatePlaceTile(source.globalIndex, target.groupId, flatItems, gameState.groups);
      const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
      updateState((s) => applyPlaceTile(s, result, source.globalIndex, typedGameData));
      setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
    } else if (source.kind === "group" && target.kind === "group") {
      if (source.groupId === target.groupId) return;
      const mergeIds = [source.groupId, target.groupId];
      const result = validateMerge(mergeIds, gameState.groups);
      const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
      updateState((s) => applyMerge(s, result, mergeIds, typedGameData));
      setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
    }
    // group â†’ tile: no-op
  }, [flatItems, gameState.groups, gameState.streak, updateState]);

  const { dragState, onDragStart, onDragCancel, didDrag } = useDrag(handleDrop);

  const handleTileDragStart = useCallback((globalIndex: number, e: React.PointerEvent) => {
    onDragStart({ kind: "tile", globalIndex }, e);
  }, [onDragStart]);

  const handleGroupDragStart = useCallback((groupId: string, e: React.PointerEvent) => {
    onDragStart({ kind: "group", groupId }, e);
  }, [onDragStart]);

  // --- Tile clicks (grid) ---
  const handleTileClick = useCallback(
    (globalIndex: number) => {
      if (didDrag()) return;
      // Deselect if already selected
      if (ui.selectedTileIndices.includes(globalIndex)) {
        setUI((u) => ({
          ...u,
          selectedTileIndices: u.selectedTileIndices.filter((i) => i !== globalIndex),
          selectedTileIndex: u.selectedTileIndex === globalIndex ? null : u.selectedTileIndex,
        }));
        return;
      }

      const next = [...ui.selectedTileIndices, globalIndex];

      if (next.length === 2) {
        const [idx1, idx2] = next;
        const result = validatePair(idx1, idx2, flatItems, gameState.groups);
        const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
        updateState((s) => applyPair(s, result, typedGameData));
        setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
        return;
      }

      setUI((u) => resetUI(u, { selectedTileIndices: [globalIndex], selectedTileIndex: globalIndex }));
    },
    [didDrag, flatItems, gameState.groups, ui.selectedTileIndices, updateState]
  );

  // --- Group token clicks (shelf) â€” click-to-select for merge fallback ---
  const handleGroupTokenClick = useCallback(
    (groupId: string) => {
      if (didDrag()) return;
      // If a tile is selected, place it
      if (ui.selectedTileIndex !== null) {
        const result = validatePlaceTile(ui.selectedTileIndex, groupId, flatItems, gameState.groups);
        const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
        updateState((s) => applyPlaceTile(s, result, ui.selectedTileIndex!, typedGameData));
        setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
        return;
      }

      // Toggle selection; if we now have 2 selected, attempt merge immediately
      const already = ui.selectedGroupIds.includes(groupId);
      if (already) {
        setUI((u) => ({ ...u, selectedGroupIds: u.selectedGroupIds.filter((id) => id !== groupId), lastResult: null }));
        return;
      }
      const next = [...ui.selectedGroupIds, groupId];
      if (next.length === 2) {
        const result = validateMerge(next, gameState.groups);
        const { milestone } = result.valid ? streakBonus(gameState.streak, gameState.streak + 1) : { milestone: null };
        updateState((s) => applyMerge(s, result, next, typedGameData));
        setUI((u) => resetUI(u, { lastResult: result.valid ? "correct" : "wrong", streakMilestone: milestone }));
        return;
      }
      setUI((u) => ({ ...u, selectedGroupIds: next, lastResult: null }));
    },
    [didDrag, ui.selectedTileIndex, ui.selectedGroupIds, flatItems, gameState.groups, gameState.streak, updateState]
  );

  const handleToggleCompact = useCallback(() => {
    setUI((u) => ({ ...u, compactMode: true }));
  }, []);

  const handleDeselect = useCallback(() => {
    setUI((u) => resetUI(u));
    onDragCancel();
  }, [onDragCancel]);

  const handleReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    resetState();
    setUI(emptyUI);
    onDragCancel();
  }, [confirmReset, resetState, onDragCancel]);

  const tileViewModels = useMemo(
    () => buildTileViewModels(flatItems, gameState.groups, ui.selectedTileIndices, ui.compactMode),
    [flatItems, gameState.groups, ui.selectedTileIndices, ui.compactMode]
  );

  const groupTokens = useMemo(
    () => buildGroupTokenViewModels(
      gameState.groups,
      typedGameData.categories,
      flatItems,
      ui.selectedGroupIds,
      typedGameData
    ),
    [gameState.groups, flatItems, ui.selectedGroupIds]
  );

  const canDeselect = ui.selectedTileIndices.length > 0 || ui.selectedGroupIds.length > 0;
  const completedCategories = countCompletedCategories(gameState.groups, typedGameData);

  return (
    <>
    <div className="game">
      <header className="game__header">
        <h1 className="game__title">Cluster</h1>
        <ScoreDisplay
          score={gameState.score}
          wrongGuesses={gameState.wrongGuesses}
          streak={gameState.streak}
          completedCategories={completedCategories}
          totalCategories={typedGameData.categories.length}
        />
        <div className="game__header-actions">
          <button
            className="controls__btn controls__btn--theme"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            className="controls__btn controls__btn--deselect"
            disabled={!canDeselect}
            onClick={handleDeselect}
          >
            Deselect
          </button>
          <button
            className={`controls__btn controls__btn--reset${confirmReset ? " controls__btn--confirm" : ""}`}
            onClick={handleReset}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? "Sure?" : "Reset"}
          </button>
        </div>
      </header>

      {gameState.completedAt ? (
        <div className="game__complete">
          <p>Puzzle complete!</p>
          <p>Final score: {gameState.score}</p>
        </div>
      ) : (
        <div className={`game__feedback${ui.lastResult ? ` game__feedback--${ui.lastResult}` : ""}`}>
          {ui.lastResult === "correct"
            ? ui.streakMilestone === 5
              ? "5 in a row! +25"
              : ui.streakMilestone === 3
              ? "3 in a row! +15"
              : "Correct!"
            : ui.lastResult === "wrong"
            ? "Wrong!"
            : null}
        </div>
      )}

      <SolvedShelf
        groupTokens={groupTokens}
        dragState={dragState}
        onGroupTokenClick={handleGroupTokenClick}
        onGroupDragStart={handleGroupDragStart}
        categoryColorMap={categoryColorMap}
        debugMode={debugMode}
        compactMode={ui.compactMode}
        onToggleCompact={handleToggleCompact}
        totalCategories={typedGameData.categories.length}
      />

      <VirtualGrid
        tiles={tileViewModels}
        dragOverTileIndex={
          dragState.overTarget?.kind === "tile" ? dragState.overTarget.globalIndex : null
        }
        onTileClick={handleTileClick}
        onTileDragStart={handleTileDragStart}
        categoryColorMap={debugMode ? categoryColorMap : null}
      />

      <footer className="game__footer">
        <button
          className="game__scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ^ Top
        </button>
      </footer>
    </div>
    </>
  );
}
