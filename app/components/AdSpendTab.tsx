"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import StatCard from "./StatCard";
import { DailyAdSpend, DailyAdSpendCategory } from "@/lib/types";
import { sum } from "@/lib/calculations";

const CATEGORY_LABELS: Record<DailyAdSpendCategory, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  other: "অন্যান্য",
};

export default function AdSpendTab({
  dailyAdSpend,
  onAdd,
  onDelete,
}: {
  dailyAdSpend: DailyAdSpend[];
  onAdd: (entry: Omit<DailyAdSpend, "id" | "createdAt">) => Promise<string | void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "facebook" as DailyAdSpendCategory,
    amount: "",
    note: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd({
      date: form.date,
      category: form.category,
      amount: parseFloat(form.amount) || 0,
      note: form.note,
    });
    setShowForm(false);
    setForm({ ...form, amount: "", note: "" });
  }

  const totalThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return sum(dailyAdSpend.filter((d) => d.date.startsWith(thisMonth)).map((d) => d.amount));
  }, [dailyAdSpend]);

  const fbTotal = sum(dailyAdSpend.filter((d) => d.category === "facebook").map((d) => d.amount));
  const ttTotal = sum(dailyAdSpend.filter((d) => d.category === "tiktok").map((d) => d.amount));

  const columns: ColumnDef<DailyAdSpend>[] = [
    { header: "তারিখ", render: (d) => <span className="text-[var(--text-muted)]">{d.date}</span> },
    {
      header: "প্ল্যাটফর্ম",
      render: (d) => <span className="tag-brown text-[10px] px-2 py-0.5 rounded-full">{CATEGORY_LABELS[d.category]}</span>,
    },
    { header: "খরচ", render: (d) => <span className="num text-[var(--red)]">৳{d.amount.toLocaleString("en-BD")}</span> },
    { header: "নোট", render: (d) => <span className="text-[var(--text-muted)] max-w-[200px] truncate inline-block">{d.note || "—"}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">অ্যাড খরচ</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            দৈনিক টোটাল লিখে রাখো — এখান থেকেই অর্ডারে &quot;গড় থেকে নিক&quot; অপশন কাজ করে
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন এন্ট্রি
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="এই মাসের টোটাল" value={`৳${totalThisMonth.toLocaleString("en-BD")}`} tone="negative" />
        <StatCard label="Facebook টোটাল" value={`৳${fbTotal.toLocaleString("en-BD")}`} />
        <StatCard label="TikTok টোটাল" value={`৳${ttTotal.toLocaleString("en-BD")}`} />
      </div>

      <DataTable columns={columns} rows={dailyAdSpend} onDelete={onDelete} emptyMessage="এখনো কোনো অ্যাড খরচ লেখা হয়নি।" />

      {showForm && (
        <FormPanel title="নতুন অ্যাড খরচ" onClose={() => setShowForm(false)} onSubmit={handleSubmit}>
          <div>
            <FieldLabel>তারিখ</FieldLabel>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <FieldLabel>প্ল্যাটফর্ম</FieldLabel>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DailyAdSpendCategory })} className={inputClass}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>খরচ (৳)</FieldLabel>
            <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
          </div>
          <div>
            <FieldLabel>নোট</FieldLabel>
            <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="ঐচ্ছিক" />
          </div>
        </FormPanel>
      )}
    </div>
  );
}
