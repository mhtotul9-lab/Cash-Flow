import {
  Order,
  Partner,
  ExpenseEntry,
  DailyAdSpend,
  ProductPurchase,
  CashPosition,
  KPISet,
  Alert,
  CommissionType,
  DailyReport,
} from "./types";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function calcCommission(
  sellPrice: number,
  commissionType: CommissionType | null,
  commissionValue: number
): number {
  if (!commissionType) return 0;
  if (commissionType === "fixed") return commissionValue;
  return round2((sellPrice * commissionValue) / 100);
}

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
  const returnLoss = extras?.isReturned
    ? extras?.returnAmount || sellPrice
    : 0;
  return round2(
    sellPrice -
      productCost -
      adSpend -
      commissionAmount -
      callPackagingCost -
      otherCost -
      returnLoss
  );
}

export function netAvailableCash(pos: CashPosition): number {
  return pos.bankBalance + pos.mobileWalletBalance + pos.cashInHand;
}

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
    avgDailyBurn > 0
      ? Math.max(0, Math.floor(netCash / avgDailyBurn))
      : 9999;

  const returnedOrders = orders.filter((o) => o.isReturned);
  const totalReturnLoss = round2(
    sum(returnedOrders.map((o) => o.returnAmount || o.sellPrice))
  );

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
    totalReturnLoss,
    totalReturnCount: returnedOrders.length,
  };
}

// ========== প্রতিদিনের রিপোর্ট জেনারেট করা (নতুন) ==========
export function calcDailyReports(
  orders: Order[],
  expenses: ExpenseEntry[],
  dateFrom: string,
  dateTo: string
): DailyReport[] {
  // তারিখ রেঞ্জের ভেতরে সব unique তারিখ বের করা
  const allDates = new Set<string>();

  orders
    .filter((o) => o.date >= dateFrom && o.date <= dateTo)
    .forEach((o) => allDates.add(o.date));

  expenses
    .filter((e) => e.date >= dateFrom && e.date <= dateTo)
    .forEach((e) => allDates.add(e.date));

  const sortedDates = Array.from(allDates).sort().reverse();

  return sortedDates.map((date) => {
    const dayOrders = orders.filter((o) => o.date === date);
    const dayExpenses = expenses.filter((e) => e.date === date);

    const returnedOrders = dayOrders.filter((o) => o.isReturned);

    const totalSell = sum(dayOrders.map((o) => o.sellPrice));
    const totalAdSpendBDT = sum(dayOrders.map((o) => o.adSpend));
    const totalAdSpendUSD = sum(
      dayOrders.map((o) => o.adSpendUSD || 0)
    );
    const totalProductCost = sum(dayOrders.map((o) => o.productCost));
    const totalCallPackaging = sum(
      dayOrders.map((o) => o.callPackagingCost || 0)
    );
    const totalOtherCost = sum(dayOrders.map((o) => o.otherCost || 0));
    const totalExpenses = sum(dayExpenses.map((e) => e.amount));
    const totalReturn = sum(
      returnedOrders.map((o) => o.returnAmount || o.sellPrice)
    );
    const orderProfit = sum(dayOrders.map((o) => o.netProfit));
    const netProfit = round2(orderProfit - totalExpenses);

    return {
      date,
      totalOrders: dayOrders.length,
      totalSell: round2(totalSell),
      totalAdSpendBDT: round2(totalAdSpendBDT),
      totalAdSpendUSD: round2(totalAdSpendUSD),
      totalProductCost: round2(totalProductCost),
      totalCallPackaging: round2(totalCallPackaging),
      totalOtherCost: round2(totalOtherCost),
      totalExpenses: round2(totalExpenses),
      totalReturn: round2(totalReturn),
      returnCount: returnedOrders.length,
      netProfit,
    };
  });
}

// ========== স্টক ক্যালকুলেশন (নতুন) ==========
export function calcStock(
  purchases: ProductPurchase[],
  orders: Order[],
  productName: string
): number {
  const bought = sum(
    purchases
      .filter(
        (p) => p.productName.toLowerCase() === productName.toLowerCase()
      )
      .map((p) => p.quantity)
  );
  const sold = orders.filter(
    (o) =>
      o.productName.toLowerCase() === productName.toLowerCase() &&
      !o.isReturned
  ).length;
  return Math.max(0, bought - sold);
}

export function generateAlerts(
  netCash: number,
  minimumSafeCashLevel: number,
  kpis: KPISet,
  orders: Order[],
  partners: Partner[],
  purchases?: ProductPurchase[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  if (netCash < minimumSafeCashLevel) {
    alerts.push({
      id: `neg-${now}`,
      type: "negative_cash_risk",
      severity: "critical",
      message: `হাতে থাকা টাকা (৳${netCash.toLocaleString("en-BD")}) তোমার সেফ লেভেলের (৳${minimumSafeCashLevel.toLocaleString("en-BD")}) চেয়ে কম। নতুন অ্যাড খরচ করার আগে সাবধান।`,
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

  const recentLossOrders = orders.filter((o) => o.netProfit < 0).slice(0, 5);
  recentLossOrders.forEach((o) => {
    alerts.push({
      id: `loss-${o.id}`,
      type: "loss_order",
      severity: "medium",
      message: `"${o.productName}" অর্ডারে (${o.date}) লোকসান হয়েছে — ৳${Math.abs(o.netProfit).toLocaleString("en-BD")} লস।`,
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
      message: `"${p.name}" এর কমিশন বাকি ৳${(p.totalCommissionDue - p.totalCommissionPaid).toLocaleString("en-BD")} — পরিশোধ করার কথা ভাবো।`,
      createdAt: now,
    });
  });

  const missingAdOrders = orders.filter(
    (o) => o.syncedFromJolrasi && o.adSpend === 0
  );
  if (missingAdOrders.length > 0) {
    alerts.push({
      id: `missing-ad-${now}`,
      type: "missing_ad_spend",
      severity: "low",
      message: `jolrasi থেকে অটো-সিঙ্ক হওয়া ${missingAdOrders.length}টা অর্ডারে অ্যাড খরচ বসানো হয়নি।`,
      createdAt: now,
    });
  }

  // স্টক কম হলে অ্যালার্ট (নতুন)
  if (purchases && purchases.length > 0) {
    const productNames = Array.from(
      new Set(purchases.map((p) => p.productName))
    );
    productNames.forEach((name) => {
      const stock = calcStock(purchases, orders, name);
      if (stock <= 5 && stock >= 0) {
        alerts.push({
          id: `stock-${name}-${now}`,
          type: "low_stock",
          severity: stock === 0 ? "high" : "low",
          message:
            stock === 0
              ? `"${name}" স্টক শেষ! নতুন করে কিনতে হবে।`
              : `"${name}" এর স্টক মাত্র ${stock} পিস বাকি।`,
          createdAt: now,
        });
      }
    });
  }

  return alerts;
}
