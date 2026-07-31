import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "neutral",
  sublabel,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning";
  sublabel?: string;
}) {
  const toneColor =
    tone === "positive"
      ? "text-[var(--green)]"
      : tone === "negative"
      ? "text-[var(--red)]"
      : tone === "warning"
      ? "text-[var(--mustard)]"
      : "text-[var(--text-primary)]";

  const iconChip =
    tone === "positive"
      ? "bg-[var(--green-soft)] text-[var(--green)]"
      : tone === "negative"
      ? "bg-[var(--red-soft)] text-[var(--red)]"
      : tone === "warning"
      ? "bg-[var(--mustard-soft)] text-[var(--mustard)]"
      : "bg-[var(--brown)]/10 text-[var(--brown)]";

  return (
    <div className="card-lift animate-fade-in bg-[image:var(--gradient-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <span className="text-[11px] sm:text-xs text-[var(--text-muted)] leading-tight">{label}</span>
        {Icon && (
          <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${iconChip}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div
        className={`num font-[family-name:var(--font-mono)] text-xl sm:text-2xl font-medium tracking-tight ${toneColor}`}
      >
        {value}
        {suffix && <span className="text-xs sm:text-sm text-[var(--text-muted)] ml-1">{suffix}</span>}
      </div>
      {sublabel && <p className="text-[10px] sm:text-[11px] text-[var(--text-faint)] mt-1 sm:mt-1.5 leading-snug">{sublabel}</p>}
    </div>
  );
}
