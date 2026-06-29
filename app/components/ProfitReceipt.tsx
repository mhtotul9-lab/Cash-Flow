"use client";

export interface ReceiptLine {
  label: string;
  value: number;
  sign: "+" | "-" | "=";
  emphasis?: boolean;
}

export default function ProfitReceipt({
  lines,
  result,
}: {
  lines: ReceiptLine[];
  result: number;
}) {
  return (
    <div className="receipt-card border border-[var(--border-subtle)] rounded-xl px-5 pt-5 pb-4">
      <p className="text-xs text-[var(--text-faint)] mb-3 font-[family-name:var(--font-mono)] uppercase tracking-wide">
        হিসাব
      </p>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between text-sm receipt-line pb-2">
            <span className="text-[var(--text-muted)]">
              <span className="num text-[var(--text-faint)] mr-2">{line.sign}</span>
              {line.label}
            </span>
            <span
              className={`num font-medium ${
                line.sign === "-" ? "text-[var(--red)]" : "text-[var(--text-primary)]"
              }`}
            >
              ৳{line.value.toLocaleString("en-BD")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-1">
        <span className="font-[family-name:var(--font-display)] font-medium text-sm">নেট প্রফিট</span>
        <span
          className={`num font-[family-name:var(--font-display)] font-semibold text-xl ${
            result < 0 ? "text-[var(--red)]" : "text-[var(--green)]"
          }`}
        >
          {result < 0 ? "−" : ""}৳{Math.abs(result).toLocaleString("en-BD")}
        </span>
      </div>
    </div>
  );
}
