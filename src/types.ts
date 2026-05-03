export interface CategoryData {
  id: string;
  name: string;
  items: string[];
}

export interface GameData {
  id: string;
  title: string;
  categories: CategoryData[];
}

export interface FlatItem {
  globalIndex: number;
  categoryId: string;
  itemLabel: string;
}

// A group on the shelf — created by a pair, grown by merges or single-tile placements
export interface ShelfGroup {
  groupId: string;
  categoryId: string;       // the true category (used for validation)
  memberIndices: number[];  // globalIndices of all items in this group
}

export interface GameState {
  gameId: string;
  shuffleSeed: number;
  score: number;
  wrongGuesses: number;
  streak: number;
  groups: ShelfGroup[];
  completedAt: string | null;
}

export interface UIState {
  // Single tile selected from the grid (for placing onto a shelf group)
  selectedTileIndex: number | null;
  // Tiles selected for pairing (up to 2)
  selectedTileIndices: number[];
  // Group tokens selected on the shelf for merging
  selectedGroupIds: string[];
  lastResult: "correct" | "wrong" | null;
  streakMilestone: 3 | 5 | null;
}

export type TileStatus = "unselected" | "selected" | "collected";

export interface TileViewModel {
  globalIndex: number;
  label: string;
  categoryId: string;
  status: TileStatus;
}

export interface GroupTokenViewModel {
  groupId: string;
  categoryId: string;
  categoryName: string;
  memberCount: number;
  totalCount: number;
  isComplete: boolean;
  isSelected: boolean;
  items: string[];
}

// Result types
export type PairResult =
  | { valid: true; newGroup: ShelfGroup }
  | { valid: false };

export type PlaceTileResult =
  | { valid: true; groupId: string }
  | { valid: false };

export type MergeGroupsResult =
  | { valid: true; mergedGroup: ShelfGroup }
  | { valid: false };
