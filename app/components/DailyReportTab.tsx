"use client";

import { useState, useMemo } from "react";
import { Calendar, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { Order, ExpenseEntry } from "@/lib/types";
import { calcDailyReports, sum, round2 } from "@/lib/calculations";

type FilterType = "today" | "7days" | "30days" | "custom";

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function ReportRow({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" | "neutral" }) {
  const color = tone === "red" ? "text-[var(--red)]" : tone === "green" ? "text-[var(--green)]" : "text-[var(--text-primary)]";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className={`num text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}

export default function DailyReportTab({
  orders,
  expenses,
}: {
  orders: Order[];
  expenses: ExpenseEntry[];
}) {
  const [filter, setFilter] = useState<FilterType>("7days");
  const [customFrom, setCustomFrom] = useState(() => getDateStr(7));
  const [customTo, setCustomTo] = useState(() => getDateStr(0));
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const today = getDateStr(0);

  const { dateFrom, dateTo } = useMemo(() => {
    if (filter === "today") return { dateFrom: today, dateTo: today };
    if (filter === "7days") {
      return { dateFrom: getDateStr(6), dateTo: today };
    }
    if (filter === "30days") {
      return { dateFrom: getDateStr(29), dateTo: today };
    }
    return { dateFrom: customFrom, dateTo: customTo };
  }, [filter, customFrom, customTo, today]);

  const reports = useMemo(
    () => calcDailyReports(orders, expenses, dateFrom, dateTo),
    [orders, expenses, dateFrom, dateTo]
  );

  // মোট সারাংশ
  const totalSummary = useMemo(() => ({
    totalOrders: sum(reports.map((r) => r.totalOrders)),
    totalSell: round2(sum(reports.map((r) => r.totalSell))),
    totalAdBDT: round2(sum(reports.map((r) => r.totalAdSpendBDT))),
    totalAdUSD: round2(sum(reports.map((r) => r.totalAdSpendUSD))),
    totalProductCost: round2(sum(reports.map((r) => r.totalProductCost))),
    totalCallPkg: round2(sum(reports.map((r) => r.totalCallPackaging))),
    totalOther: round2(sum(reports.map((r) => r.totalOtherCost))),
    totalExpenses: round2(sum(reports.map((r) => r.totalExpenses))),
    totalReturn: round2(sum(reports.map((r) => r.totalReturn))),
    returnCount: sum(reports.map((r) => r.returnCount)),
    netProfit: round2(sum(reports.map((r) => r.netProfit))),
  }), [reports]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
          প্রতিদিনের রিপোর্ট
        </h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5">
          কোন দিন কত লাভ বা লোকসান হয়েছে — বিস্তারিত হিসাব
        </p>
      </div>

      {/* ফিল্টার */}
      <div className="flex flex-wrap gap-2">
        {(["today", "7days", "30days", "custom"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-press ${
              filter === f
                ? "bg-[var(--brown)] text-white"
                : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
            }`}
          >
            {f === "today" ? "আজ" : f === "7days" ? "৭ দিন" : f === "30days" ? "৩০ দিন" : "কাস্টম"}
          </button>
        ))}
      </div>

      {/* কাস্টম তারিখ */}
      {filter === "custom" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">থেকে</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--brown)] transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">পর্যন্ত</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--brown)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* মোট সারাংশ কার্ড */}
      {reports.length > 0 && (
        <div className="bg-[var(--bg-card)] border-2 border-[var(--brown)]/20 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-[var(--brown)] font-medium mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            মোট সারাংশ ({reports.length} দিন)
          </p>
          <div className="space-y-0.5">
            <ReportRow label="মোট অর্ডার" value={`${totalSummary.totalOrders}টা`} />
            <ReportRow
              label="মোট সেল"
              value={`৳${totalSummary.totalSell.toLocaleString("en-BD")}`}
              tone="green"
            />
            <ReportRow
              label="অ্যাড খরচ"
              value={`৳${totalSummary.totalAdBDT.toLocaleString("en-BD")}${totalSummary.totalAdUSD > 0 ? ` ($${totalSummary.totalAdUSD})` : ""}`}
              tone="red"
            />
            <ReportRow
              label="প্রোডাক্ট কস্ট"
              value={`৳${totalSummary.totalProductCost.toLocaleString("en-BD")}`}
              tone="red"
            />
            <ReportRow
              label="কল ও প্যাকেজিং"
              value={`৳${totalSummary.totalCallPkg.toLocaleString("en-BD")}`}
              tone="red"
            />
            <ReportRow
              label="অন্য খরচ"
              value={`৳${totalSummary.totalOther.toLocaleString("en-BD")}`}
              tone="red"
            />
            <ReportRow
              label="সাধারণ খরচ"
              value={`৳${totalSummary.totalExpenses.toLocaleString("en-BD")}`}
              tone="red"
            />
            {totalSummary.totalReturn > 0 && (
              <ReportRow
                label={`রিটার্ন লস (${totalSummary.returnCount}টা)`}
                value={`৳${totalSummary.totalReturn.toLocaleString("en-BD")}`}
                tone="red"
              />
            )}
          </div>
          <div className="mt-3 pt-3 border-t-2 border-dashed border-[var(--border-strong)] flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] font-medium">
              নেট প্রফিট
            </span>
            <div className="flex items-center gap-2">
              {totalSummary.netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[var(--green)]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[var(--red)]" />
              )}
              <span
                className={`num text-xl font-semibold ${
                  totalSummary.netProfit >= 0
                    ? "text-[var(--green)]"
                    : "text-[var(--red)]"
                }`}
              >
                {totalSummary.netProfit < 0 ? "−" : ""}৳
                {Math.abs(totalSummary.netProfit).toLocaleString("en-BD")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* প্রতিদিনের কার্ড */}
      {reports.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
          <p className="text-sm text-[var(--text-faint)]">
            এই সময়ের মধ্যে কোনো ডেটা নেই।
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((report) => {
            const isExpanded = expandedDate === report.date;
            const isToday = report.date === today;
            return (
              <div
                key={report.date}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden card-elevated"
              >
                {/* দিনের সারাংশ (সবসময় দেখায়) */}
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() =>
                    setExpandedDate(isExpanded ? null : report.date)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-1.5 h-10 rounded-full ${
                        report.netProfit >= 0
                          ? "bg-[var(--green)]"
                          : "bg-[var(--red)]"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {report.date}
                        </span>
                        {isToday && (
                          <span className="text-[9px] tag-brown px-1.5 py-0.5 rounded-full">
                            আজ
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {report.totalOrders}টা অর্ডার ·{" "}
                        {report.returnCount > 0 &&
                          `${report.returnCount}টা রিটার্ন · `}
                        সেল ৳{report.totalSell.toLocaleString("en-BD")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`num font-semibold text-base ${
                        report.netProfit >= 0
                          ? "text-[var(--green)]"
                          : "text-[var(--red)]"
                      }`}
                    >
                      {report.netProfit < 0 ? "−" : "+"}৳
                      {Math.abs(report.netProfit).toLocaleString("en-BD")}
                    </p>
                    <p className="text-[10px] text-[var(--text-faint)]">
                      {isExpanded ? "কম দেখাও ▲" : "বিস্তারিত ▼"}
                    </p>
                  </div>
                </button>

                {/* বিস্তারিত (ক্লিক করলে দেখায়) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                    <div className="mt-3 space-y-0.5">
                      <ReportRow
                        label="মোট সেল"
                        value={`৳${report.totalSell.toLocaleString("en-BD")}`}
                        tone="green"
                      />
                      <ReportRow
                        label="অ্যাড খরচ"
                        value={`৳${report.totalAdSpendBDT.toLocaleString("en-BD")}${
                          report.totalAdSpendUSD > 0
                            ? ` ($${report.totalAdSpendUSD})`
                            : ""
                        }`}
                        tone="red"
                      />
                      <ReportRow
                        label="প্রোডাক্ট কস্ট"
                        value={`৳${report.totalProductCost.toLocaleString("en-BD")}`}
                        tone="red"
                      />
                      {report.totalCallPackaging > 0 && (
                        <ReportRow
                          label="কল ও প্যাকেজিং"
                          value={`৳${report.totalCallPackaging.toLocaleString("en-BD")}`}
                          tone="red"
                        />
                      )}
                      {report.totalOtherCost > 0 && (
                        <ReportRow
                          label="অন্য খরচ"
                          value={`৳${report.totalOtherCost.toLocaleString("en-BD")}`}
                          tone="red"
                        />
                      )}
                      {report.totalExpenses > 0 && (
                        <ReportRow
                          label="সাধারণ খরচ"
                          value={`৳${report.totalExpenses.toLocaleString("en-BD")}`}
                          tone="red"
                        />
                      )}
                      {report.returnCount > 0 && (
                        <ReportRow
                          label={`রিটার্ন (${report.returnCount}টা)`}
                          value={`৳${report.totalReturn.toLocaleString("en-BD")}`}
                          tone="red"
                        />
                      )}
                      <div className="pt-2 flex justify-between font-medium">
                        <span className="text-sm flex items-center gap-1">
                          {report.returnCount > 0 && (
                            <RotateCcw className="w-3.5 h-3.5 text-[var(--red)]" />
                          )}
                          নেট প্রফিট
                        </span>
                        <span
                          className={`num text-base font-semibold ${
                            report.netProfit >= 0
                              ? "text-[var(--green)]"
                              : "text-[var(--red)]"
                          }`}
                        >
                          {report.netProfit < 0 ? "−" : ""}৳
                          {Math.abs(report.netProfit).toLocaleString("en-BD")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
