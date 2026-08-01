"use client";

import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import { DollarRate } from "@/lib/types";

export default function DollarRateTab({
  dollarRates,
  onAdd,
  onDelete,
  onUpdate,
}: {
  dollarRates: DollarRate[];
  onAdd: (entry: Omit<DollarRate, "id" | "createdAt">) => Promise<string | void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, patch: Partial<DollarRate>) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    rate: "",
    note: "",
  });

  function openAdd() {
    setEditingId(null);
    setForm({ date: new Date().toISOString().slice(0, 10), rate: "", note: "" });
    setShowForm(true);
  }

  function openEdit(entry: DollarRate) {
    setEditingId(entry.id);
    setForm({ date: entry.date, rate: String(entry.rate), note: entry.note || "" });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      date: form.date,
      rate: parseFloat(form.rate) || 0,
      note: form.note,
    };
    if (editingId && onUpdate) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ date: new Date().toISOString().slice(0, 10), rate: "", note: "" });
  }

  const latestRate = dollarRates[0]?.rate ?? 110;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRate = dollarRates.find((r) => r.date === todayStr);

  const columns: ColumnDef<DollarRate>[] = [
    {
      header: "তারিখ",
      render: (r) => (
        <span className="text-[var(--text-muted)] text-xs">{r.date}</span>
      ),
    },
    {
      header: "১ ডলার = কত টাকা",
      render: (r) => (
        <span className="num font-medium text-[var(--brown)]">
          ৳{r.rate.toLocaleString("en-BD")}
        </span>
      ),
    },
    {
      header: "নোট",
      render: (r) => (
        <span className="text-[var(--text-muted)]">{r.note || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
            ডলার রেট লগ
          </h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            প্রতিদিন রেট লিখে রাখো — অ্যাড খরচ ও পণ্য কেনায় অটো কনভার্ট হবে
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2.5 sm:py-2 rounded-lg hover:opacity-90 transition-opacity btn-press"
        >
          <Plus className="w-3.5 h-3.5" />
          আজকের রেট যুক্ত করো
        </button>
      </div>

      {/* বর্তমান রেট দেখানো */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 card-elevated">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--brown)]" />
            <p className="text-xs text-[var(--text-muted)]">সর্বশেষ রেট</p>
          </div>
          <p className="num text-2xl font-medium text-[var(--brown)]">
            ৳{latestRate.toLocaleString("en-BD")}
          </p>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">
            {dollarRates[0]?.date ?? "—"}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 card-elevated">
          <p className="text-xs text-[var(--text-muted)] mb-1.5">আজকের রেট</p>
          {todayRate ? (
            <>
              <p className="num text-2xl font-medium text-[var(--green)]">
                ৳{todayRate.rate.toLocaleString("en-BD")}
              </p>
              <p className="text-[10px] text-[var(--green)] mt-1">✓ যুক্ত আছে</p>
            </>
          ) : (
            <>
              <p className="num text-2xl font-medium text-[var(--text-faint)]">—</p>
              <p className="text-[10px] text-[var(--red)] mt-1">এখনো দেওয়া হয়নি</p>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={dollarRates}
        onDelete={onDelete}
        onEdit={onUpdate ? openEdit : undefined}
        emptyMessage="এখনো কোনো ডলার রেট লগ করা হয়নি।"
      />

      {showForm && (
        <FormPanel
          title={editingId ? "রেট এডিট করো" : "আজকের ডলার রেট"}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitLabel={editingId ? "আপডেট করো" : "সেভ করো"}
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
            <FieldLabel>১ ডলার = কত টাকা (৳)</FieldLabel>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              className={inputClass}
              placeholder="১১০"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>নোট (ঐচ্ছিক)</FieldLabel>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputClass}
              placeholder="যেমন: আজকের বাজার রেট"
            />
          </div>

          {/* লাইভ উদাহরণ */}
          {form.rate && (
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-3.5">
              <p className="text-xs text-[var(--text-muted)] mb-2">
                এই রেটে উদাহরণ:
              </p>
              <div className="space-y-1 text-sm">
                {[10, 50, 100].map((usd) => (
                  <div key={usd} className="flex justify-between">
                    <span className="text-[var(--text-muted)]">${usd} অ্যাড</span>
                    <span className="num text-[var(--brown)]">
                      = ৳{(usd * (parseFloat(form.rate) || 0)).toLocaleString("en-BD")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormPanel>
      )}
    </div>
  );
}
