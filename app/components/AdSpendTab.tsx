"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import StatCard from "./StatCard";
import { DailyAdSpend, DailyAdSpendCategory } from "@/lib/types";
import { sum, round2 } from "@/lib/calculations";

const CATEGORY_LABELS: Record<DailyAdSpendCategory, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  other: "অন্যান্য",
};

export default function AdSpendTab({
  dailyAdSpend,
  onAdd,
  onDelete,
  latestDollarRate,
}: {
  dailyAdSpend: DailyAdSpend[];
  onAdd: (entry: Omit<DailyAdSpend, "id" | "createdAt">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  latestDollarRate: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [useUSD, setUseUSD] = useState(true); // ডিফল্ট ডলারে
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "facebook" as DailyAdSpendCategory,
    amount: "",
    amountUSD: "",
    dollarRate: latestDollarRate.toString(),
    note: "",
  });

  const amountBDT = useUSD
    ? round2(
        (parseFloat(form.amountUSD) || 0) *
          (parseFloat(form.dollarRate) || latestDollarRate)
      )
    : parseFloat(form.amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(form.dollarRate) || latestDollarRate;
    const usd = parseFloat(form.amountUSD) || 0;
    const bdt = useUSD ? round2(usd * rate) : parseFloat(form.amount) || 0;

    await onAdd({
      date: form.date,
      category: form.category,
      amount: bdt,
      amountUSD: useUSD ? usd : undefined,
      dollarRate: useUSD ? rate : undefined,
      note: form.note,
    });
    setShowForm(false);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: "facebook",
      amount: "",
      amountUSD: "",
      dollarRate: latestDollarRate.toString(),
      note: "",
    });
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalThisMonth = useMemo(
    () => sum(dailyAdSpend.filter((d) => d.date.startsWith(thisMonth)).map((d) => d.amount)),
    [dailyAdSpend, thisMonth]
  );
  const totalUSDThisMonth = useMemo(
    () => sum(dailyAdSpend.filter((d) => d.date.startsWith(thisMonth)).map((d) => d.amountUSD || 0)),
    [dailyAdSpend, thisMonth]
  );
  const fbTotal = sum(dailyAdSpend.filter((d) => d.category === "facebook").map((d) => d.amount));
  const ttTotal = sum(dailyAdSpend.filter((d) => d.category === "tiktok").map((d) => d.amount));

  const columns: ColumnDef<DailyAdSpend>[] = [
    {
      header: "তারিখ",
      render: (d) => <span className="text-[var(--text-muted)] text-xs">{d.date}</span>,
    },
    {
      header: "প্ল্যাটফর্ম",
      render: (d) => (
        <span className="tag-brown text-[10px] px-2 py-0.5 rounded-full">
          {CATEGORY_LABELS[d.category]}
        </span>
      ),
    },
    {
      header: "খরচ",
      render: (d) => (
        <span className="num text-[var(--red)]">
          ৳{d.amount.toLocaleString("en-BD")}
          {d.amountUSD && (
            <span className="text-[var(--text-faint)] text-[10px] ml-1">
              (${d.amountUSD})
            </span>
          )}
        </span>
      ),
    },
    {
      header: "নোট",
      render: (d) => (
        <span className="text-[var(--text-muted)] max-w-[180px] truncate inline-block">
          {d.note || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">অ্যাড খরচ</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            প্রতিদিন Facebook/TikTok এ কত $ খরচ হলো লিখে রাখো
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2.5 sm:py-2 rounded-lg hover:opacity-90 transition-opacity btn-press"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন এন্ট্রি
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatCard
          label="এই মাসের টোটাল"
          value={`৳${totalThisMonth.toLocaleString("en-BD")}`}
          sublabel={totalUSDThisMonth > 0 ? `$${totalUSDThisMonth}` : undefined}
          tone="negative"
        />
        <StatCard label="Facebook" value={`৳${fbTotal.toLocaleString("en-BD")}`} />
        <StatCard label="TikTok" value={`৳${ttTotal.toLocaleString("en-BD")}`} />
      </div>

      <DataTable
        columns={columns}
        rows={dailyAdSpend}
        onDelete={onDelete}
        emptyMessage="এখনো কোনো অ্যাড খরচ লেখা হয়নি।"
      />

      {showForm && (
        <FormPanel
          title="নতুন অ্যাড খরচ"
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        >
          <div>
            <FieldLabel>তারিখ</FieldLabel>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>প্ল্যাটফর্ম</FieldLabel>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as DailyAdSpendCategory })}
              className={inputClass}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* টাকা/ডলার সিলেক্ট */}
          <div>
            <FieldLabel>কোন মুদ্রায় দেবে?</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseUSD(true)}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  useUSD
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                $ ডলারে
              </button>
              <button
                type="button"
                onClick={() => setUseUSD(false)}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  !useUSD
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                ৳ টাকায়
              </button>
            </div>
          </div>

          {useUSD ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>খরচ ($)</FieldLabel>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amountUSD}
                  onChange={(e) => setForm({ ...form, amountUSD: e.target.value })}
                  className={inputClass}
                  placeholder="50"
                  autoFocus
                />
              </div>
              <div>
                <FieldLabel>ডলার রেট (৳)</FieldLabel>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={form.dollarRate}
                  onChange={(e) => setForm({ ...form, dollarRate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>খরচ (৳)</FieldLabel>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputClass}
                placeholder="5500"
                autoFocus
              />
            </div>
          )}

          {/* লাইভ কনভার্সন */}
          {useUSD && form.amountUSD && (
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">
                  ${form.amountUSD} × ৳{form.dollarRate}
                </span>
                <span className="num font-medium text-[var(--red)]">
                  = ৳{amountBDT.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          )}

          <div>
            <FieldLabel>নোট (ঐচ্ছিক)</FieldLabel>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputClass}
              placeholder="যেমন: পেজ বুস্ট"
            />
          </div>
        </FormPanel>
      )}
    </div>
  );
}
