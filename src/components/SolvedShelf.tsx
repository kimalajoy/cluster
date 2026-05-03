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
}

export default function SolvedShelf({
  groupTokens,
  dragState,
  onGroupTokenClick,
  onGroupDragStart,
  categoryColorMap,
  debugMode,
}: SolvedShelfProps) {
  if (groupTokens.length === 0) return null;

  return (
    <div className="solved-shelf">
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
