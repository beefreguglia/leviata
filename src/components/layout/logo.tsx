/** Marca provisória da Leviata — trocar por /public/logo.png quando a fac enviar o logo. */
export function LeviataMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M4 20c3-1 5-4 6-8 1 4 3 6 6 6s5-3 6-7c1 5 3 8 6 9-2 2-5 4-12 4S6 22 4 20Z"
        fill="currentColor"
      />
      <circle cx="12.5" cy="17" r="1" fill="var(--background)" />
    </svg>
  );
}

export function LeviataWordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LeviataMark className="size-5" />
      </span>
      <span className="text-lg font-bold">Leviata</span>
    </div>
  );
}
