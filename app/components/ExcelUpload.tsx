"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Order, OrderSource, CommissionType } from "@/lib/types";
import { calcOrderProfit, round2 } from "@/lib/calculations";

interface ParsedRow {
  date: string;
  source: OrderSource;
  partnerName: string;
  productName: string;
  sellPrice: number;
  productCost: number;
  adSpend: number;
  commissionType: CommissionType;
  commissionValue: number;
  commissionAmount: number;
  note: string;
  valid: boolean;
  error?: string;
}

function parseRow(raw: Record<string, unknown>): ParsedRow {
  const get = (key: string): unknown => {
    // কেস-ইনসেনসিটিভ কলাম ম্যাচ, যাতে এক্সেলের হেডার নামে সামান্য পার্থক্য থাকলেও কাজ করে
    const foundKey = Object.keys(raw).find((k) => k.toLowerCase().trim() === key.toLowerCase());
    return foundKey ? raw[foundKey] : undefined;
  };

  const sellPrice = parseFloat(String(get("sellPrice") ?? get("sellingPrice") ?? "0")) || 0;
  const productCost = parseFloat(String(get("productCost") ?? get("costPrice") ?? "0")) || 0;
  const adSpend = parseFloat(String(get("adSpend") ?? "0")) || 0;
  const commissionAmount = parseFloat(String(get("commissionAmount") ?? "0")) || 0;
  const commissionValue = parseFloat(String(get("commissionValue") ?? "0")) || 0;
  const productName = String(get("productName") ?? "").trim();
  const partnerName = String(get("partnerName") ?? get("memberName") ?? "").trim();
  const sourceRaw = String(get("source") ?? "partner").trim().toLowerCase();
  const source: OrderSource = sourceRaw === "direct" ? "direct" : "partner";
  const commissionTypeRaw = String(get("commissionType") ?? "fixed").trim().toLowerCase();
  const commissionType: CommissionType = commissionTypeRaw === "percentage" ? "percentage" : "fixed";

  let dateStr = String(get("date") ?? "").trim();
  // এক্সেল সিরিয়াল ডেট নাম্বার হ্যান্ডল করা (যদি এক্সেল ডেট সেল হিসেবে সেভ করে)
  if (/^\d+(\.\d+)?$/.test(dateStr) && Number(dateStr) > 10000) {
    const excelDate = XLSX.SSF.parse_date_code(Number(dateStr));
    dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
  }

  const errors: string[] = [];
  if (!productName) errors.push("প্রোডাক্ট নাম নেই");
  if (sellPrice <= 0) errors.push("সেল প্রাইস ০ বা নেই");
  if (!dateStr) errors.push("তারিখ নেই");
  if (source === "partner" && !partnerName) errors.push("পার্টনার নাম নেই");

  return {
    date: dateStr || new Date().toISOString().slice(0, 10),
    source,
    partnerName,
    productName,
    sellPrice,
    productCost,
    adSpend,
    commissionType,
    commissionValue,
    commissionAmount,
    note: String(get("note") ?? ""),
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join(", ") : undefined,
  };
}

