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
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export type DashboardTab =
  | "overview"
  | "orders"
  | "partners"
  | "adspend"
  | "expenses"
  | "forecast"
  | "alerts"
  | "settings";

const NAV_ITEMS: { id: DashboardTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "ওভারভিউ", icon: LayoutDashboard },
  { id: "orders", label: "অর্ডার", icon: ShoppingBag },
  { id: "partners", label: "পার্টনার (দোকানদার)", icon: Users },
  { id: "adspend", label: "অ্যাড খরচ", icon: Megaphone },
  { id: "expenses", label: "অন্য খরচ", icon: Wallet },
  { id: "forecast", label: "ফোরকাস্ট", icon: LineChart },
  { id: "alerts", label: "সতর্কতা", icon: AlertTriangle },
  { id: "settings", label: "সেটিংস", icon: Settings },
];

export default function Sidebar({
  active,
  onChange,
  alertCount,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  alertCount: number;
}) {
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-full bg-[var(--brown)]/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-4.5 h-4.5 text-[var(--brown)]" strokeWidth={2} />
        </div>
        <span className="font-[family-name:var(--font-display)] font-semibold text-[15px] tracking-tight">
          হিসাবের খাতা
        </span>
        <button onClick={() => setMobileOpen(false)} className="ml-auto md:hidden text-[var(--text-muted)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                isActive
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.3 : 2} />
              <span>{item.label}</span>
              {item.id === "alerts" && alertCount > 0 && (
                <span className="ml-auto bg-[var(--red)] text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--brown)] rounded-full" />
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
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] flex-col">
        {content}
      </aside>

      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--brown)]/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[var(--brown)]" strokeWidth={2} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold text-sm">হিসাবের খাতা</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-[var(--text-muted)]">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-[var(--bg-base)] border-r border-[var(--border-subtle)] h-full">{content}</div>
        </div>
      )}
    </>
  );
}
