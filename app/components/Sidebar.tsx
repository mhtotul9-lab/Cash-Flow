"use client";

import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Megaphone,
  Wallet,
  LineChart,
  AlertTriangle,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
  Package,
  DollarSign,
  ClipboardList,
  Truck,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PermissionKey } from "@/lib/types";

export type DashboardTab =
  | "overview"
  | "orders"
  | "partners"
  | "adspend"
  | "expenses"
  | "purchases"   // নতুন — প্রোডাক্ট কেনা
  | "dollarrate"  // নতুন — ডলার রেট
  | "dailyreport" // নতুন — দৈনিক রিপোর্ট
  | "courier"     // নতুন — Steadfast কুরিয়ার
  | "team"        // নতুন — টিম/মডারেটর (শুধু মালিক)
  | "forecast"
  | "alerts"
  | "settings";

// যেই ট্যাবগুলোর জন্য নির্দিষ্ট permission লাগে — বাকিগুলো (undefined) সব সময় দেখা যাবে
const TAB_PERMISSION: Partial<Record<DashboardTab, PermissionKey>> = {
  orders: "orders",
  courier: "orders",
  adspend: "dailyAdSpend",
  expenses: "expenses",
  purchases: "productPurchases",
  dollarrate: "dollarRates",
  partners: "partners",
};
// এই ট্যাবগুলো শুধু মালিক (owner) দেখবে
const OWNER_ONLY_TABS: DashboardTab[] = ["team", "settings", "forecast"];

const NAV_ITEMS: {
  id: DashboardTab;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "ওভারভিউ", shortLabel: "হোম", icon: LayoutDashboard },
  { id: "orders", label: "অর্ডার", shortLabel: "অর্ডার", icon: ShoppingBag },
  { id: "dailyreport", label: "দৈনিক রিপোর্ট", shortLabel: "রিপোর্ট", icon: ClipboardList },
  { id: "courier", label: "কুরিয়ার", shortLabel: "কুরিয়ার", icon: Truck },
  { id: "partners", label: "পার্টনার", shortLabel: "পার্টনার", icon: Users },
  { id: "purchases", label: "প্রোডাক্ট কেনা", shortLabel: "কেনা", icon: Package },
  { id: "adspend", label: "অ্যাড খরচ", shortLabel: "অ্যাড", icon: Megaphone },
  { id: "dollarrate", label: "ডলার রেট", shortLabel: "ডলার", icon: DollarSign },
  { id: "expenses", label: "অন্য খরচ", shortLabel: "খরচ", icon: Wallet },
  { id: "team", label: "টিম", shortLabel: "টিম", icon: UserCog },
  { id: "forecast", label: "ফোরকাস্ট", shortLabel: "ফোরকাস্ট", icon: LineChart },
  { id: "alerts", label: "সতর্কতা", shortLabel: "সতর্কতা", icon: AlertTriangle },
  { id: "settings", label: "সেটিংস", shortLabel: "সেটিংস", icon: Settings },
];

// মোবাইল bottom bar এ সবচেয়ে বেশি ব্যবহৃত ৪টা
const MOBILE_PRIMARY_IDS: DashboardTab[] = [
  "overview",
  "orders",
  "dailyreport",
  "adspend",
];

export default function Sidebar({
  active,
  onChange,
  alertCount,
  isOwner = true,
  permissions,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  alertCount: number;
  isOwner?: boolean;
  permissions?: Partial<Record<PermissionKey, boolean>>;
}) {
  const { logout, user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const visibleItems = NAV_ITEMS.filter((i) => {
    if (OWNER_ONLY_TABS.includes(i.id) && !isOwner) return false;
    const requiredPerm = TAB_PERMISSION[i.id];
    if (requiredPerm && permissions && !permissions[requiredPerm]) return false;
    return true;
  });

  const primaryItems = visibleItems.filter((i) =>
    MOBILE_PRIMARY_IDS.includes(i.id)
  );
  const moreItems = visibleItems.filter(
    (i) => !MOBILE_PRIMARY_IDS.includes(i.id)
  );
  const moreActive = moreItems.some((i) => i.id === active);

  return (
    <>
      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="w-8 h-8 rounded-full bg-[image:var(--gradient-brown)] flex items-center justify-center shrink-0 shadow-[0_3px_10px_rgba(154,111,53,0.35)]">
            <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold text-[15px] tracking-tight">
            হিসাবের খাতা
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] translate-x-0.5"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                  strokeWidth={isActive ? 2.3 : 2}
                />
                <span>{item.label}</span>
                {item.id === "alerts" && alertCount > 0 && (
                  <span className="ml-auto bg-[var(--red)] text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center pulse-dot">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[image:var(--gradient-brown)] transition-all duration-200" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[var(--border-subtle)]">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </aside>

      {/* মোবাইল টপ হেডার */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--brown)]/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[var(--brown)]" strokeWidth={2} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold text-sm">
            হিসাবের খাতা
          </span>
        </div>
        <button onClick={logout} className="text-[var(--text-faint)] p-1.5 -mr-1.5">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* মোবাইল নিচের নেভিগেশন বার */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] safe-bottom">
        <div className="grid grid-cols-5 h-16">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className="flex flex-col items-center justify-center gap-1 btn-press relative"
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-[var(--brown)]" : "text-[var(--text-faint)]"}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={`text-[10px] leading-none ${
                    isActive ? "text-[var(--brown)] font-medium" : "text-[var(--text-faint)]"
                  }`}
                >
                  {item.shortLabel}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brown)] rounded-full" />
                )}
              </button>
            );
          })}

          {/* "আরও" বাটন */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center gap-1 btn-press relative"
          >
            <MoreHorizontal
              className={`w-5 h-5 ${moreActive ? "text-[var(--brown)]" : "text-[var(--text-faint)]"}`}
              strokeWidth={moreActive ? 2.4 : 2}
            />
            <span
              className={`text-[10px] leading-none ${
                moreActive ? "text-[var(--brown)] font-medium" : "text-[var(--text-faint)]"
              }`}
            >
              আরও
            </span>
            {alertCount > 0 && (
              <span className="absolute top-1 right-[26%] bg-[var(--red)] w-2 h-2 rounded-full" />
            )}
            {moreActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brown)] rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* মোবাইল "আরও" শীট */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMore(false)}
          />
          <div className="relative w-full bg-[var(--bg-card)] rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="font-[family-name:var(--font-display)] font-medium text-base">
                আরও অপশন
              </span>
              <button
                onClick={() => setShowMore(false)}
                className="text-[var(--text-muted)] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 pb-6 space-y-0.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChange(item.id);
                      setShowMore(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--brown)]/10 text-[var(--brown)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                    {item.id === "alerts" && alertCount > 0 && (
                      <span className="ml-auto bg-[var(--red)] text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                        {alertCount > 9 ? "9+" : alertCount}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="px-4 pt-3 pb-1 text-xs text-[var(--text-faint)] truncate border-t border-[var(--border-subtle)] mt-2">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
