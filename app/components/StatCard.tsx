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
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--border-strong)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-faint)]" />}
      </div>
      <div
        className={`num font-[family-name:var(--font-mono)] text-2xl font-medium tracking-tight ${toneColor}`}
      >
        {value}
        {suffix && <span className="text-sm text-[var(--text-muted)] ml-1">{suffix}</span>}
      </div>
      {sublabel && <p className="text-[11px] text-[var(--text-faint)] mt-1.5">{sublabel}</p>}
    </div>
  );
}
