import type { FlatItem, GameData } from "./types";

// LCG seeded PRNG — produces consistent sequences for a given seed
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = arr.slice();
  const rand = makePrng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildFlatItems(gameData: GameData, seed: number): FlatItem[] {
  const items: FlatItem[] = [];
  for (const cat of gameData.categories) {
    for (let i = 0; i < cat.items.length; i++) {
      items.push({
        globalIndex: -1,
        categoryId: cat.id,
        itemLabel: cat.items[i],
      });
    }
  }
  const shuffled = seededShuffle(items, seed);
  return shuffled.map((item, i) => ({ ...item, globalIndex: i }));
}
