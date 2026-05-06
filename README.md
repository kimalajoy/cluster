# Cluster

A Connections-style puzzle game. Find matching tiles, pair them up, and build groups to complete every category. I had so much fun with Thomas Colthurst [45 by 45 Connections puzzle he wrote to commemorate 2025](https://thomaswc.com/2025.html) that I wanted to keep playing! So, I made my own version with new categories!

## How to play

- **Click two tiles** of the same category to pair them — they move to the shelf as a group
- **Click a tile then a shelf group** to add it to that group
- **Click two shelf groups** of the same category to merge them
- **Drag and drop** works for all of the above
- A category is complete when all its items are in a single group
- Correct moves build your streak; wrong guesses cost points

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview the production build
```

## Adding a puzzle

Edit `src/data/game.json`. The structure is:

```json
{
  "id": "unique-puzzle-id",
  "title": "Puzzle Title",
  "categories": [
    {
      "id": "category-id",
      "name": "Display Name",
      "items": ["Item 1", "Item 2", "..."]
    }
  ]
}
```

Any number of categories and items per category are supported. Change the top-level `id` when publishing a new puzzle — this clears players' saved progress automatically.

## Built with

- [React 19](https://react.dev)
- [Vite](https://vitejs.dev)
- [TanStack Virtual](https://tanstack.com/virtual) — virtualized tile grid
- TypeScript
