// src/components/ProgressBar.tsx
type Props = { value: number };

export default function ProgressBar({ value }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="progress" aria-label="Progresso">
      <div className="progressBar" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}
