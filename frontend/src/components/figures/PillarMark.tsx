type PillarMarkProps = { className?: string };

export function PillarMark({ className }: PillarMarkProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <path
        className="pillar-mark__ring"
        d="M184.83 54.43A98 98 0 1 0 118 217.82M168.48 69.15A76 76 0 1 0 118 195.76M152.13 83.87A54 54 0 1 0 118 173.67"
      />
      <g className="pillar-mark__column">
        <rect x="128" y="102" width="104" height="14" rx="2" />
        <rect x="142" y="124" width="16" height="70" rx="8" />
        <rect x="172" y="124" width="16" height="70" rx="8" />
        <rect x="202" y="124" width="16" height="70" rx="8" />
        <rect x="140" y="201" width="80" height="9" rx="1.5" />
        <rect x="128" y="214" width="104" height="14" rx="2" />
      </g>
    </svg>
  );
}
