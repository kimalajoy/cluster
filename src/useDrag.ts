import { useState, useCallback, useRef, useEffect } from "react";

export type DragSource =
  | { kind: "tile"; globalIndex: number }
  | { kind: "group"; groupId: string };

export type DropTarget =
  | { kind: "tile"; globalIndex: number }
  | { kind: "group"; groupId: string };

export interface DragState {
  source: DragSource | null;
  overTarget: DropTarget | null;
}

export interface DragHandlers {
  dragState: DragState;
  onDragStart: (source: DragSource, e: React.PointerEvent) => void;
  onDragCancel: () => void;
  didDrag: () => boolean;
}

// Drop zone registry — keyed by a stable string ID
const registry = new Map<string, { el: HTMLElement; target: DropTarget }>();

export function registerDropZone(id: string, target: DropTarget, el: HTMLElement | null) {
  if (el) registry.set(id, { el, target });
  else registry.delete(id);
}

function targetAtPoint(x: number, y: number): DropTarget | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    for (const entry of registry.values()) {
      if (entry.el === el || entry.el.contains(el)) return entry.target;
    }
  }
  return null;
}

function targetsEqual(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "tile" && b.kind === "tile") return a.globalIndex === b.globalIndex;
  if (a.kind === "group" && b.kind === "group") return a.groupId === b.groupId;
  return false;
}

const DRAG_THRESHOLD = 6;

export function useDrag(
  onDrop: (source: DragSource, target: DropTarget) => void
): DragHandlers {
  const [dragState, setDragState] = useState<DragState>({ source: null, overTarget: null });
  const stateRef = useRef<DragState>({ source: null, overTarget: null });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const setDragStateSynced = useCallback((next: DragState) => {
    stateRef.current = next;
    setDragState(next);
  }, []);

  const onDropRef = useRef(onDrop);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);

  useEffect(() => {
    let active = false;

    function onMove(e: PointerEvent) {
      if (!active || !stateRef.current.source) return;

      if (!movedRef.current && startPosRef.current) {
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        movedRef.current = true;
      }

      const overTarget = targetAtPoint(e.clientX, e.clientY);
      if (!targetsEqual(overTarget, stateRef.current.overTarget)) {
        setDragStateSynced({ ...stateRef.current, overTarget });
      }
    }

    function onUp() {
      if (!active) return;
      active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);

      const { source, overTarget } = stateRef.current;
      const moved = movedRef.current;
      setDragStateSynced({ source: null, overTarget: null });

      if (source && overTarget && moved) {
        onDropRef.current(source, overTarget);
      }
    }

    function onCancel() {
      active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      setDragStateSynced({ source: null, overTarget: null });
    }

    (window as any).__dragActivate = (source: DragSource, startX: number, startY: number) => {
      active = true;
      movedRef.current = false;
      startPosRef.current = { x: startX, y: startY };
      stateRef.current = { source, overTarget: null };
      setDragState({ source, overTarget: null });
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    };

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      delete (window as any).__dragActivate;
    };
  }, [setDragStateSynced]);

  const onDragStart = useCallback((source: DragSource, e: React.PointerEvent) => {
    e.preventDefault();
    (window as any).__dragActivate?.(source, e.clientX, e.clientY);
  }, []);

  const onDragCancel = useCallback(() => {
    setDragStateSynced({ source: null, overTarget: null });
  }, [setDragStateSynced]);

  const didDrag = useCallback(() => movedRef.current, []);

  return { dragState, onDragStart, onDragCancel, didDrag };
}