export default function ExcelUpload({
  onImport,
  onClose,
}: {
  onImport: (orders: Omit<Order, "id" | "createdAt">[]) => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const parsed = json.map(parseRow);
        setRows(parsed);
      } catch {
        setRows([]);
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirmImport() {
    if (!rows) return;
    const validRows = rows.filter((r) => r.valid);
    setImporting(true);
    try {
      const orders: Omit<Order, "id" | "createdAt">[] = validRows.map((r) => {
        const netProfit = calcOrderProfit(r.sellPrice, r.productCost, r.adSpend, r.commissionAmount);
        return {
          date: r.date,
          source: r.source,
          partnerId: null,
          partnerName: r.source === "partner" ? r.partnerName : null,
          productName: r.productName,
          sellPrice: round2(r.sellPrice),
          productCost: round2(r.productCost),
          adSpendMode: "manual",
          adSpend: round2(r.adSpend),
          callPackagingCost: 0,
          otherCost: 0,
          isReturned: false,
          returnAmount: 0,
          commissionType: r.source === "partner" ? r.commissionType : null,
          commissionValue: r.commissionValue,
          commissionAmount: round2(r.commissionAmount),
          netProfit,
          paymentReceived: true,
          note: r.note || "Excel থেকে bulk আপলোড হয়েছে",
        };
      });
      await onImport(orders);
      setDone(true);
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows?.filter((r) => r.valid).length ?? 0;
  const invalidCount = rows ? rows.length - validCount : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-6 w-full max-w-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-display)] font-medium text-base">Excel থেকে অর্ডার আপলোড</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-[var(--green)] mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">{validCount}টি অর্ডার সফলভাবে যুক্ত হয়েছে</p>
            <p className="text-xs text-[var(--text-faint)] mb-4">Orders ট্যাবে গিয়ে দেখতে পারো</p>
            <button
              onClick={onClose}
              className="bg-[var(--brown)] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              বন্ধ করো
            </button>
          </div>
        ) : !rows ? (
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              jolrasi অ্যাডমিন প্যানেল থেকে &quot;Cash Flow এক্সেল&quot; বাটনে ডাউনলোড করা .xlsx ফাইল আপলোড করো। অথবা নিজের তৈরি Excel/CSV ফাইলেও এই কলাম থাকলে চলবে: date, source, partnerName, productName, sellPrice, productCost, adSpend, commissionType, commissionValue, commissionAmount, note
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-strong)] rounded-xl p-10 text-center cursor-pointer hover:border-[var(--brown)] transition-colors"
            >
              <Upload className="w-8 h-8 text-[var(--text-faint)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">ফাইল এখানে ড্র্যাগ করো অথবা ক্লিক করে বাছাই করো</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">.xlsx, .xls, .csv সাপোর্ট করে</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-[var(--brown)]" />
              <span className="font-medium">{fileName}</span>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-[var(--green-soft)] rounded-lg p-3 text-center">
                <p className="text-xl font-medium text-[var(--green)]">{validCount}</p>
                <p className="text-[11px] text-[var(--text-muted)]">ঠিক আছে, যুক্ত হবে</p>
              </div>
              {invalidCount > 0 && (
                <div className="flex-1 bg-[var(--red-soft)] rounded-lg p-3 text-center">
                  <p className="text-xl font-medium text-[var(--red)]">{invalidCount}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">সমস্যা আছে, স্কিপ হবে</p>
                </div>
              )}
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-[var(--red)] bg-[var(--red-soft)] rounded-lg px-3 py-2">
                ফাইল পড়া যায়নি বা ফাইলে কোনো ডেটা নেই। সঠিক ফরম্যাট আছে কিনা চেক করো।
              </p>
            )}

            {rows.length > 0 && (
              <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-base)] sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">তারিখ</th>
                      <th className="text-left px-3 py-2">প্রোডাক্ট</th>
                      <th className="text-left px-3 py-2">পার্টনার</th>
                      <th className="text-right px-3 py-2">সেল প্রাইস</th>
                      <th className="text-left px-3 py-2">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t border-[var(--border-subtle)] ${!r.valid ? "bg-[var(--red-soft)]" : ""}`}>
                        <td className="px-3 py-1.5 text-[var(--text-muted)]">{r.date}</td>
                        <td className="px-3 py-1.5">{r.productName || "—"}</td>
                        <td className="px-3 py-1.5">{r.partnerName || "—"}</td>
                        <td className="px-3 py-1.5 text-right num">৳{r.sellPrice.toLocaleString("en-BD")}</td>
                        <td className="px-3 py-1.5">
                          {r.valid ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                          ) : (
                            <span className="flex items-center gap-1 text-[var(--red)]" title={r.error}>
                              <AlertCircle className="w-3.5 h-3.5" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRows(null);
                  setFileName("");
                }}
                className="flex-1 border border-[var(--border-subtle)] text-sm py-2.5 rounded-lg hover:bg-[var(--bg-base)] transition-colors"
              >
                অন্য ফাইল বাছাই করো
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || importing}
                className="flex-1 bg-[var(--brown)] text-white text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {importing ? "যুক্ত হচ্ছে..." : `${validCount}টি অর্ডার যুক্ত করো`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
