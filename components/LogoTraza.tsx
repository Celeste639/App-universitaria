type TrazaIconProps = {
  className?: string;
  simple?: boolean;
};

export function TrazaIcon({ className = "h-8 w-8", simple = false }: TrazaIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#F1E2CF" />
      <path d="M2 16C2 8.3 8.3 2 16 2h32c7.7 0 14 6.3 14 14v18L28 62H16C8.3 62 2 55.7 2 48V16Z" fill="#B6CFDB" />
      <path
        d="M18 22c8 0 12 4 14 10 2 6 8 8 16 6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M32 22v22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {!simple && (
        <>
          <path
            d="M34 48c6 2 10 6 14 10"
            fill="none"
            stroke="#8AB0C4"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="2.5 3.5"
          />
          <circle cx="50" cy="52" r="3.2" fill="#8AB0C4" />
        </>
      )}
      {simple && <circle cx="46" cy="44" r="4" fill="#8AB0C4" />}
    </svg>
  );
}

export function LogoTraza({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-8 items-center gap-2 ${className}`}>
      <TrazaIcon className="h-8 w-8 shrink-0" />
      <span className="text-[1.35rem] font-medium leading-none tracking-tight text-text">
        traza
      </span>
    </span>
  );
}
