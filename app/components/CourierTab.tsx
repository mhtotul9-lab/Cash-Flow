"use client";

import { useState, useEffect, useMemo } from "react";
import { Truck, RefreshCw, Wallet, PackageCheck, PackageX, Clock } from "lucide-react";
import { Order } from "@/lib/types";
import { calcOrderProfit } from "@/lib/calculations";
import {
  checkSteadfastStatus,
  getSteadfastBalance,
  isStatusReturned,
  STATUS_LABEL_BN,
} from "@/lib/steadfast-client";
import StatCard from "./StatCard";

export default function CourierTab({
  orders,
  onUpdate,
}: {
  orders: Order[];
  onUpdate: (id: string, patch: Partial<Order>) => Promise<void>;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sentOrders = useMemo(
    () => orders.filter((o) => o.steadfastConsignmentId),
    [orders]
  );
  const unsentOrders = useMemo(
    () => orders.filter((o) => !o.steadfastConsignmentId),
    [orders]
  );

  const delivered = sentOrders.filter((o) => o.steadfastStatus === "delivered" || o.steadfastStatus === "partial_delivered");
  const returned = sentOrders.filter((o) => o.steadfastStatus && isStatusReturned(o.steadfastStatus));
  const pending = sentOrders.filter(
    (o) => !o.steadfastStatus || (!isStatusReturned(o.steadfastStatus) && o.steadfastStatus !== "delivered" && o.steadfastStatus !== "partial_delivered")
  );

  useEffect(() => {
    getSteadfastBalance()
      .then(setBalance)
      .catch((err) => setBalanceError(err instanceof Error ? err.message : "ব্যালেন্স আনতে সমস্যা হয়েছে"));
  }, []);

  async function refreshOne(order: Order) {
    setBusyId(order.id);
    try {
      const result = await checkSteadfastStatus(order);
      if (!result) return;
      const { status, note } = result;
      const patch: Partial<Order> = {
        steadfastStatus: status,
        steadfastLastCheckedAt: Date.now(),
        steadfastNote: note ?? undefined,
      };
      if (isStatusReturned(status) && !order.isReturned) {
        patch.isReturned = true;
        patch.returnAmount = order.sellPrice;
        patch.netProfit = calcOrderProfit(order.sellPrice, order.productCost, order.adSpend, order.commissionAmount, {
          callPackagingCost: order.callPackagingCost,
          otherCost: order.otherCost,
          returnAmount: order.sellPrice,
          isReturned: true,
        });
      }
      await onUpdate(order.id, patch);
    } catch (err) {
      alert(err instanceof Error ? err.message : "স্ট্যাটাস চেক করতে সমস্যা হয়েছে");
    } finally {
      setBusyId(null);
    }
  }

  async function refreshAll() {
    setRefreshingAll(true);
    for (const o of sentOrders) {
      await refreshOne(o);
    }
    setRefreshingAll(false);
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-medium mb-1 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[var(--brown)]" />
            কুরিয়ার (Steadfast)
          </h2>
          <p className="text-xs text-[var(--text-faint)]">সব কুরিয়ার অর্ডার ও ডেলিভারি স্ট্যাটাস একজায়গায়</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshingAll || sentOrders.length === 0}
          className="flex items-center gap-2 text-sm bg-[var(--brown)] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 btn-press"
        >
          <RefreshCw className={`w-4 h-4 ${refreshingAll ? "animate-spin" : ""}`} />
          {refreshingAll ? "রিফ্রেশ হচ্ছে..." : "সব স্ট্যাটাস রিফ্রেশ করো"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 stagger">
        <StatCard
          label="Steadfast ব্যালেন্স"
          value={balanceError ? "—" : balance !== null ? `৳${balance.toLocaleString("en-BD")}` : "লোড হচ্ছে..."}
          icon={Wallet}
          sublabel={balanceError || "কুরিয়ার অ্যাকাউন্টে জমা টাকা"}
        />
        <StatCard
          label="ডেলিভারড"
          value={`${delivered.length}`}
          icon={PackageCheck}
          tone="positive"
          sublabel={`মোট পাঠানো ${sentOrders.length}টির মধ্যে`}
        />
        <StatCard
          label="রিটার্ন/বাতিল"
          value={`${returned.length}`}
          icon={PackageX}
          tone={returned.length > 0 ? "negative" : "neutral"}
          sublabel="স্বয়ংক্রিয়ভাবে লস হিসাবে যোগ হয়েছে"
        />
        <StatCard
          label="প্রসেসে আছে"
          value={`${pending.length}`}
          icon={Clock}
          tone="warning"
          sublabel="এখনো ডেলিভারি হয়নি"
        />
      </div>

      {unsentOrders.length > 0 && (
        <div className="bg-[var(--mustard-soft)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-sm text-[var(--brown-deep)]">
          {unsentOrders.length}টি অর্ডার এখনো কুরিয়ারে পাঠানো হয়নি — &quot;অর্ডার&quot; ট্যাব থেকে পাঠাও।
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden card-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-faint)] border-b border-[var(--border-subtle)]">
                <th className="px-4 py-2.5 font-normal">তারিখ</th>
                <th className="px-4 py-2.5 font-normal">প্রোডাক্ট</th>
                <th className="px-4 py-2.5 font-normal">ট্র্যাকিং কোড</th>
                <th className="px-4 py-2.5 font-normal">সেল প্রাইস</th>
                <th className="px-4 py-2.5 font-normal">স্ট্যাটাস</th>
                <th className="px-4 py-2.5 font-normal">রাইডার নোট</th>
                <th className="px-4 py-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {sentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-faint)]">
                    এখনো কোনো অর্ডার কুরিয়ারে পাঠানো হয়নি
                  </td>
                </tr>
              )}
              {sentOrders.map((o) => {
                const returned = o.steadfastStatus && isStatusReturned(o.steadfastStatus);
                const delivered = o.steadfastStatus === "delivered" || o.steadfastStatus === "partial_delivered";
                return (
                  <tr key={o.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-card-soft)] transition-colors">
                    <td className="px-4 py-2.5 num text-xs text-[var(--text-muted)]">{o.date}</td>
                    <td className="px-4 py-2.5">{o.productName}</td>
                    <td className="px-4 py-2.5 num text-xs text-[var(--text-muted)]">{o.steadfastTrackingCode || "—"}</td>
                    <td className="px-4 py-2.5 num">৳{o.sellPrice.toLocaleString("en-BD")}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full ${
                          returned ? "tag-red" : delivered ? "tag-green" : "tag-mustard"
                        }`}
                      >
                        {o.steadfastStatus ? STATUS_LABEL_BN[o.steadfastStatus] : "চেক করা হয়নি"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] max-w-[220px]">
                      {o.steadfastNote ? (
                        <span title={o.steadfastNote} className="line-clamp-2">
                          {o.steadfastNote}
                        </span>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => refreshOne(o)}
                        disabled={busyId === o.id}
                        className="text-[11px] text-[var(--brown)] hover:underline disabled:opacity-50"
                      >
                        {busyId === o.id ? "..." : "রিফ্রেশ"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
