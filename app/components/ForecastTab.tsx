"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Order, ExpenseEntry } from "@/lib/types";
import { sum, round2 } from "@/lib/calculations";

export default function ForecastTab({
  orders,
  expenses,
  netCash,
  minSafeLevel,
}: {
  orders: Order[];
  expenses: ExpenseEntry[];
  netCash: number;
  minSafeLevel: number;
}) {
  const [growthPct, setGrowthPct] = useState(0);
  const [horizon, setHorizon] = useState<30 | 90>(30);

  const avgDailyProfit = useMemo(() => {
    const uniqueDates = new Set(orders.map((o) => o.date));
    const days = Math.max(1, uniqueDates.size);
    const totalProfit = sum(orders.map((o) => o.netProfit));
    const totalOtherExpense = sum(expenses.map((e) => e.amount));
    return round2((totalProfit - totalOtherExpense) / days);
  }, [orders, expenses]);

  const chartData = useMemo(() => {
    const points = [];
    let running = netCash;
    const dailyChange = avgDailyProfit * (1 + growthPct / 100);
    for (let i = 1; i <= horizon; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      running += dailyChange;
      points.push({ date: date.toISOString().slice(5, 10), cash: round2(running) });
    }
    return points;
  }, [netCash, avgDailyProfit, growthPct, horizon]);

  const willGoNegative = chartData.some((p) => p.cash < minSafeLevel);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">ফোরকাস্ট</h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5">
          এখন পর্যন্ত গড় দৈনিক প্রফিট দেখে সামনের দিনগুলোতে হাতে কত টাকা থাকবে তার আনুমানিক হিসাব
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-1 border border-[var(--border-subtle)]">
          <button
            onClick={() => setHorizon(30)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${horizon === 30 ? "bg-[var(--bg-base)] font-medium" : "text-[var(--text-muted)]"}`}
          >
            ৩০ দিন
          </button>
          <button
            onClick={() => setHorizon(90)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${horizon === 90 ? "bg-[var(--bg-base)] font-medium" : "text-[var(--text-muted)]"}`}
          >
            ৯০ দিন
          </button>
        </div>
      </div>

      {willGoNegative && (
        <div className="bg-[var(--red-soft)] border border-[var(--red)]/30 rounded-xl px-4 py-3">
          <p className="text-sm text-[var(--red)]">
            ⚠ এই হিসাব অনুযায়ী আগামী {horizon} দিনে তোমার হাতের টাকা সেফ লেভেলের নিচে নামতে পারে।
          </p>
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
        <p className="text-xs text-[var(--text-muted)] mb-4">
          আনুমানিক ক্যাশ — গড় দৈনিক প্রফিট: <span className="num text-[var(--text-primary)]">৳{avgDailyProfit.toLocaleString("en-BD")}</span>/দিন
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v) => [`৳${Number(v).toLocaleString("en-BD")}`, "ক্যাশ"]}
            />
            <ReferenceLine y={minSafeLevel} stroke="var(--red)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="cash" stroke="var(--brown)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm text-[var(--text-muted)]">সেল বৃদ্ধি/কমার অনুমান</label>
          <span className="num text-sm">{growthPct > 0 ? "+" : ""}{growthPct}%</span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          value={growthPct}
          onChange={(e) => setGrowthPct(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full bg-[var(--bg-base)] accent-[var(--brown)]"
        />
        <p className="text-[11px] text-[var(--text-faint)] mt-2">
          ধরো তুমি অ্যাড বাজেট বাড়িয়ে সেল ২০% বাড়াতে চাও — স্লাইডার সরিয়ে দেখো তাতে আগামী দিনে ক্যাশের উপর কী প্রভাব পড়ে।
        </p>
      </div>
    </div>
  );
}
