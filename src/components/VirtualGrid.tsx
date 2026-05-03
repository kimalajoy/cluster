import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TileViewModel } from "../types";
import ItemTile from "./ItemTile";

const ROW_HEIGHT_ESTIMATE = 80;

function getColumns(width: number): number {
  if (width < 400) return 3;
  if (width < 600) return 4;
  if (width < 900) return 5;
  if (width < 1200) return 6;
  return 7;
}

interface VirtualGridProps {
  tiles: TileViewModel[];
  dragOverTileIndex: number | null;
  onTileClick: (globalIndex: number) => void;
  onTileDragStart: (globalIndex: number, e: React.PointerEvent) => void;
  categoryColorMap: Map<string, string> | null;
}

export default function VirtualGrid({ tiles, dragOverTileIndex, onTileClick, onTileDragStart, categoryColorMap }: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(getColumns(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Update scrollMargin after layout so virtualizer knows where the grid starts on the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const rows = useMemo(() => {
    const chunks: TileViewModel[][] = [];
    for (let i = 0; i < tiles.length; i += columns) {
      chunks.push(tiles.slice(i, i + columns));
    }
    return chunks;
  }, [tiles, columns]);

  const measureElement = useCallback((el: Element | null) => {
    if (!el) return ROW_HEIGHT_ESTIMATE;
    return (el as HTMLElement).offsetHeight;
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => document.documentElement,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 5,
    measureElement,
    scrollMargin,
  });

  return (
    <div ref={containerRef} className="virtual-grid-container">
      <div
        className="virtual-grid-inner"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowTiles = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="virtual-grid-row"
              style={{
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              {rowTiles.map((tile) => (
                <ItemTile
                  key={tile.globalIndex}
                  globalIndex={tile.globalIndex}
                  label={tile.label}
                  status={tile.status}
                  isDragOver={dragOverTileIndex === tile.globalIndex}
                  debugColor={tile.status !== "collected" && categoryColorMap ? (categoryColorMap.get(tile.categoryId) ?? null) : null}
                  onClick={tile.status !== "collected" ? () => onTileClick(tile.globalIndex) : undefined}
                  onDragStart={tile.status !== "collected" ? (e) => onTileDragStart(tile.globalIndex, e) : undefined}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
