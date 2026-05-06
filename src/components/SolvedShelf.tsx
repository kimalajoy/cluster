import type { GroupTokenViewModel } from "../types";
import type { DragState } from "../useDrag";
import GroupToken from "./GroupToken";

interface SolvedShelfProps {
  groupTokens: GroupTokenViewModel[];
  dragState: DragState;
  onGroupTokenClick: (groupId: string) => void;
  onGroupDragStart: (groupId: string, e: React.PointerEvent) => void;
  categoryColorMap: Map<string, string>;
  debugMode: boolean;
  compactMode: boolean;
  onToggleCompact: () => void;
  totalCategories: number;
}

export default function SolvedShelf({
  groupTokens,
  dragState,
  onGroupTokenClick,
  onGroupDragStart,
  categoryColorMap,
  debugMode,
  compactMode,
  onToggleCompact,
  totalCategories,
}: SolvedShelfProps) {
  if (groupTokens.length === 0) return null;

  const uniqueCategories = new Set(groupTokens.map((t) => t.categoryId)).size;

  return (
    <div className="solved-shelf">
      <div className="solved-shelf__header">
        <span className="solved-shelf__count">{uniqueCategories}/{totalCategories} {uniqueCategories === 1 ? "category" : "categories"} · {groupTokens.length} {groupTokens.length === 1 ? "group" : "groups"}</span>
        {!compactMode && (
          <button className="controls__btn solved-shelf__compact-btn" onClick={onToggleCompact}>
            Collapse gaps
          </button>
        )}
      </div>
      <div className="solved-shelf__groups">
        {groupTokens.map((t) => (
          <GroupToken
            key={t.groupId}
            token={t}
            isDragOver={dragState.overTarget?.kind === "group" && dragState.overTarget.groupId === t.groupId && dragState.source !== null}
            isDragging={dragState.source?.kind === "group" && dragState.source.groupId === t.groupId}
            onDragStart={(e) => onGroupDragStart(t.groupId, e)}
            onClick={() => onGroupTokenClick(t.groupId)}
            categoryColor={categoryColorMap.get(t.categoryId) ?? null}
            debugMode={debugMode}
          />
        ))}
      </div>
    </div>
  );
}
