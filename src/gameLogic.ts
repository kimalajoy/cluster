import type {
  FlatItem,
  GameState,
  ShelfGroup,
  PairResult,
  PlaceTileResult,
  MergeGroupsResult,
  CategoryData,
  GameData,
  TileViewModel,
  GroupTokenViewModel,
  TileStatus,
} from "./types";

// --- Scoring ---
const PAIR_CORRECT = 10;
const WRONG_GUESS = -5;
const PLACE_CORRECT = 5;
const MERGE_CORRECT = 20;
const CATEGORY_COMPLETE_BONUS = 50;
const STREAK_BONUS: Record<number, number> = { 3: 15, 5: 25 };
const STREAK_MILESTONES = [3, 5] as const;

export function clampScore(s: number): number {
  return Math.max(0, s);
}

// Returns the streak bonus earned by going from prevStreak to newStreak (if any milestone crossed)
export function streakBonus(prevStreak: number, newStreak: number): { bonus: number; milestone: 3 | 5 | null } {
  for (const m of [...STREAK_MILESTONES].reverse()) {
    if (newStreak >= m && prevStreak < m) {
      return { bonus: STREAK_BONUS[m], milestone: m };
    }
  }
  return { bonus: 0, milestone: null };
}

// --- Helpers ---

function collectedIndices(groups: ShelfGroup[]): Set<number> {
  const s = new Set<number>();
  for (const g of groups) for (const idx of g.memberIndices) s.add(idx);
  return s;
}

function categoryTotalItems(categoryId: string, gameData: GameData): number {
  return gameData.categories.find((c) => c.id === categoryId)?.items.length ?? 0;
}

function isCategoryComplete(categoryId: string, groups: ShelfGroup[], gameData: GameData): boolean {
  const total = categoryTotalItems(categoryId, gameData);
  return groups.some((g) => g.categoryId === categoryId && g.memberIndices.length >= total);
}

// --- Validation ---

// Two uncollected tiles → always creates a brand-new group
export function validatePair(
  idx1: number,
  idx2: number,
  flatItems: FlatItem[],
  groups: ShelfGroup[]
): PairResult {
  if (idx1 === idx2) return { valid: false };
  const item1 = flatItems[idx1];
  const item2 = flatItems[idx2];
  if (!item1 || !item2) return { valid: false };
  if (item1.categoryId !== item2.categoryId) return { valid: false };

  const collected = collectedIndices(groups);
  if (collected.has(idx1) || collected.has(idx2)) return { valid: false };

  return {
    valid: true,
    newGroup: {
      groupId: crypto.randomUUID(),
      categoryId: item1.categoryId,
      memberIndices: [idx1, idx2],
    },
  };
}

// Single tile → placed onto an existing shelf group; valid only if categories match
export function validatePlaceTile(
  tileIdx: number,
  groupId: string,
  flatItems: FlatItem[],
  groups: ShelfGroup[]
): PlaceTileResult {
  const item = flatItems[tileIdx];
  if (!item) return { valid: false };

  const collected = collectedIndices(groups);
  if (collected.has(tileIdx)) return { valid: false };

  const targetGroup = groups.find((g) => g.groupId === groupId);
  if (!targetGroup) return { valid: false };

  if (item.categoryId !== targetGroup.categoryId) return { valid: false };

  return { valid: true, groupId };
}

// Merge 2+ shelf groups → valid only if all share the same category
export function validateMerge(
  groupIds: string[],
  groups: ShelfGroup[]
): MergeGroupsResult {
  if (groupIds.length < 2) return { valid: false };

  const targets = groupIds.map((id) => groups.find((g) => g.groupId === id));
  if (targets.some((g) => !g)) return { valid: false };

  const categoryId = targets[0]!.categoryId;
  if (targets.some((g) => g!.categoryId !== categoryId)) return { valid: false };

  const mergedGroup: ShelfGroup = {
    groupId: crypto.randomUUID(),
    categoryId,
    memberIndices: targets.flatMap((g) => g!.memberIndices),
  };
  return { valid: true, mergedGroup };
}

// --- State updaters ---

export function applyPair(state: GameState, result: PairResult, gameData: GameData): GameState {
  if (!result.valid) {
    return { ...state, score: clampScore(state.score + WRONG_GUESS), wrongGuesses: state.wrongGuesses + 1, streak: 0 };
  }
  const newStreak = state.streak + 1;
  const { bonus: sb } = streakBonus(state.streak, newStreak);
  const newGroups = [...state.groups, result.newGroup];
  const complete = isCategoryComplete(result.newGroup.categoryId, newGroups, gameData);
  const categoryBonus = complete ? CATEGORY_COMPLETE_BONUS : 0;
  const allComplete = gameData.categories.every((c) => isCategoryComplete(c.id, newGroups, gameData));
  return {
    ...state,
    score: clampScore(state.score + PAIR_CORRECT + categoryBonus + sb),
    streak: newStreak,
    groups: newGroups,
    completedAt: allComplete ? new Date().toISOString() : state.completedAt,
  };
}

