"use client";

import { useState, useMemo } from "react";
import { Plus, Store, Megaphone, Pencil, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import FormPanel, { DataTable, ColumnDef, FieldLabel, inputClass } from "./FormPanel";
import ProfitReceipt, { ReceiptLine } from "./ProfitReceipt";
import ExcelUpload from "./ExcelUpload";
import { Order, OrderSource, CommissionType, AdSpendMode, Partner, DailyAdSpend } from "@/lib/types";
import { calcCommission, calcOrderProfit, calcAverageAdSpendPerOrder, round2 } from "@/lib/calculations";

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  source: "direct" as OrderSource,
  partnerId: "",
  productName: "",
  sellPrice: "",
  productCost: "",
  productCostUSD: "",
  dollarRate: "",
  useDollar: false,
  adSpendMode: "manual" as AdSpendMode,
  adSpend: "",
  callPackagingCost: "",
  otherCost: "",
  isReturned: false,
  returnAmount: "",
  paymentReceived: true,
  note: "",
};

export default function OrdersTab({
  orders,
  partners,
  dailyAdSpend,
  onAdd,
  onDelete,
  onUpdate,
  onBulkImport,
}: {
  orders: Order[];
  partners: Partner[];
  dailyAdSpend: DailyAdSpend[];
  onAdd: (entry: Omit<Order, "id" | "createdAt">) => Promise<string | void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Order>) => Promise<void>;
  onBulkImport: (entries: Omit<Order, "id" | "createdAt">[]) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingAdSpend, setEditingAdSpend] = useState<Order | null>(null);
  const [adSpendValue, setAdSpendValue] = useState("");
  const [form, setForm] = useState(emptyForm);

  const activePartners = partners.filter((p) => p.active);
  const selectedPartner = activePartners.find((p) => p.id === form.partnerId);

  const computedAvgAdSpend = useMemo(() => {
    return calcAverageAdSpendPerOrder(dailyAdSpend, orders, form.date);
  }, [dailyAdSpend, orders, form.date]);

  const sellPriceNum = parseFloat(form.sellPrice) || 0;
  const dollarRateNum = parseFloat(form.dollarRate) || 0;
  const productCostUSDNum = parseFloat(form.productCostUSD) || 0;
  const productCostNum = form.useDollar
    ? round2(productCostUSDNum * dollarRateNum)
    : parseFloat(form.productCost) || 0;
  const adSpendNum =
    form.adSpendMode === "average" ? computedAvgAdSpend : parseFloat(form.adSpend) || 0;
  const callPackagingCostNum = parseFloat(form.callPackagingCost) || 0;
  const otherCostNum = parseFloat(form.otherCost) || 0;
  const returnAmountNum = parseFloat(form.returnAmount) || sellPriceNum;

  const commissionType: CommissionType | null =
    form.source === "partner" && selectedPartner ? selectedPartner.commissionType : null;
  const commissionValue = selectedPartner?.commissionValue ?? 0;
  const commissionAmount =
    form.source === "partner" ? calcCommission(sellPriceNum, commissionType, commissionValue) : 0;

  const netProfit = calcOrderProfit(sellPriceNum, productCostNum, adSpendNum, commissionAmount, {
    callPackagingCost: callPackagingCostNum,
    otherCost: otherCostNum,
    returnAmount: returnAmountNum,
    isReturned: form.isReturned,
  });

  const receiptLines: ReceiptLine[] = [
    { label: "সেল প্রাইস", value: round2(sellPriceNum), sign: "+" },
    {
      label: form.useDollar ? `কাপড়ের দাম ($${productCostUSDNum} × ৳${dollarRateNum})` : "কাপড়ের দাম (পাইকারি)",
      value: round2(productCostNum),
      sign: "-",
    },
    { label: "অ্যাড খরচ", value: round2(adSpendNum), sign: "-" },
  ];
  if (form.source === "partner") {
    receiptLines.push({
      label: `পার্টনার কমিশন${selectedPartner ? ` (${selectedPartner.name})` : ""}`,
      value: round2(commissionAmount),
      sign: "-",
    });
  }
  if (callPackagingCostNum > 0) {
    receiptLines.push({ label: "কল ও প্যাকেজিং (TA/DA)", value: round2(callPackagingCostNum), sign: "-" });
  }
  if (otherCostNum > 0) {
    receiptLines.push({ label: "অন্য খরচ", value: round2(otherCostNum), sign: "-" });
  }
  if (form.isReturned) {
    receiptLines.push({ label: "অর্ডার রিটার্ন/লস", value: round2(returnAmountNum), sign: "-" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd({
      date: form.date,
      source: form.source,
      partnerId: form.source === "partner" ? form.partnerId || null : null,
      partnerName: form.source === "partner" ? selectedPartner?.name ?? null : null,
      productName: form.productName,
      sellPrice: sellPriceNum,
      productCost: productCostNum,
      productCostUSD: form.useDollar ? productCostUSDNum : undefined,
      dollarRate: form.useDollar ? dollarRateNum : undefined,
      adSpendMode: form.adSpendMode,
      adSpend: adSpendNum,
      callPackagingCost: callPackagingCostNum,
      otherCost: otherCostNum,
      isReturned: form.isReturned,
      returnAmount: form.isReturned ? returnAmountNum : 0,
      commissionType,
      commissionValue: form.source === "partner" ? commissionValue : 0,
      commissionAmount,
      netProfit,
      paymentReceived: form.paymentReceived,
      note: form.note,
    });
    setShowForm(false);
    setShowAdvanced(false);
    setForm(emptyForm);
  }

  const columns: ColumnDef<Order>[] = [
    { header: "তারিখ", render: (o) => <span className="text-[var(--text-muted)]">{o.date}</span> },
    {
      header: "প্রোডাক্ট",
      render: (o) => (
        <span>
          {o.productName}
          {o.syncedFromJolrasi && (
            <span className="ml-1.5 text-[9px] tag-green px-1.5 py-0.5 rounded-full" title="jolrasi থেকে অটো-সিঙ্ক হয়েছে">
              অটো
            </span>
          )}
          {o.isReturned && (
            <span className="ml-1.5 text-[9px] tag-red px-1.5 py-0.5 rounded-full">রিটার্ন</span>
          )}
        </span>
      ),
    },
    {
      header: "সোর্স",
      render: (o) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.source === "direct" ? "tag-brown" : "tag-mustard"}`}>
          {o.source === "direct" ? "ডাইরেক্ট" : o.partnerName || "পার্টনার"}
        </span>
      ),
    },
    { header: "সেল প্রাইস", render: (o) => <span className="num">৳{o.sellPrice.toLocaleString("en-BD")}</span> },
    { header: "কমিশন", render: (o) => <span className="num text-[var(--text-muted)]">৳{o.commissionAmount.toLocaleString("en-BD")}</span> },
    {
      header: "অ্যাড খরচ",
      render: (o) => (
        <button
          onClick={() => {
            setEditingAdSpend(o);
            setAdSpendValue(o.adSpend.toString());
          }}
          className="flex items-center gap-1 hover:underline"
        >
          {o.syncedFromJolrasi && o.adSpend === 0 ? (
            <span className="text-[10px] text-[var(--red)]">যুক্ত করো</span>
          ) : (
            <span className="num text-[var(--text-muted)]">৳{o.adSpend.toLocaleString("en-BD")}</span>
          )}
          <Pencil className="w-2.5 h-2.5 text-[var(--text-faint)]" />
        </button>
      ),
    },
    {
      header: "নেট প্রফিট",
      render: (o) => (
        <span className={`num font-medium ${o.netProfit < 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
          {o.netProfit < 0 ? "−" : ""}৳{Math.abs(o.netProfit).toLocaleString("en-BD")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">অর্ডার</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">প্রতি সেলের হিসাব এক এক করে রাখো</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExcelUpload(true)}
            className="flex items-center gap-1.5 text-xs bg-[var(--mustard)]/10 text-[var(--mustard)] font-medium px-3 py-2 rounded-lg hover:bg-[var(--mustard)]/20 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel আপলোড
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs bg-[var(--brown)] text-white font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            নতুন অর্ডার
          </button>
        </div>
      </div>

      <DataTable columns={columns} rows={orders} onDelete={onDelete} emptyMessage="এখনো কোনো অর্ডার নেই। প্রথম অর্ডারটা যোগ করো।" />

      {showForm && (
        <FormPanel title="নতুন অর্ডার" onClose={() => setShowForm(false)} onSubmit={handleSubmit} submitLabel="অর্ডার সেভ করুন" wide>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3.5">
              <div>
                <FieldLabel>এই অর্ডার কীভাবে হয়েছে?</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, source: "direct", partnerId: "" })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm border transition-colors ${
                      form.source === "direct"
                        ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    ডাইরেক্ট সেল
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, source: "partner" })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm border transition-colors ${
                      form.source === "partner"
                        ? "border-[var(--mustard)] bg-[var(--mustard)]/10 text-[var(--mustard)]"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    পার্টনার সেল
                  </button>
                </div>
              </div>

              {form.source === "partner" && (
                <div>
                  <FieldLabel>কোন পার্টনার?</FieldLabel>
                  <select
                    required
                    value={form.partnerId}
                    onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">পার্টনার বাছাই করো</option>
                    {activePartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.commissionType === "fixed" ? `৳${p.commissionValue}/অর্ডার` : `${p.commissionValue}%`})
                      </option>
                    ))}
                  </select>
                  {activePartners.length === 0 && (
                    <p className="text-[11px] text-[var(--red)] mt-1.5">
                      কোনো পার্টনার যোগ করা নেই। আগে &quot;পার্টনার&quot; ট্যাব থেকে যোগ করো।
                    </p>
                  )}
                </div>
              )}

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
                <FieldLabel>প্রোডাক্ট নাম</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="যেমন: প্রিন্ট থ্রি-পিস"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>সেল প্রাইস (৳)</FieldLabel>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>কাপড়ের দাম (৳)</FieldLabel>
                  <input
                    type="number"
                    required={!form.useDollar}
                    disabled={form.useDollar}
                    min="0"
                    step="0.01"
                    value={form.useDollar ? productCostNum || "" : form.productCost}
                    onChange={(e) => setForm({ ...form, productCost: e.target.value })}
                    className={inputClass + (form.useDollar ? " opacity-50" : "")}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={form.useDollar}
                  onChange={(e) => setForm({ ...form, useDollar: e.target.checked })}
                  className="rounded"
                />
                এই প্রোডাক্ট ডলারে কেনা হয়েছে (বিদেশি সোর্স)
              </label>

              {form.useDollar && (
                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg p-3">
                  <div>
                    <FieldLabel>দাম ($)</FieldLabel>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.productCostUSD}
                      onChange={(e) => setForm({ ...form, productCostUSD: e.target.value })}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <FieldLabel>ডলার রেট (৳)</FieldLabel>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.dollarRate}
                      onChange={(e) => setForm({ ...form, dollarRate: e.target.value })}
                      className={inputClass}
                      placeholder="যেমন: ১২০"
                    />
                  </div>
                </div>
              )}

              <div>
                <FieldLabel>অ্যাড খরচ কীভাবে ধরবে?</FieldLabel>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, adSpendMode: "manual" })}
                    className={`py-2 rounded-lg text-xs border transition-colors ${
                      form.adSpendMode === "manual"
                        ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    এই অর্ডারে নিজে লিখব
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, adSpendMode: "average" })}
                    className={`py-2 rounded-lg text-xs border transition-colors ${
                      form.adSpendMode === "average"
                        ? "border-[var(--brown)] bg-[var(--brown)]/10 text-[var(--brown)]"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    দৈনিক গড় থেকে নিক
                  </button>
                </div>
                {form.adSpendMode === "manual" ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.adSpend}
                    onChange={(e) => setForm({ ...form, adSpend: e.target.value })}
                    placeholder="0.00"
                    className={inputClass}
                  />
                ) : (
                  <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 px-3 text-sm text-[var(--text-muted)]">
                    এই তারিখের গড়: <span className="num text-[var(--text-primary)]">৳{computedAvgAdSpend.toLocaleString("en-BD")}</span> / অর্ডার
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-[var(--brown)] hover:underline"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAdvanced ? "বিস্তারিত খরচ লুকাও" : "আরও খরচ যুক্ত করো (কল, প্যাকেজিং, রিটার্ন...)"}
              </button>

              {showAdvanced && (
                <div className="space-y-3.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg p-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>কল ও প্যাকেজিং (৳)</FieldLabel>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.callPackagingCost}
                        onChange={(e) => setForm({ ...form, callPackagingCost: e.target.value })}
                        className={inputClass}
                        placeholder="TA/DA সহ"
                      />
                    </div>
                    <div>
                      <FieldLabel>অন্য খরচ (৳)</FieldLabel>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.otherCost}
                        onChange={(e) => setForm({ ...form, otherCost: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={form.isReturned}
                      onChange={(e) => setForm({ ...form, isReturned: e.target.checked })}
                      className="rounded"
                    />
                    এই অর্ডার রিটার্ন হয়েছে
                  </label>
                  {form.isReturned && (
                    <div>
                      <FieldLabel hint="ফাঁকা রাখলে পুরো সেল প্রাইসই লস ধরা হবে">রিটার্নে কত টাকা লস (৳)</FieldLabel>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.returnAmount}
                        onChange={(e) => setForm({ ...form, returnAmount: e.target.value })}
                        className={inputClass}
                        placeholder={sellPriceNum.toString()}
                      />
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={form.paymentReceived}
                  onChange={(e) => setForm({ ...form, paymentReceived: e.target.checked })}
                  className="rounded"
                />
                টাকা হাতে পেয়ে গেছি
              </label>

              <div>
                <FieldLabel>নোট</FieldLabel>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="ঐচ্ছিক"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">লাইভ হিসাব — তুমি যেভাবে লিখছ তার সাথে সাথে বদলায়</p>
              <ProfitReceipt lines={receiptLines} result={netProfit} />
            </div>
          </div>
        </FormPanel>
      )}

      {editingAdSpend && (
        <FormPanel
          title={`"${editingAdSpend.productName}" এর অ্যাড খরচ`}
          onClose={() => setEditingAdSpend(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            const newAdSpend = parseFloat(adSpendValue) || 0;
            const newNetProfit = calcOrderProfit(
              editingAdSpend.sellPrice,
              editingAdSpend.productCost,
              newAdSpend,
              editingAdSpend.commissionAmount,
              {
                callPackagingCost: editingAdSpend.callPackagingCost,
                otherCost: editingAdSpend.otherCost,
                returnAmount: editingAdSpend.returnAmount,
                isReturned: editingAdSpend.isReturned,
              }
            );
            await onUpdate(editingAdSpend.id, { adSpend: newAdSpend, netProfit: newNetProfit });
            setEditingAdSpend(null);
          }}
          submitLabel="আপডেট করো"
        >
          <div>
            <FieldLabel hint="jolrasi থেকে অটো-সিঙ্ক হলে অ্যাড খরচ এখানে নিজে বসাতে হবে">এই অর্ডারের অ্যাড খরচ (৳)</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={adSpendValue}
              onChange={(e) => setAdSpendValue(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>
        </FormPanel>
      )}
      {showExcelUpload && (
        <ExcelUpload onImport={onBulkImport} onClose={() => setShowExcelUpload(false)} />
      )}
    </div>
  );
}
