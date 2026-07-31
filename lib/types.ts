// ব্যবসার মূল ডোমেইন টাইপ

export type OrderSource = "direct" | "partner";
export type CommissionType = "fixed" | "percentage";
export type AdSpendMode = "manual" | "average";

// ========== পার্টনার ==========
export interface Partner {
  id: string;
  name: string;
  area: string;
  phone: string;
  commissionType: CommissionType;
  commissionValue: number;
  totalOrders: number;
  totalCommissionDue: number;
  totalCommissionPaid: number;
  active: boolean;
  createdAt: number;
}

// ========== প্রোডাক্ট ক্রয় (নতুন) ==========
export interface ProductPurchase {
  id: string;
  date: string;
  productName: string;
  quantity: number;          // কতটা কিনেছ
  unitPrice: number;         // প্রতি পিসের দাম (BDT)
  unitPriceUSD?: number;     // ডলারে কিনলে
  dollarRate?: number;       // সেদিনের ডলার রেট
  totalCost: number;         // quantity × unitPrice (BDT)
  shippingCost: number;      // আনার খরচ (কুরিয়ার/পরিবহন)
  note: string;
  createdAt: number;
}

// ========== ডলার রেট লগ (নতুন) ==========
export interface DollarRate {
  id: string;
  date: string;
  rate: number;              // ১ ডলার = কত টাকা
  note: string;
  createdAt: number;
}

// ========== অর্ডার ==========
export interface Order {
  id: string;
  date: string;
  source: OrderSource;
  partnerId: string | null;
  partnerName: string | null;
  productName: string;
  sellPrice: number;
  productCost: number;
  productCostUSD?: number;
  dollarRate?: number;
  adSpendMode: AdSpendMode;
  adSpend: number;
  adSpendUSD?: number;       // ডলারে অ্যাড খরচ (নতুন)
  adSpendDollarRate?: number; // সেদিনের ডলার রেট (নতুন)
  callPackagingCost: number;
  returnAmount: number;
  isReturned: boolean;
  otherCost: number;
  commissionType: CommissionType | null;
  commissionValue: number;
  commissionAmount: number;
  netProfit: number;
  paymentReceived: boolean;
  note: string;
  createdAt: number;
  syncedFromJolrasi?: boolean;
  jolrasiSaleId?: string;
  // ========== Steadfast কুরিয়ার (নতুন) ==========
  steadfastConsignmentId?: string;   // Steadfast এ পাঠানোর পর তাদের consignment_id
  steadfastTrackingCode?: string;    // ট্র্যাকিং কোড
  steadfastStatus?: SteadfastStatus; // সর্বশেষ ডেলিভারি স্ট্যাটাস
  steadfastLastCheckedAt?: number;   // সর্বশেষ কবে স্ট্যাটাস চেক করা হয়েছে
  recipientName?: string;            // Steadfast এ পাঠাতে দরকার
  recipientPhone?: string;
  recipientAddress?: string;
}

export type SteadfastStatus =
  | "pending"
  | "delivered_approval_pending"
  | "partial_delivered_approval_pending"
  | "cancelled_approval_pending"
  | "unknown_approval_pending"
  | "delivered"
  | "partial_delivered"
  | "cancelled"
  | "hold"
  | "in_review"
  | "unknown";

// ========== অ্যাড খরচ ==========
export type DailyAdSpendCategory = "facebook" | "tiktok" | "other";

export interface DailyAdSpend {
  id: string;
  date: string;
  category: DailyAdSpendCategory;
  amount: number;            // BDT
  amountUSD?: number;        // ডলারে হলে (নতুন)
  dollarRate?: number;       // সেদিনের ডলার রেট (নতুন)
  note: string;
  createdAt: number;
}

// ========== অন্য খরচ ==========
export type ExpenseCategory =
  | "fabric_purchase"
  | "shipping"
  | "packaging"
  | "salary"
  | "rent_utilities"
  | "software_tools"
  | "bank_charges"
  | "misc";

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
  createdAt: number;
}

// ========== ক্যাশ পজিশন ==========
export interface CashPosition {
  bankBalance: number;
  mobileWalletBalance: number;
  cashInHand: number;
  minimumSafeCashLevel: number;
  asOf: string;
}

// ========== কমিশন পেমেন্ট ==========
export interface CommissionPayment {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  note: string;
  createdAt: number;
}

// ========== KPI ==========
export interface KPISet {
  totalOrders: number;
  directOrders: number;
  partnerOrders: number;
  totalRevenue: number;
  totalProductCost: number;
  totalAdSpend: number;
  totalCommission: number;
  netProfit: number;
  directProfit: number;
  partnerProfit: number;
  avgProfitPerOrder: number;
  profitMargin: number;
  pendingCommissionDue: number;
  runwayDays: number;
  totalReturnLoss: number;
  totalReturnCount: number;
}

// ========== প্রতিদিনের রিপোর্ট (নতুন) ==========
export interface DailyReport {
  date: string;
  totalOrders: number;
  totalSell: number;          // মোট আয়
  totalAdSpendBDT: number;    // অ্যাড খরচ (BDT তে)
  totalAdSpendUSD: number;    // অ্যাড খরচ ($)
  totalProductCost: number;   // পণ্যের দাম
  totalCallPackaging: number; // কল ও প্যাকেজিং
  totalOtherCost: number;     // অন্য খরচ
  totalExpenses: number;      // সাধারণ খরচ (ExpenseEntry)
  totalReturn: number;        // রিটার্ন লস
  returnCount: number;        // রিটার্ন সংখ্যা
  netProfit: number;          // মোট লাভ/লস
}

// ========== অ্যালার্ট ==========
export interface Alert {
  id: string;
  type:
    | "negative_cash_risk"
    | "low_margin_order"
    | "high_commission_due"
    | "loss_order"
    | "missing_ad_spend"
    | "cash_gap"
    | "low_stock";          // নতুন — স্টক কম হলে
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  createdAt: number;
}

// ========== টিম / মডারেটর (নতুন) ==========

// এই কালেকশনের নামগুলোই Firestore rules এ permission key হিসেবে ব্যবহার হয় —
// তাই lib/firestore-hooks.ts এর কালেকশন নামের সাথে হুবহু মিলতে হবে
export const PERMISSION_MODULES: { key: PermissionKey; label: string }[] = [
  { key: "orders", label: "অর্ডার" },
  { key: "dailyAdSpend", label: "অ্যাড খরচ" },
  { key: "expenses", label: "অন্য খরচ" },
  { key: "productPurchases", label: "প্রোডাক্ট কেনা" },
  { key: "dollarRates", label: "ডলার রেট" },
  { key: "partners", label: "পার্টনার ও কমিশন" },
];

export type PermissionKey =
  | "orders"
  | "dailyAdSpend"
  | "expenses"
  | "productPurchases"
  | "dollarRates"
  | "partners";

export type WorkspacePermissions = Record<PermissionKey, boolean>;

export interface TeamMember {
  id: string;
  email: string;
  permissions: WorkspacePermissions;
  status: "pending" | "active";
  createdAt: number;
  memberUid?: string; // অ্যাক্সেপ্ট করার পর তাদের নিজের Firebase uid
}

export interface TeamInvite {
  code: string;
  ownerUid: string;
  ownerBusinessName?: string;
  email: string;
  permissions: WorkspacePermissions;
  teamMemberId: string;
  createdAt: number;
}
