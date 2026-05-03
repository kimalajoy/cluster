import { useEffect, useRef } from "react";
import type { GroupTokenViewModel } from "../types";
import { registerDropZone } from "../useDrag";

interface GroupTokenProps {
  token: GroupTokenViewModel;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent) => void;
  onClick: () => void;
  categoryColor: string | null;
  debugMode: boolean;
}

export default function GroupToken({
  token,
  isDragOver,
  isDragging,
  onDragStart,
  onClick,
  categoryColor,
  debugMode,
}: GroupTokenProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerDropZone(token.groupId, { kind: "group", groupId: token.groupId }, ref.current);
    return () => registerDropZone(token.groupId, { kind: "group", groupId: token.groupId }, null);
  }, [token.groupId]);

  const label = token.isComplete ? token.categoryName : "? Group";
  const detail = `${token.memberCount} / ${token.totalCount}`;
  const peekItems = token.items.slice(0, 3).join(", ");
  const tooltip = token.items.join(", ");

  const cls = [
    "group-token",
    token.isComplete ? "group-token--complete" : "",
    token.isSelected ? "group-token--selected" : "",
    isDragOver ? "group-token--drag-over" : "",
    isDragging ? "group-token--dragging" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={ref}
      className={cls}
      title={tooltip}
      onPointerDown={onDragStart}
      onClick={onClick}
      style={{
        touchAction: "none",
        ...((token.isComplete || debugMode) && categoryColor
          ? { backgroundColor: categoryColor, borderColor: categoryColor, color: "#111" }
          : {}),
      }}
    >
      <span className="group-token__label">{label}</span>
      <span className="group-token__peek">{peekItems}</span>
      <span className="group-token__detail">{detail}</span>
    </div>
  );
}
