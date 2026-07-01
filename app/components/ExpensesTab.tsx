"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import { ExpenseEntry, ExpenseCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fabric_purchase: "কাপড় পাইকারি কেনা (বাল্ক)",
  shipping: "শিপিং/কুরিয়ার",
  packaging: "প্যাকেজিং",
  salary: "স্টাফ বেতন",
  rent_utilities: "ভাড়া ও ইউটিলিটি",
  software_tools: "সফটওয়্যার/টুল",
  bank_charges: "ব্যাংক চার্জ",
  misc: "বিবিধ",
};

export default function ExpensesTab({
  expenses,
  onAdd,
  onDelete,
}: {
  expenses: ExpenseEntry[];
  onAdd: (entry: Omit<ExpenseEntry, "id" | "createdAt">) => Promise<string | void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "misc" as ExpenseCategory,
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

  const columns: ColumnDef<ExpenseEntry>[] = [
    { header: "তারিখ", render: (e) => <span className="text-[var(--text-muted)]">{e.date}</span> },
    { header: "ক্যাটেগরি", render: (e) => CATEGORY_LABELS[e.category] },
    { header: "নোট", render: (e) => <span className="text-[var(--text-muted)] max-w-[220px] truncate inline-block">{e.note || "—"}</span> },
    { header: "এমাউন্ট", render: (e) => <span className="num text-[var(--red)]">৳{e.amount.toLocaleString("en-BD")}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">অন্য খরচ</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">যেসব খরচ নির্দিষ্ট অর্ডারের সাথে যুক্ত না — বাল্ক কাপড় কেনা, বেতন, ভাড়া</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2.5 sm:py-2 rounded-lg hover:opacity-90 transition-opacity btn-press"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন খরচ
        </button>
      </div>

      <DataTable columns={columns} rows={expenses} onDelete={onDelete} emptyMessage="এখনো কোনো খরচ লেখা হয়নি।" />

      {showForm && (
        <FormPanel title="নতুন খরচ এন্ট্রি" onClose={() => setShowForm(false)} onSubmit={handleSubmit}>
          <div>
            <FieldLabel>তারিখ</FieldLabel>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <FieldLabel>ক্যাটেগরি</FieldLabel>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} className={inputClass}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>এমাউন্ট (৳)</FieldLabel>
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
