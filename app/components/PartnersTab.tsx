"use client";

import { useState } from "react";
import { Plus, BadgeCheck } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import { Partner, CommissionType, CommissionPayment } from "@/lib/types";

export default function PartnersTab({
  partners,
  onAdd,
  onDelete,
  onAddPayment,
}: {
  partners: Partner[];
  onAdd: (entry: Omit<Partner, "id" | "createdAt">) => Promise<string | void>;
  onDelete: (id: string) => Promise<void>;
  onAddPayment: (entry: Omit<CommissionPayment, "id" | "createdAt">, partner: Partner) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [payingPartner, setPayingPartner] = useState<Partner | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [form, setForm] = useState({
    name: "",
    area: "",
    phone: "",
    commissionType: "fixed" as CommissionType,
    commissionValue: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd({
      name: form.name,
      area: form.area,
      phone: form.phone,
      commissionType: form.commissionType,
      commissionValue: parseFloat(form.commissionValue) || 0,
      totalOrders: 0,
      totalCommissionDue: 0,
      totalCommissionPaid: 0,
      active: true,
    });
    setShowForm(false);
    setForm({ name: "", area: "", phone: "", commissionType: "fixed", commissionValue: "" });
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingPartner) return;
    const amount = parseFloat(payAmount) || 0;
    await onAddPayment(
      {
        partnerId: payingPartner.id,
        partnerName: payingPartner.name,
        amount,
        date: new Date().toISOString().slice(0, 10),
        note: "",
      },
      payingPartner
    );
    setPayingPartner(null);
    setPayAmount("");
  }

  const columns: ColumnDef<Partner>[] = [
    { header: "নাম", render: (p) => <span className="font-medium">{p.name}</span> },
    { header: "এলাকা", render: (p) => <span className="text-[var(--text-muted)]">{p.area || "—"}</span> },
    {
      header: "কমিশন রেট",
      render: (p) => (
        <span className="tag-mustard text-[10px] px-2 py-0.5 rounded-full">
          {p.commissionType === "fixed" ? `৳${p.commissionValue}/অর্ডার` : `${p.commissionValue}%`}
        </span>
      ),
    },
    { header: "মোট অর্ডার", render: (p) => <span className="num">{p.totalOrders}</span> },
    {
      header: "বাকি কমিশন",
      render: (p) => {
        const due = p.totalCommissionDue - p.totalCommissionPaid;
        return (
          <span className={`num font-medium ${due > 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
            ৳{due.toLocaleString("en-BD")}
          </span>
        );
      },
    },
    {
      header: "",
      render: (p) => {
        const due = p.totalCommissionDue - p.totalCommissionPaid;
        if (due <= 0) {
          return (
            <span className="flex items-center gap-1 text-xs text-[var(--green)]">
              <BadgeCheck className="w-3.5 h-3.5" /> পরিশোধিত
            </span>
          );
        }
        return (
          <button
            onClick={() => {
              setPayingPartner(p);
              setPayAmount(due.toString());
            }}
            className="text-xs bg-[var(--mustard)]/10 text-[var(--mustard)] px-2.5 py-1 rounded-md hover:bg-[var(--mustard)]/20 transition-colors"
          >
            পরিশোধ করো
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">পার্টনার (দোকানদার)</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">যারা তোমার প্রোডাক্ট তাদের দোকানে রাখে, প্রতি সেলে কমিশন পায়</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2.5 sm:py-2 rounded-lg hover:opacity-90 transition-opacity btn-press"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন পার্টনার
        </button>
      </div>

      <DataTable columns={columns} rows={partners} onDelete={onDelete} emptyMessage="এখনো কোনো পার্টনার যোগ করা হয়নি।" />

      {showForm && (
        <FormPanel title="নতুন পার্টনার যোগ করো" onClose={() => setShowForm(false)} onSubmit={handleSubmit}>
          <div>
            <FieldLabel>পার্টনারের নাম</FieldLabel>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <FieldLabel>এলাকা / দোকানের নাম</FieldLabel>
            <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} placeholder="যেমন: ফরিদপুর বাজার" />
          </div>
          <div>
            <FieldLabel>ফোন নাম্বার</FieldLabel>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <FieldLabel>কমিশন কীভাবে দেবে?</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, commissionType: "fixed" })}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  form.commissionType === "fixed"
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                ফিক্সড টাকা/অর্ডার
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, commissionType: "percentage" })}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  form.commissionType === "percentage"
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                সেল প্রাইসের %
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>{form.commissionType === "fixed" ? "প্রতি অর্ডারে কমিশন (৳)" : "কমিশন রেট (%)"}</FieldLabel>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.commissionValue}
              onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
              className={inputClass}
              placeholder={form.commissionType === "fixed" ? "৫০" : "১০"}
            />
          </div>
        </FormPanel>
      )}

      {payingPartner && (
        <FormPanel
          title={`"${payingPartner.name}" কে কমিশন পরিশোধ`}
          onClose={() => setPayingPartner(null)}
          onSubmit={handlePaySubmit}
          submitLabel="পরিশোধ নিশ্চিত করো"
        >
          <div>
            <FieldLabel hint={`বাকি ছিল ৳${(payingPartner.totalCommissionDue - payingPartner.totalCommissionPaid).toLocaleString("en-BD")}`}>
              পরিশোধের পরিমাণ (৳)
            </FieldLabel>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={inputClass}
            />
          </div>
        </FormPanel>
      )}
    </div>
  );
}
