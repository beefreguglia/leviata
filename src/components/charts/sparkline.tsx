/** Linha mínima de tendência. Decorativa: o valor precisa estar escrito ao lado. */
export function Sparkline({ values, color, className }: { values: number[]; color: string; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${range === 0 ? 50 : 92 - ((v - min) / range) * 84}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
