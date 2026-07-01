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

  return (
    <div className="card-elevated bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <span className="text-[11px] sm:text-xs text-[var(--text-muted)] leading-tight">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />}
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
