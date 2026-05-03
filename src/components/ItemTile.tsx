import { useEffect, useRef } from "react";
import type { TileStatus } from "../types";
import { registerDropZone } from "../useDrag";

interface ItemTileProps {
  globalIndex: number;
  label: string;
  status: TileStatus;
  isDragOver: boolean;
  debugColor: string | null;
  onClick?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
}

export default function ItemTile({
  globalIndex,
  label,
  status,
  isDragOver,
  debugColor,
  onClick,
  onDragStart,
}: ItemTileProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === "collected") return;
    registerDropZone(`tile-${globalIndex}`, { kind: "tile", globalIndex }, ref.current);
    return () => registerDropZone(`tile-${globalIndex}`, { kind: "tile", globalIndex }, null);
  }, [globalIndex, status]);

  if (status === "collected") {
    return <div className="tile tile--placeholder" aria-hidden />;
  }

  const cls = [
    "tile",
    status === "selected" ? "tile--selected" : "",
    isDragOver ? "tile--drag-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      className={cls}
      onClick={onClick}
      title={label}
      onPointerDown={onDragStart}
      style={{
        touchAction: onDragStart ? "none" : undefined,
        backgroundColor: debugColor ?? undefined,
      }}
    >
      <span className="tile__label">{label}</span>
    </button>
  );
}
