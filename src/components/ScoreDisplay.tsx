interface ScoreDisplayProps {
  score: number;
  wrongGuesses: number;
  streak: number;
  completedCategories: number;
  totalCategories: number;
}

export default function ScoreDisplay({
  score,
  wrongGuesses,
  streak,
  completedCategories,
  totalCategories,
}: ScoreDisplayProps) {
  return (
    <div className="score-display">
      <span className="score-display__score">Score: {score}</span>
      <span className="score-display__wrong">Wrong: {wrongGuesses}</span>
      {streak >= 3 && (
        <span className="score-display__streak">🔥 {streak}</span>
      )}
      <span className="score-display__progress">
        {completedCategories}/{totalCategories} complete
      </span>
    </div>
  );
}
