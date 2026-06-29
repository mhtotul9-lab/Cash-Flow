"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { CashPosition } from "@/lib/types";
import { FieldLabel, inputClass } from "./FormPanel";

function SettingsForm({ position, onSave }: { position: CashPosition; onSave: (pos: CashPosition) => Promise<void> }) {
  const [form, setForm] = useState(position);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ ...form, asOf: new Date().toISOString().slice(0, 10) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>ব্যাংক ব্যালেন্স (৳)</FieldLabel>
          <input type="number" step="0.01" value={form.bankBalance} onChange={(e) => setForm({ ...form, bankBalance: parseFloat(e.target.value) || 0 })} className={inputClass} />
        </div>
        <div>
          <FieldLabel>বিকাশ/নগদ ব্যালেন্স (৳)</FieldLabel>
          <input type="number" step="0.01" value={form.mobileWalletBalance} onChange={(e) => setForm({ ...form, mobileWalletBalance: parseFloat(e.target.value) || 0 })} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel>হাতে নগদ টাকা (৳)</FieldLabel>
        <input type="number" step="0.01" value={form.cashInHand} onChange={(e) => setForm({ ...form, cashInHand: parseFloat(e.target.value) || 0 })} className={inputClass} />
      </div>
      <div>
        <FieldLabel hint="এর নিচে নামলে সতর্কতা আসবে">মিনিমাম সেফ ক্যাশ লেভেল (৳)</FieldLabel>
        <input type="number" step="0.01" value={form.minimumSafeCashLevel} onChange={(e) => setForm({ ...form, minimumSafeCashLevel: parseFloat(e.target.value) || 0 })} className={inputClass} />
      </div>
      <button type="submit" className="flex items-center gap-2 bg-[var(--brown)] text-white font-medium rounded-lg py-2.5 px-4 text-sm hover:opacity-90 transition-opacity">
        <Save className="w-4 h-4" />
        {saved ? "সেভ হয়েছে ✓" : "সেভ করুন"}
      </button>
    </form>
  );
}

export default function SettingsTab({ position, onSave }: { position: CashPosition; onSave: (pos: CashPosition) => Promise<void> }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">ক্যাশ পজিশন সেটিংস</h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5">এখন তোমার হাতে আসলে কত টাকা আছে — এটা নিয়মিত আপডেট করো</p>
      </div>
      <SettingsForm key={position.asOf} position={position} onSave={onSave} />
    </div>
  );
}
