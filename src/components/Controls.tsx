interface ControlsProps {
  canDeselect: boolean;
  onDeselect: () => void;
  onReset: () => void;
}

export default function Controls({ canDeselect, onDeselect, onReset }: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls__actions">
        <button
          className="controls__btn controls__btn--deselect"
          disabled={!canDeselect}
          onClick={onDeselect}
        >
          Deselect
        </button>
        <button
          className="controls__btn controls__btn--reset"
          onClick={onReset}
          title="Reset game"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
