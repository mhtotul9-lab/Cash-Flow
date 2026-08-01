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
      ? "bg-[image:var(--gradient-green)] shadow-[0_4px_12px_rgba(31,122,82,0.3)]"
      : tone === "negative"
      ? "bg-[var(--red)] shadow-[0_4px_12px_rgba(194,59,59,0.3)]"
      : tone === "warning"
      ? "bg-[var(--mustard)] shadow-[0_4px_12px_rgba(184,132,26,0.3)]"
      : "bg-[image:var(--gradient-brown)] shadow-[0_4px_12px_rgba(154,111,53,0.3)]";

  return (
    <div className="card-lift animate-fade-in bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
        {Icon && (
          <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${iconChip}`}>
            <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.2} />
          </span>
        )}
        <span className="text-[11px] sm:text-xs text-[var(--text-muted)] leading-tight text-right">{label}</span>
      </div>
      <div
        className={`num font-[family-name:var(--font-mono)] text-xl sm:text-[26px] font-semibold tracking-tight ${toneColor}`}
      >
        {value}
        {suffix && <span className="text-xs sm:text-sm text-[var(--text-muted)] ml-1">{suffix}</span>}
      </div>
      {sublabel && <p className="text-[10px] sm:text-[11px] text-[var(--text-faint)] mt-1 sm:mt-1.5 leading-snug">{sublabel}</p>}
    </div>
  );
}
