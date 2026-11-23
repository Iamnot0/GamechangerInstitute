type GapMarkProps = { className?: string };

export function GapMark({ className }: GapMarkProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="4" y="9" width="24" height="4" rx="2" className="gap-mark__capacity" />
      <rect x="4" y="19" width="13" height="4" rx="2" className="gap-mark__performance" />
      <rect x="20" y="19" width="8" height="4" rx="2" className="gap-mark__gap" />
    </svg>
  );
}
