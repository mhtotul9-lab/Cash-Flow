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
import { Order, Partner, CommissionPayment } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tab, setTab] = useState<DashboardTab>("overview");

  const { data: orders, add: addOrderRaw, bulkAdd: bulkAddOrders, remove: removeOrder, update: updateOrder } = useOrders(uid);
  const { data: partners, add: addPartner, remove: removePartner, update: updatePartner } = usePartners(uid);
  const { data: dailyAdSpend, add: addAdSpend, remove: removeAdSpend } = useDailyAdSpend(uid);
  const { data: expenses, add: addExpense, remove: removeExpense } = useExpenses(uid);
  const { add: addCommissionPayment } = useCommissionPayments(uid);
  const { position, save: savePosition } = useCashPosition(uid);

  const netCash = netAvailableCash(position);

  const kpis = useMemo(() => calcKPIs(orders, expenses, partners, netCash), [orders, expenses, partners, netCash]);
  const alerts = useMemo(
    () => generateAlerts(netCash, position.minimumSafeCashLevel, kpis, orders, partners),
    [netCash, position.minimumSafeCashLevel, kpis, orders, partners]
  );

  // অর্ডার যোগ করার সময় পার্টনারের totalOrders ও totalCommissionDue আপডেট করা
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

  // Excel থেকে bulk import — পার্টনারের নাম মিলিয়ে partnerId সেট করা ও totals আপডেট
  async function bulkImportOrders(entries: Omit<Order, "id" | "createdAt">[]) {
    const matched = entries.map((entry) => {
      if (entry.source === "partner" && entry.partnerName) {
        const partner = partners.find(
          (p) => p.name.trim().toLowerCase() === entry.partnerName!.trim().toLowerCase()
        );
        if (partner) {
          return { ...entry, partnerId: partner.id };
        }
      }
      return entry;
    });

    await bulkAddOrders(matched);

    // প্রতিটা পার্টনারের totalOrders ও totalCommissionDue একসাথে আপডেট করা
    const partnerDeltas = new Map<string, { orders: number; commission: number }>();
    matched.forEach((entry) => {
      if (entry.source === "partner" && entry.partnerId) {
        const current = partnerDeltas.get(entry.partnerId) || { orders: 0, commission: 0 };
        current.orders += 1;
        current.commission += entry.commissionAmount;
        partnerDeltas.set(entry.partnerId, current);
      }
    });
    for (const [partnerId, delta] of partnerDeltas.entries()) {
      const partner = partners.find((p) => p.id === partnerId);
      if (partner) {
        await updatePartner(partnerId, {
          totalOrders: partner.totalOrders + delta.orders,
          totalCommissionDue: partner.totalCommissionDue + delta.commission,
        });
      }
    }
  }

  // কমিশন পরিশোধ করলে পার্টনারের totalCommissionPaid আপডেট
  async function handleAddPayment(entry: Omit<CommissionPayment, "id" | "createdAt">, partner: Partner) {
    await addCommissionPayment(entry);
    await updatePartner(partner.id, {
      totalCommissionPaid: partner.totalCommissionPaid + entry.amount,
    });
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar active={tab} onChange={setTab} alertCount={alerts.length} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {tab === "overview" && <OverviewTab position={position} kpis={kpis} orders={orders} alerts={alerts} />}
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
          {tab === "partners" && (
            <PartnersTab partners={partners} onAdd={addPartner} onDelete={removePartner} onAddPayment={handleAddPayment} />
          )}
          {tab === "adspend" && <AdSpendTab dailyAdSpend={dailyAdSpend} onAdd={addAdSpend} onDelete={removeAdSpend} />}
          {tab === "expenses" && <ExpensesTab expenses={expenses} onAdd={addExpense} onDelete={removeExpense} />}
          {tab === "forecast" && (
            <ForecastTab
              orders={orders}
              expenses={expenses}
              netCash={netCash}
              minSafeLevel={position.minimumSafeCashLevel}
            />
          )}
          {tab === "alerts" && <AlertsTab alerts={alerts} />}
          {tab === "settings" && <SettingsTab position={position} onSave={savePosition} />}
        </div>
      </main>
    </div>
  );
}
