import {
  Order,
  Partner,
  ExpenseEntry,
  DailyAdSpend,
  CashPosition,
  KPISet,
  Alert,
  CommissionType,
} from "./types";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/** একটা নির্দিষ্ট সেল প্রাইস ও কমিশন রেট থেকে কমিশনের টাকা হিসাব */
export function calcCommission(
  sellPrice: number,
  commissionType: CommissionType | null,
  commissionValue: number
): number {
  if (!commissionType) return 0;
  if (commissionType === "fixed") return commissionValue;
  return round2((sellPrice * commissionValue) / 100);
}

/** একটা অর্ডারের নেট প্রফিট হিসাব — মূল বিজনেস লজিক */
/** একটা অর্ডারের নেট প্রফিট হিসাব — মূল বিজনেস লজিক
 *  নেট প্রফিট = সেল প্রাইস − কাপড়ের দাম − অ্যাড খরচ − কমিশন − কল/প্যাকেজিং − অন্য খরচ − রিটার্ন (যদি থাকে)
 */
export function calcOrderProfit(
  sellPrice: number,
  productCost: number,
  adSpend: number,
  commissionAmount: number,
  extras?: {
    callPackagingCost?: number;
    otherCost?: number;
    returnAmount?: number;
    isReturned?: boolean;
  }
): number {
  const callPackagingCost = extras?.callPackagingCost || 0;
  const otherCost = extras?.otherCost || 0;
  const returnLoss = extras?.isReturned ? (extras?.returnAmount || sellPrice) : 0;
  return round2(
    sellPrice - productCost - adSpend - commissionAmount - callPackagingCost - otherCost - returnLoss
  );
}

export function netAvailableCash(pos: CashPosition): number {
  return pos.bankBalance + pos.mobileWalletBalance + pos.cashInHand;
}

/** নির্দিষ্ট তারিখের জন্য দৈনিক গড় অ্যাড স্পেন্ড থেকে প্রতি-অর্ডার ভাগ বের করা */
export function calcAverageAdSpendPerOrder(
  dailyAdSpend: DailyAdSpend[],
  orders: Order[],
  date: string
): number {
  const totalSpendOnDate = sum(
    dailyAdSpend.filter((d) => d.date === date).map((d) => d.amount)
  );
  const ordersOnDate = orders.filter((o) => o.date === date).length;
  if (ordersOnDate === 0) return 0;
  return round2(totalSpendOnDate / ordersOnDate);
}

export function calcKPIs(
  orders: Order[],
  expenses: ExpenseEntry[],
  partners: Partner[],
  netCash: number,
  windowDays: number = 30
): KPISet {
  const directOrders = orders.filter((o) => o.source === "direct");
  const partnerOrders = orders.filter((o) => o.source === "partner");

  const totalRevenue = sum(orders.map((o) => o.sellPrice));
  const totalProductCost = sum(orders.map((o) => o.productCost));
  const totalAdSpend = sum(orders.map((o) => o.adSpend));
  const totalCommission = sum(orders.map((o) => o.commissionAmount));
  const orderNetProfit = sum(orders.map((o) => o.netProfit));

  const totalExpenses = sum(expenses.map((e) => e.amount));
  const netProfit = round2(orderNetProfit - totalExpenses);

  const directProfit = round2(sum(directOrders.map((o) => o.netProfit)));
  const partnerProfit = round2(sum(partnerOrders.map((o) => o.netProfit)));

  const avgProfitPerOrder =
    orders.length > 0 ? round2(orderNetProfit / orders.length) : 0;

  const profitMargin =
    totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0;

  const pendingCommissionDue = round2(
    sum(partners.map((p) => p.totalCommissionDue - p.totalCommissionPaid))
  );

  const avgDailyBurn =
    totalExpenses + totalAdSpend + totalProductCost > 0
      ? (totalExpenses + totalAdSpend + totalProductCost) / windowDays
      : 0;
  const runwayDays =
    avgDailyBurn > 0 ? Math.max(0, Math.floor(netCash / avgDailyBurn)) : 9999;

  return {
    totalOrders: orders.length,
    directOrders: directOrders.length,
    partnerOrders: partnerOrders.length,
    totalRevenue: round2(totalRevenue),
    totalProductCost: round2(totalProductCost),
    totalAdSpend: round2(totalAdSpend),
    totalCommission: round2(totalCommission),
    netProfit,
    directProfit,
    partnerProfit,
    avgProfitPerOrder,
    profitMargin,
    pendingCommissionDue,
    runwayDays: runwayDays > 9999 ? 9999 : runwayDays,
  };
}

export function generateAlerts(
  netCash: number,
  minimumSafeCashLevel: number,
  kpis: KPISet,
  orders: Order[],
  partners: Partner[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  if (netCash < minimumSafeCashLevel) {
    alerts.push({
      id: `neg-${now}`,
      type: "negative_cash_risk",
      severity: "critical",
      message: `হাতে থাকা টাকা (৳${netCash.toLocaleString(
        "en-BD"
      )}) তোমার সেফ লেভেলের (৳${minimumSafeCashLevel.toLocaleString(
        "en-BD"
      )}) চেয়ে কম। নতুন অ্যাড খরচ করার আগে সাবধান।`,
      createdAt: now,
    });
  }

  if (kpis.runwayDays < 14 && kpis.runwayDays < 9999) {
    alerts.push({
      id: `runway-${now}`,
      type: "cash_gap",
      severity: kpis.runwayDays < 7 ? "critical" : "high",
      message: `বর্তমান খরচের গতিতে তোমার হাতের টাকা মাত্র ${kpis.runwayDays} দিন চলবে।`,
      createdAt: now,
    });
  }

  const recentLossOrders = orders.filter((o) => o.netProfit < 0).slice(0, 10);
  recentLossOrders.forEach((o) => {
    alerts.push({
      id: `loss-${o.id}`,
      type: "loss_order",
      severity: "medium",
      message: `"${o.productName}" অর্ডারে (${o.date}) লোকসান হয়েছে — ৳${Math.abs(
        o.netProfit
      ).toLocaleString("en-BD")} লস।`,
      createdAt: now,
    });
  });

  const highDuePartners = partners.filter(
    (p) => p.totalCommissionDue - p.totalCommissionPaid > 5000
  );
  highDuePartners.forEach((p) => {
    alerts.push({
      id: `due-${p.id}`,
      type: "high_commission_due",
      severity: "medium",
      message: `"${p.name}" এর কমিশন বাকি ৳${(
        p.totalCommissionDue - p.totalCommissionPaid
      ).toLocaleString("en-BD")} — পরিশোধ করার কথা ভাবো।`,
      createdAt: now,
    });
  });

  const missingAdSpendOrders = orders.filter((o) => o.syncedFromJolrasi && o.adSpend === 0);
  if (missingAdSpendOrders.length > 0) {
    alerts.push({
      id: `missing-ad-${now}`,
      type: "missing_ad_spend",
      severity: "low",
      message: `jolrasi থেকে অটো-সিঙ্ক হওয়া ${missingAdSpendOrders.length}টা অর্ডারে অ্যাড খরচ এখনো বসানো হয়নি — তাই এগুলোর প্রফিট সঠিক না।`,
      createdAt: now,
    });
  }

  return alerts;
}
