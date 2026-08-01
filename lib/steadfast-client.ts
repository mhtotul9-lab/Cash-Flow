import { Order, SteadfastStatus } from "./types";

interface SteadfastConsignment {
  consignment_id: number;
  invoice: string;
  tracking_code: string;
  status: SteadfastStatus;
  note?: string;
}

async function callSteadfast(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/steadfast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "Steadfast key ভুল (401) — Vercel এর Environment Variables এ STEADFAST_API_KEY/STEADFAST_SECRET_KEY ঠিকভাবে বসানো আছে কিনা আর সেগুলো Steadfast প্যানেলের বর্তমান (regenerate করা থাকলে সর্বশেষ) key কিনা চেক করো, তারপর রিডিপ্লয় করো।"
      );
    }
    const detail =
      typeof data.details === "object" ? JSON.stringify(data.details) : data.details;
    throw new Error(data.error || detail || "Steadfast API ব্যর্থ হয়েছে");
  }
  return data.result;
}

// অর্ডারটাকে Steadfast এ কনসাইনমেন্ট হিসেবে পাঠানো
export async function sendOrderToSteadfast(order: Order) {
  const result = await callSteadfast("create_order", {
    invoice: order.id,
    recipient_name: order.recipientName || order.productName,
    recipient_phone: order.recipientPhone || "",
    recipient_address: order.recipientAddress || "",
    cod_amount: order.sellPrice,
    note: order.note || "",
  });
  const consignment: SteadfastConsignment = result?.consignment;
  return {
    steadfastConsignmentId: String(consignment?.consignment_id ?? ""),
    steadfastTrackingCode: consignment?.tracking_code ?? "",
    steadfastStatus: (consignment?.status ?? "in_review") as SteadfastStatus,
  };
}

// একটা অর্ডারের সর্বশেষ ডেলিভারি স্ট্যাটাস (আর রাইডারের নোট, যদি থাকে) চেক করা
export async function checkSteadfastStatus(
  order: Order
): Promise<{ status: SteadfastStatus; note: string | null } | null> {
  if (!order.steadfastConsignmentId) return null;
  const result = await callSteadfast("status_by_cid", {
    consignment_id: order.steadfastConsignmentId,
  });
  const status = (result?.delivery_status ?? result?.status ?? null) as SteadfastStatus | null;
  if (!status) return null;
  // Steadfast এর status response এ rider/delivery note এই field গুলোর কোনো একটায় আসতে পারে —
  // ঠিক কোনটায় আসল ডেটা আসছে সেটা লাইভ টেস্ট করে নিশ্চিত হওয়া দরকার
  const note =
    result?.note ??
    result?.delivery_note ??
    result?.remarks ??
    result?.rider_note ??
    null;
  return { status, note };
}

// স্ট্যাটাস অনুযায়ী বোঝা এই অর্ডারটা রিটার্ন/লস হিসেবে ধরতে হবে কিনা
export function isStatusReturned(status: SteadfastStatus): boolean {
  return status === "cancelled" || status === "cancelled_approval_pending";
}

export function isStatusDelivered(status: SteadfastStatus): boolean {
  return status === "delivered" || status === "partial_delivered";
}

// Steadfast অ্যাকাউন্টের বর্তমান ব্যালেন্স
export async function getSteadfastBalance(): Promise<number | null> {
  const result = await callSteadfast("get_balance", {});
  return typeof result?.current_balance === "number" ? result.current_balance : null;
}

export const STATUS_LABEL_BN: Record<SteadfastStatus, string> = {
  pending: "পেন্ডিং",
  delivered_approval_pending: "ডেলিভারড (অনুমোদন বাকি)",
  partial_delivered_approval_pending: "আংশিক ডেলিভারড (অনুমোদন বাকি)",
  cancelled_approval_pending: "বাতিল (অনুমোদন বাকি)",
  unknown_approval_pending: "অজানা (অনুমোদন বাকি)",
  delivered: "ডেলিভারড",
  partial_delivered: "আংশিক ডেলিভারড",
  cancelled: "বাতিল/রিটার্ন",
  hold: "হোল্ড",
  in_review: "রিভিউতে আছে",
  unknown: "অজানা",
};
