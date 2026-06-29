"use client";

import { useState, useMemo } from "react";
import { Wallet, Megaphone, Store, TrendingUp, Sparkles, Loader2, HelpCircle, RotateCcw, CalendarDays } from "lucide-react";
import StatCard from "./StatCard";
import { CashPosition, KPISet, Alert, Order } from "@/lib/types";
import { netAvailableCash, sum } from "@/lib/calculations";

interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  action: string;
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="w-3 h-3 text-[var(--text-faint)] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-56 bg-[var(--text-primary)] text-white text-[11px] rounded-lg px-2.5 py-1.5 leading-relaxed z-10">
        {text}
      </span>
    </span>
  );
}

export default function OverviewTab({
  position,
  kpis,
  orders,
  alerts,
}: {
  position: CashPosition;
  kpis: KPISet;
  orders: Order[];
  alerts: Alert[];
}) {
  const netCash = netAvailableCash(position);
  const [aiLoading, setAiLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [aiError, setAiError] = useState("");

  async function getSuggestions() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            netCash,
            minimumSafeCashLevel: position.minimumSafeCashLevel,
            kpis,
            activeAlerts: alerts.map((a) => a.message),
          },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setRecommendations(data.result?.recommendations ?? []);
      }
    } catch {
      setAiError("AI পরামর্শ আনতে সমস্যা হয়েছে।");
    } finally {
      setAiLoading(false);
    }
  }

  const recentOrders = orders.slice(0, 5);

  const today = new Date().toISOString().slice(0, 10);
  const todaySell = useMemo(() => sum(orders.filter((o) => o.date === today).map((o) => o.sellPrice)), [orders, today]);
  const todayReturns = useMemo(
    () => orders.filter((o) => o.date === today && o.isReturned),
    [orders, today]
  );
  const todayReturnAmount = useMemo(() => sum(todayReturns.map((o) => o.returnAmount || o.sellPrice)), [todayReturns]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-medium mb-1">ওভারভিউ</h2>
        <p className="text-xs text-[var(--text-faint)]">তোমার ব্যবসার আজকের অবস্থা — এক নজরে</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="আজকের সেল"
          value={`৳${todaySell.toLocaleString("en-BD")}`}
          icon={CalendarDays}
          tone="neutral"
          sublabel="শুধু আজকের তারিখের অর্ডার"
        />
        <StatCard
          label="আজকের রিটার্ন"
          value={`৳${todayReturnAmount.toLocaleString("en-BD")}`}
          icon={RotateCcw}
          tone={todayReturnAmount > 0 ? "negative" : "neutral"}
          sublabel={`${todayReturns.length}টি অর্ডার রিটার্ন`}
        />
        <StatCard
          label="হাতে থাকা টাকা"
          value={`৳${netCash.toLocaleString("en-BD")}`}
          icon={Wallet}
          tone={netCash < position.minimumSafeCashLevel ? "negative" : "positive"}
          sublabel="ব্যাংক + মোবাইল ওয়ালেট + হাতের ক্যাশ"
        />
        <StatCard
          label="মোট নেট প্রফিট"
          value={`৳${kpis.netProfit.toLocaleString("en-BD")}`}
          icon={TrendingUp}
          tone={kpis.netProfit < 0 ? "negative" : "positive"}
          sublabel="সব অর্ডার থেকে, খরচ বাদে"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="মোট অর্ডার"
          value={`${kpis.totalOrders}`}
          sublabel={`ডাইরেক্ট ${kpis.directOrders} · পার্টনার ${kpis.partnerOrders}`}
        />
        <StatCard
          label="পার্টনারের বাকি কমিশন"
          value={`৳${kpis.pendingCommissionDue.toLocaleString("en-BD")}`}
          tone={kpis.pendingCommissionDue > 0 ? "warning" : "neutral"}
          sublabel="এখনো পরিশোধ করা হয়নি"
        />
      </div>

      {/* দুই সেক্টর পাশাপাশি তুলনা */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-[var(--brown)]" />
            <h3 className="font-[family-name:var(--font-display)] font-medium text-sm">ডাইরেক্ট সেল</h3>
            <InfoTip text="তুমি নিজে অ্যাড দিয়ে যা সেল করেছ — কোনো পার্টনার কমিশন নেই" />
          </div>
          <p className="num text-2xl font-medium text-[var(--green)]">
            ৳{kpis.directProfit.toLocaleString("en-BD")}
          </p>
          <p className="text-xs text-[var(--text-faint)] mt-1">{kpis.directOrders} টা অর্ডার থেকে প্রফিট</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-[var(--mustard)]" />
            <h3 className="font-[family-name:var(--font-display)] font-medium text-sm">পার্টনার সেল</h3>
            <InfoTip text="দোকানদার পার্টনারের মাধ্যমে সেল — কমিশন বাদ দেওয়ার পরের প্রফিট" />
          </div>
          <p className="num text-2xl font-medium text-[var(--green)]">
            ৳{kpis.partnerProfit.toLocaleString("en-BD")}
          </p>
          <p className="text-xs text-[var(--text-faint)] mt-1">{kpis.partnerOrders} টা অর্ডার থেকে প্রফিট (কমিশনের পর)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="মোট সেল (রেভিনিউ)" value={`৳${kpis.totalRevenue.toLocaleString("en-BD")}`} />
        <StatCard label="মোট কাপড়ের খরচ" value={`৳${kpis.totalProductCost.toLocaleString("en-BD")}`} />
        <StatCard label="মোট অ্যাড খরচ" value={`৳${kpis.totalAdSpend.toLocaleString("en-BD")}`} />
        <StatCard label="গড় প্রফিট/অর্ডার" value={`৳${kpis.avgProfitPerOrder.toLocaleString("en-BD")}`} />
      </div>

      {recentOrders.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">সাম্প্রতিক অর্ডার</p>
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)]">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.source === "direct" ? "tag-brown" : "tag-mustard"}`}>
                    {o.source === "direct" ? "ডাইরেক্ট" : o.partnerName}
                  </span>
                  <span>{o.productName}</span>
                </div>
                <span className={`num font-medium ${o.netProfit < 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
                  {o.netProfit < 0 ? "−" : ""}৳{Math.abs(o.netProfit).toLocaleString("en-BD")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brown)]" />
            <h3 className="font-[family-name:var(--font-display)] font-medium text-sm">AI সুপারিশ</h3>
          </div>
          <button
            onClick={getSuggestions}
            disabled={aiLoading}
            className="text-xs bg-[var(--brown)]/10 text-[var(--brown)] px-3 py-1.5 rounded-lg hover:bg-[var(--brown)]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {aiLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {aiLoading ? "চলছে..." : "পরামর্শ নিন"}
          </button>
        </div>

        {aiError && <p className="text-xs text-[var(--red)] bg-[var(--red-soft)] rounded-lg px-3 py-2 mb-3">{aiError}</p>}

        {!recommendations && !aiError && (
          <p className="text-sm text-[var(--text-faint)]">
            &quot;পরামর্শ নিন&quot; এ ক্লিক করলে AI তোমার ক্যাশ পজিশন ও দুই সেক্টরের প্রফিট দেখে পরামর্শ দিবে।
          </p>
        )}

        {recommendations && (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 text-sm py-2 receipt-line last:border-0">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    rec.priority === "critical" ? "tag-red" : rec.priority === "high" ? "tag-mustard" : "tag-green"
                  }`}
                >
                  {rec.priority === "critical" ? "জরুরি" : rec.priority === "high" ? "উচ্চ" : rec.priority === "medium" ? "মাঝারি" : "নিম্ন"}
                </span>
                <span>{rec.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
