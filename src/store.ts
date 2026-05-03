import { useState, useCallback } from "react";
import type { GameData, GameState } from "./types";

const STORAGE_KEY = "cluster-v3";

function initState(gameData: GameData): GameState {
  return {
    gameId: gameData.id,
    shuffleSeed: Math.floor(Math.random() * 2 ** 31),
    score: 0,
    wrongGuesses: 0,
    streak: 0,
    groups: [],
    completedAt: null,
  };
}

function loadState(gameData: GameData): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.gameId === gameData.id) return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return initState(gameData);
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

type Updater = (updater: (s: GameState) => GameState) => void;

export function useGameState(gameData: GameData): [GameState, Updater, () => void] {
  const [state, setState] = useState<GameState>(() => loadState(gameData));

  const updateState = useCallback<Updater>((updater) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const resetState = useCallback(() => {
    const fresh = initState(gameData);
    saveState(fresh);
    setState(fresh);
  }, [gameData]);

  return [state, updateState, resetState];
}
