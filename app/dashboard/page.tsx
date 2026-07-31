"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  useOrders,
  usePartners,
  useDailyAdSpend,
  useExpenses,
  useCashPosition,
  useCommissionPayments,
  useProductPurchases,
  useDollarRates,
  useLatestDollarRate,
} from "@/lib/firestore-hooks";
import { calcKPIs, generateAlerts, netAvailableCash } from "@/lib/calculations";
import Sidebar, { DashboardTab } from "../components/Sidebar";
import OverviewTab from "../components/OverviewTab";
import OrdersTab from "../components/OrdersTab";
import PartnersTab from "../components/PartnersTab";
import AdSpendTab from "../components/AdSpendTab";
import ExpensesTab from "../components/ExpensesTab";
import ForecastTab from "../components/ForecastTab";
import AlertsTab from "../components/AlertsTab";
import SettingsTab from "../components/SettingsTab";
import ProductPurchaseTab from "../components/ProductPurchaseTab";
import DollarRateTab from "../components/DollarRateTab";
import DailyReportTab from "../components/DailyReportTab";
import CourierTab from "../components/CourierTab";
import TeamTab from "../components/TeamTab";
import { useWorkspace } from "@/lib/workspace";
import { Order, Partner, CommissionPayment, DollarRate, ProductPurchase } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { dataUid: uid, isOwner, permissions, loading: workspaceLoading } = useWorkspace(user);
  const [tab, setTab] = useState<DashboardTab>("overview");

  // ডেটা হুক
  const { data: orders, add: addOrderRaw, bulkAdd: bulkAddOrders, remove: removeOrder, update: updateOrder } = useOrders(uid);
  const { data: partners, add: addPartner, remove: removePartner, update: updatePartner } = usePartners(uid);
  const { data: dailyAdSpend, add: addAdSpend, remove: removeAdSpend, update: updateAdSpend } = useDailyAdSpend(uid);
  const { data: expenses, add: addExpense, remove: removeExpense, update: updateExpense } = useExpenses(uid);
  const { add: addCommissionPayment } = useCommissionPayments(uid);
  const { data: purchases, add: addPurchase, remove: removePurchase, update: updatePurchase } = useProductPurchases(uid);
  const { data: dollarRates, add: addDollarRate, remove: removeDollarRate, update: updateDollarRate } = useDollarRates(uid);
  const { position, save: savePosition } = useCashPosition(uid);

  // আজকের তারিখে ডলার রেট
  const today = new Date().toISOString().slice(0, 10);
  const latestDollarRate = useLatestDollarRate(dollarRates, today);

  const netCash = netAvailableCash(position);

  const kpis = useMemo(
    () => calcKPIs(orders, expenses, partners, netCash),
    [orders, expenses, partners, netCash]
  );

  const alerts = useMemo(
    () => generateAlerts(netCash, position.minimumSafeCashLevel, kpis, orders, partners, purchases),
    [netCash, position.minimumSafeCashLevel, kpis, orders, partners, purchases]
  );

  // অর্ডার যোগ করার সময় পার্টনারের commission আপডেট
  async function addOrder(entry: Omit<Order, "id" | "createdAt">) {
    await addOrderRaw(entry);
    if (entry.source === "partner" && entry.partnerId) {
      const partner = partners.find((p) => p.id === entry.partnerId);
      if (partner) {
        await updatePartner(partner.id, {
          totalOrders: partner.totalOrders + 1,
          totalCommissionDue: partner.totalCommissionDue + entry.commissionAmount,
        });
      }
    }
  }

  // Excel bulk import — নাম মিলিয়ে partnerId সেট
  async function bulkImportOrders(entries: Omit<Order, "id" | "createdAt">[]) {
    const matched = entries.map((entry) => {
      if (entry.source === "partner" && entry.partnerName) {
        const partner = partners.find(
          (p) => p.name.trim().toLowerCase() === entry.partnerName!.trim().toLowerCase()
        );
        if (partner) return { ...entry, partnerId: partner.id };
      }
      return entry;
    });

    await bulkAddOrders(matched);

    // partner totals আপডেট
    const deltas = new Map<string, { orders: number; commission: number }>();
    matched.forEach((entry) => {
      if (entry.source === "partner" && entry.partnerId) {
        const cur = deltas.get(entry.partnerId) || { orders: 0, commission: 0 };
        deltas.set(entry.partnerId, {
          orders: cur.orders + 1,
          commission: cur.commission + entry.commissionAmount,
        });
      }
    });
    for (const [partnerId, delta] of deltas.entries()) {
      const partner = partners.find((p) => p.id === partnerId);
      if (partner) {
        await updatePartner(partnerId, {
          totalOrders: partner.totalOrders + delta.orders,
          totalCommissionDue: partner.totalCommissionDue + delta.commission,
        });
      }
    }
  }

  // কমিশন পরিশোধ
  async function handleAddPayment(
    entry: Omit<CommissionPayment, "id" | "createdAt">,
    partner: Partner
  ) {
    await addCommissionPayment(entry);
    await updatePartner(partner.id, {
      totalCommissionPaid: partner.totalCommissionPaid + entry.amount,
    });
  }

  // অ্যাড খরচ — DollarRate যুক্ত করা
  async function handleAddAdSpend(
    entry: Omit<(typeof dailyAdSpend)[0], "id" | "createdAt">
  ) {
    await addAdSpend(entry);
    // যদি আজকের ডলার রেট লগ না থাকে এবং ডলারে খরচ দেওয়া হয়, অটো রেট সেভ করা
    if (entry.dollarRate && entry.amountUSD) {
      const todayRate = dollarRates.find((r) => r.date === entry.date);
      if (!todayRate) {
        await addDollarRate({
          date: entry.date,
          rate: entry.dollarRate,
          note: "অ্যাড খরচ থেকে অটো সেভ",
        } as Omit<DollarRate, "id" | "createdAt">);
      }
    }
  }

  // প্রোডাক্ট কেনা — DollarRate যুক্ত করা
  async function handleAddPurchase(
    entry: Omit<ProductPurchase, "id" | "createdAt">
  ) {
    await addPurchase(entry);
    if (entry.dollarRate && entry.unitPriceUSD) {
      const dateRate = dollarRates.find((r) => r.date === entry.date);
      if (!dateRate) {
        await addDollarRate({
          date: entry.date,
          rate: entry.dollarRate,
          note: "প্রোডাক্ট কেনা থেকে অটো সেভ",
        } as Omit<DollarRate, "id" | "createdAt">);
      }
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--bg-base)]">
      <Sidebar
        active={tab}
        onChange={setTab}
        alertCount={alerts.length}
        isOwner={isOwner}
        permissions={permissions}
      />

      <main className="flex-1 overflow-y-auto">
        <div key={tab} className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-8 animate-fade-in">
          {workspaceLoading ? (
            <div className="flex items-center justify-center py-24 text-sm text-[var(--text-faint)]">
              লোড হচ্ছে...
            </div>
          ) : (
          <>
          {tab === "overview" && (
            <OverviewTab
              position={position}
              kpis={kpis}
              orders={orders}
              alerts={alerts}
            />
          )}

          {tab === "orders" && (
            <OrdersTab
              orders={orders}
              partners={partners}
              dailyAdSpend={dailyAdSpend}
              onAdd={addOrder}
              onDelete={removeOrder}
              onUpdate={updateOrder}
              onBulkImport={bulkImportOrders}
            />
          )}

          {tab === "dailyreport" && (
            <DailyReportTab
              orders={orders}
              expenses={expenses}
            />
          )}

          {tab === "courier" && (
            <CourierTab orders={orders} onUpdate={updateOrder} />
          )}

          {tab === "partners" && (
            <PartnersTab
              partners={partners}
              onAdd={addPartner}
              onDelete={removePartner}
              onAddPayment={handleAddPayment}
              onUpdate={updatePartner}
            />
          )}

          {tab === "purchases" && (
            <ProductPurchaseTab
              purchases={purchases}
              onAdd={handleAddPurchase}
              onDelete={removePurchase}
              onUpdate={updatePurchase}
              latestDollarRate={latestDollarRate}
            />
          )}

          {tab === "adspend" && (
            <AdSpendTab
              dailyAdSpend={dailyAdSpend}
              onAdd={handleAddAdSpend}
              onDelete={removeAdSpend}
              onUpdate={updateAdSpend}
              latestDollarRate={latestDollarRate}
            />
          )}

          {tab === "dollarrate" && (
            <DollarRateTab
              dollarRates={dollarRates}
              onAdd={addDollarRate}
              onDelete={removeDollarRate}
              onUpdate={updateDollarRate}
            />
          )}

          {tab === "expenses" && (
            <ExpensesTab
              expenses={expenses}
              onAdd={addExpense}
              onDelete={removeExpense}
              onUpdate={updateExpense}
            />
          )}

          {tab === "forecast" && (
            <ForecastTab
              orders={orders}
              expenses={expenses}
              netCash={netCash}
              minSafeLevel={position.minimumSafeCashLevel}
            />
          )}

          {tab === "alerts" && <AlertsTab alerts={alerts} />}

          {tab === "settings" && (
            <SettingsTab position={position} onSave={savePosition} />
          )}

          {tab === "team" && uid && <TeamTab ownerUid={uid} />}
          </>
          )}
        </div>
        <div className="mobile-nav-spacer md:hidden" />
      </main>
    </div>
  );
}
