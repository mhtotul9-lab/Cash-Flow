"use client";

import { AlertTriangle, AlertCircle, Info, ShieldAlert } from "lucide-react";
import { Alert } from "@/lib/types";

const SEVERITY_CONFIG = {
  critical: { icon: ShieldAlert, color: "var(--red)", label: "জরুরি" },
  high: { icon: AlertTriangle, color: "var(--red)", label: "উচ্চ" },
  medium: { icon: AlertCircle, color: "var(--mustard)", label: "মাঝারি" },
  low: { icon: Info, color: "var(--text-muted)", label: "নিম্ন" },
};

export default function AlertsTab({ alerts }: { alerts: Alert[] }) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">সতর্কতা</h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5">যেসব বিষয়ে এখন নজর দেওয়া উচিত</p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 sm:p-10 text-center">
          <p className="text-sm text-[var(--green)]">কোনো সতর্কতা নেই — সবকিছু ঠিক আছে।</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity];
            const Icon = config.icon;
            return (
              <div key={alert.id} className="card-elevated bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex items-start gap-3">
                <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" style={{ color: config.color }} />
                <div className="flex-1">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-1"
                    style={{ color: config.color, background: `${config.color}1F` }}
                  >
                    {config.label}
                  </span>
                  <p className="text-sm text-[var(--text-primary)]">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
