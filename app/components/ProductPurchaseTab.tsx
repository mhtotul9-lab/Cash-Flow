"use client";

import { useState, useMemo } from "react";
import { Plus, Package, DollarSign } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import StatCard from "./StatCard";
import { ProductPurchase } from "@/lib/types";
import { sum, round2 } from "@/lib/calculations";

export default function ProductPurchaseTab({
  purchases,
  onAdd,
  onDelete,
  onUpdate,
  latestDollarRate,
}: {
  purchases: ProductPurchase[];
  onAdd: (entry: Omit<ProductPurchase, "id" | "createdAt">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, patch: Partial<ProductPurchase>) => Promise<void>;
  latestDollarRate: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useDollar, setUseDollar] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    productName: "",
    quantity: "",
    unitPrice: "",
    unitPriceUSD: "",
    dollarRate: latestDollarRate.toString(),
    shippingCost: "0",
    note: "",
  });

  // ফর্ম open হলে latest dollar rate সেট করা
  function openForm() {
    setEditingId(null);
    setUseDollar(false);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      productName: "",
      quantity: "",
      unitPrice: "",
      unitPriceUSD: "",
      dollarRate: latestDollarRate.toString(),
      shippingCost: "0",
      note: "",
    });
    setShowForm(true);
  }

  function openEdit(p: ProductPurchase) {
    setEditingId(p.id);
    setUseDollar(!!p.unitPriceUSD);
    setForm({
      date: p.date,
      productName: p.productName,
      quantity: String(p.quantity),
      unitPrice: String(p.unitPrice),
      unitPriceUSD: p.unitPriceUSD ? String(p.unitPriceUSD) : "",
      dollarRate: p.dollarRate ? String(p.dollarRate) : latestDollarRate.toString(),
      shippingCost: String(p.shippingCost),
      note: p.note || "",
    });
    setShowForm(true);
  }

  const unitPriceBDT = useDollar
    ? round2(
        (parseFloat(form.unitPriceUSD) || 0) *
          (parseFloat(form.dollarRate) || latestDollarRate)
      )
    : parseFloat(form.unitPrice) || 0;

  const totalCost = round2(
    (parseFloat(form.quantity) || 0) * unitPriceBDT +
      (parseFloat(form.shippingCost) || 0)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const rate = parseFloat(form.dollarRate) || latestDollarRate;
    const usdPrice = parseFloat(form.unitPriceUSD) || 0;
    const cost = useDollar ? round2(usdPrice * rate) : parseFloat(form.unitPrice) || 0;
    const shipping = parseFloat(form.shippingCost) || 0;

    const payload = {
      date: form.date,
      productName: form.productName,
      quantity: qty,
      unitPrice: cost,
      unitPriceUSD: useDollar ? usdPrice : undefined,
      dollarRate: useDollar ? rate : undefined,
      totalCost: round2(qty * cost + shipping),
      shippingCost: shipping,
      note: form.note,
    };

    if (editingId && onUpdate) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      productName: "",
      quantity: "",
      unitPrice: "",
      unitPriceUSD: "",
      dollarRate: latestDollarRate.toString(),
      shippingCost: "0",
      note: "",
    });
    setUseDollar(false);
  }

  // স্টক সামারি — প্রোডাক্ট ভিত্তিক
  const stockSummary = useMemo(() => {
    const map = new Map<string, { qty: number; totalCost: number }>();
    purchases.forEach((p) => {
      const existing = map.get(p.productName) || { qty: 0, totalCost: 0 };
      map.set(p.productName, {
        qty: existing.qty + p.quantity,
        totalCost: existing.totalCost + p.totalCost,
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [purchases]);

  const totalSpent = sum(purchases.map((p) => p.totalCost));
  const totalPieces = sum(purchases.map((p) => p.quantity));

  const columns: ColumnDef<ProductPurchase>[] = [
    {
      header: "তারিখ",
      render: (p) => (
        <span className="text-[var(--text-muted)] text-xs">{p.date}</span>
      ),
    },
    {
      header: "প্রোডাক্ট",
      render: (p) => <span className="font-medium">{p.productName}</span>,
    },
    {
      header: "পিস",
      render: (p) => <span className="num">{p.quantity}</span>,
    },
    {
      header: "প্রতি পিস",
      render: (p) => (
        <span className="num">
          ৳{p.unitPrice.toLocaleString("en-BD")}
          {p.unitPriceUSD && (
            <span className="text-[var(--text-faint)] text-[10px] ml-1">
              (${p.unitPriceUSD})
            </span>
          )}
        </span>
      ),
    },
    {
      header: "শিপিং",
      render: (p) => (
        <span className="num text-[var(--text-muted)]">
          ৳{p.shippingCost.toLocaleString("en-BD")}
        </span>
      ),
    },
    {
      header: "মোট খরচ",
      render: (p) => (
        <span className="num font-medium text-[var(--red)]">
          ৳{p.totalCost.toLocaleString("en-BD")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
            প্রোডাক্ট ক্রয়
          </h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            যতবার পাইকারি কিনবে, এখানে এন্ট্রি দাও
          </p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center justify-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2.5 sm:py-2 rounded-lg hover:opacity-90 transition-opacity btn-press"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন কেনাকাটা
        </button>
      </div>

      {/* সামারি কার্ড */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <StatCard
          label="মোট বিনিয়োগ"
          value={`৳${totalSpent.toLocaleString("en-BD")}`}
          tone="negative"
          sublabel="সব কেনাকাটার মোট"
        />
        <StatCard
          label="মোট পিস কেনা"
          value={`${totalPieces}`}
          icon={Package}
          sublabel="সব প্রোডাক্ট মিলিয়ে"
        />
      </div>

      {/* প্রোডাক্ট ভিত্তিক স্টক */}
      {stockSummary.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 card-elevated">
          <p className="text-xs text-[var(--text-muted)] mb-3 font-medium">
            প্রোডাক্ট ভিত্তিক সারসংক্ষেপ
          </p>
          <div className="space-y-2">
            {stockSummary.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0"
              >
                <span className="font-medium">{s.name}</span>
                <div className="flex items-center gap-4 text-right">
                  <span className="num text-[var(--text-muted)] text-xs">
                    {s.qty} পিস
                  </span>
                  <span className="num text-[var(--red)] font-medium">
                    ৳{s.totalCost.toLocaleString("en-BD")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={purchases}
        onDelete={onDelete}
        onEdit={onUpdate ? openEdit : undefined}
        emptyMessage="এখনো কোনো কেনাকাটা এন্ট্রি নেই।"
      />

      {showForm && (
        <FormPanel
          title={editingId ? "কেনাকাটা এডিট করো" : "নতুন কেনাকাটা"}
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
            <FieldLabel>প্রোডাক্টের নাম</FieldLabel>
            <input
              type="text"
              required
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
              placeholder="যেমন: কটন থ্রি-পিস"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>কতটা কিনেছ (পিস)</FieldLabel>
            <input
              type="number"
              required
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className={inputClass}
              placeholder="৫০"
            />
          </div>

          {/* মূল্য — টাকা বা ডলার */}
          <div>
            <FieldLabel>দাম কোন মুদ্রায়?</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseDollar(false)}
                className={`py-2.5 rounded-lg text-sm border transition-colors ${
                  !useDollar
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                ৳ টাকায়
              </button>
              <button
                type="button"
                onClick={() => setUseDollar(true)}
                className={`py-2.5 rounded-lg text-sm border transition-colors flex items-center justify-center gap-1.5 ${
                  useDollar
                    ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                ডলারে
              </button>
            </div>
          </div>

          {useDollar ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>প্রতি পিসের দাম ($)</FieldLabel>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.unitPriceUSD}
                  onChange={(e) =>
                    setForm({ ...form, unitPriceUSD: e.target.value })
                  }
                  className={inputClass}
                  placeholder="5.00"
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
                  onChange={(e) =>
                    setForm({ ...form, dollarRate: e.target.value })
                  }
                  className={inputClass}
                  placeholder="110"
                />
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>প্রতি পিসের দাম (৳)</FieldLabel>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({ ...form, unitPrice: e.target.value })
                }
                className={inputClass}
                placeholder="৳৪৫০"
              />
            </div>
          )}

          <div>
            <FieldLabel>শিপিং/আনার খরচ (৳)</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.shippingCost}
              onChange={(e) =>
                setForm({ ...form, shippingCost: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel>নোট (ঐচ্ছিক)</FieldLabel>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputClass}
              placeholder="যেমন: চাইনা থেকে আনা"
            />
          </div>

          {/* লাইভ হিসাব */}
          {form.quantity && (unitPriceBDT > 0) && (
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs text-[var(--text-muted)] font-medium mb-2">
                লাইভ হিসাব
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">প্রতি পিস</span>
                <span className="num">৳{unitPriceBDT.toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">
                  {form.quantity || 0} পিস × ৳{unitPriceBDT.toLocaleString("en-BD")}
                </span>
                <span className="num">
                  ৳{round2((parseFloat(form.quantity) || 0) * unitPriceBDT).toLocaleString("en-BD")}
                </span>
              </div>
              {parseFloat(form.shippingCost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">শিপিং</span>
                  <span className="num">
                    ৳{parseFloat(form.shippingCost).toLocaleString("en-BD")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-[var(--border-subtle)]">
                <span>মোট খরচ</span>
                <span className="num text-[var(--red)]">
                  ৳{totalCost.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          )}
        </FormPanel>
      )}
    </div>
  );
}
