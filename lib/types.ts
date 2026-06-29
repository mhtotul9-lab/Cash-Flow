// ব্যবসার মূল ডোমেইন টাইপ — দুই সেক্টর: ডাইরেক্ট সেল ও পার্টনার সেল

export type OrderSource = "direct" | "partner";
export type CommissionType = "fixed" | "percentage";
export type AdSpendMode = "manual" | "average";

export interface Partner {
  id: string;
  name: string;
  area: string; // এলাকা/দোকানের নাম
  phone: string;
  commissionType: CommissionType;
  commissionValue: number; // ফিক্সড হলে টাকা, % হলে শতাংশ
  totalOrders: number;
  totalCommissionDue: number; // হিসাবযোগ্য, Firestore এ ক্যাশ করা থাকবে
  totalCommissionPaid: number;
  active: boolean;
  createdAt: number;
}

export interface Order {
  id: string;
  date: string; // ISO date
  source: OrderSource;
  partnerId: string | null; // source === "partner" হলে
  partnerName: string | null; // স্ন্যাপশট, পার্টনার মুছে গেলেও হিস্টোরি ঠিক থাকবে
  productName: string;
  sellPrice: number; // কাস্টমার থেকে পাওয়া টাকা
  productCost: number; // কাপড়ের পাইকারি দাম (BDT তে, ডলার রেট দিয়ে কনভার্ট করা থাকলে)
  productCostUSD?: number; // যদি বিদেশ থেকে ডলারে কেনা হয় (ঐচ্ছিক)
  dollarRate?: number; // সেই সময়ের ডলার রেট (ঐচ্ছিক, productCostUSD থাকলে কাজে লাগে)
  adSpendMode: AdSpendMode;
  adSpend: number; // manual হলে নিজে দেওয়া, average হলে ক্যালকুলেটেড স্ন্যাপশট
  callPackagingCost: number; // কল ও প্যাকেজিং খরচ (TA/DA)
  returnAmount: number; // অর্ডার রিটার্ন হলে যত টাকা ফেরত/লস
  isReturned: boolean;
  otherCost: number; // অন্য কোনো বিচ্ছিন্ন খরচ এই অর্ডারের জন্য
  commissionType: CommissionType | null;
  commissionValue: number; // স্ন্যাপশট— পরে পার্টনারের রেট পরিবর্তন হলেও পুরোনো অর্ডারের হিসাব ঠিক থাকবে
  commissionAmount: number; // ক্যালকুলেটেড
  netProfit: number; // ক্যালকুলেটেড
  paymentReceived: boolean;
  note: string;
  createdAt: number;
  syncedFromJolrasi?: boolean;
  jolrasiSaleId?: string;
}

export type DailyAdSpendCategory = "facebook" | "tiktok" | "other";

export interface DailyAdSpend {
  id: string;
  date: string;
  category: DailyAdSpendCategory;
  amount: number;
  note: string;
  createdAt: number;
}

export type ExpenseCategory =
  | "fabric_purchase" // কাপড় পাইকারি কেনা (বাল্ক, অর্ডারের বাইরে)
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

export interface CashPosition {
  bankBalance: number;
  mobileWalletBalance: number; // বিকাশ/নগদ এ থাকা টাকা
  cashInHand: number;
  minimumSafeCashLevel: number;
  asOf: string;
}

export interface CommissionPayment {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  note: string;
  createdAt: number;
}

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
  profitMargin: number; // %
  pendingCommissionDue: number;
  runwayDays: number;
}

export interface Alert {
  id: string;
  type:
    | "negative_cash_risk"
    | "low_margin_order"
    | "high_commission_due"
    | "loss_order"
    | "missing_ad_spend"
    | "cash_gap";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  createdAt: number;
}