export function applyPlaceTile(state: GameState, result: PlaceTileResult, tileIdx: number, gameData: GameData): GameState {
  if (!result.valid) {
    return { ...state, score: clampScore(state.score + WRONG_GUESS), wrongGuesses: state.wrongGuesses + 1, streak: 0 };
  }
  const newStreak = state.streak + 1;
  const { bonus: sb } = streakBonus(state.streak, newStreak);
  const newGroups = state.groups.map((g) =>
    g.groupId === result.groupId
      ? { ...g, memberIndices: [...g.memberIndices, tileIdx] }
      : g
  );
  const targetGroup = newGroups.find((g) => g.groupId === result.groupId)!;
  const complete = isCategoryComplete(targetGroup.categoryId, newGroups, gameData);
  const categoryBonus = complete ? CATEGORY_COMPLETE_BONUS : 0;
  const allComplete = gameData.categories.every((c) => isCategoryComplete(c.id, newGroups, gameData));
  return {
    ...state,
    score: clampScore(state.score + PLACE_CORRECT + categoryBonus + sb),
    streak: newStreak,
    groups: newGroups,
    completedAt: allComplete ? new Date().toISOString() : state.completedAt,
  };
}

export function applyMerge(state: GameState, result: MergeGroupsResult, mergedGroupIds: string[], gameData: GameData): GameState {
  if (!result.valid) {
    return { ...state, score: clampScore(state.score + WRONG_GUESS), wrongGuesses: state.wrongGuesses + 1, streak: 0 };
  }
  const newStreak = state.streak + 1;
  const { bonus: sb } = streakBonus(state.streak, newStreak);
  // Insert merged group at the position of the first selected group
  const firstIndex = state.groups.findIndex((g) => g.groupId === mergedGroupIds[0]);
  const without = state.groups.filter((g) => !mergedGroupIds.includes(g.groupId));
  const insertAt = Math.min(firstIndex, without.length);
  const newGroups = [...without.slice(0, insertAt), result.mergedGroup, ...without.slice(insertAt)];
  const complete = isCategoryComplete(result.mergedGroup.categoryId, newGroups, gameData);
  const categoryBonus = complete ? CATEGORY_COMPLETE_BONUS : 0;
  const allComplete = gameData.categories.every((c) => isCategoryComplete(c.id, newGroups, gameData));
  return {
    ...state,
    score: clampScore(state.score + MERGE_CORRECT + categoryBonus + sb),
    streak: newStreak,
    groups: newGroups,
    completedAt: allComplete ? new Date().toISOString() : state.completedAt,
  };
}

// --- View model builders ---

export function buildTileViewModels(
  flatItems: FlatItem[],
  groups: ShelfGroup[],
  selectedTileIndices: number[],
  compactMode = false
): TileViewModel[] {
  const collected = collectedIndices(groups);
  const result: TileViewModel[] = [];
  for (const item of flatItems) {
    if (collected.has(item.globalIndex)) {
      if (!compactMode) result.push({ globalIndex: item.globalIndex, label: item.itemLabel, categoryId: item.categoryId, status: "collected" });
    } else {
      const status: TileStatus = selectedTileIndices.includes(item.globalIndex) ? "selected" : "unselected";
      result.push({ globalIndex: item.globalIndex, label: item.itemLabel, categoryId: item.categoryId, status });
    }
  }
  return result;
}

export function buildGroupTokenViewModels(
  groups: ShelfGroup[],
  categories: CategoryData[],
  flatItems: FlatItem[],
  selectedGroupIds: string[],
  gameData: GameData
): GroupTokenViewModel[] {
  return groups.map((g) => {
    const cat = categories.find((c) => c.id === g.categoryId);
    const totalCount = cat?.items.length ?? 0;
    const items = g.memberIndices.map((idx) => flatItems[idx]?.itemLabel ?? "").filter(Boolean);
    const complete = isCategoryComplete(g.categoryId, groups, gameData);
    return {
      groupId: g.groupId,
      categoryId: g.categoryId,
      categoryName: cat?.name ?? "?",
      memberCount: g.memberIndices.length,
      totalCount,
      isComplete: complete,
      isSelected: selectedGroupIds.includes(g.groupId),
      items,
    };
  });
}

export function countCompletedCategories(groups: ShelfGroup[], gameData: GameData): number {
  return gameData.categories.filter((c) => isCategoryComplete(c.id, groups, gameData)).length;
}
