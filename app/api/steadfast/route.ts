import { NextRequest, NextResponse } from "next/server";

// Steadfast Courier API — বেস URL
const BASE_URL = "https://portal.packzy.com/api/v1";

// এই দুইটা কখনো ব্রাউজারে যাবে না — শুধু Vercel এর
// Environment Variables এ সেট করবে (STEADFAST_API_KEY, STEADFAST_SECRET_KEY)
function getAuthHeaders() {
  const apiKey = process.env.STEADFAST_API_KEY?.trim();
  const secretKey = process.env.STEADFAST_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) return null;
  return {
    "Api-Key": apiKey,
    "Secret-Key": secretKey,
    "Content-Type": "application/json",
  };
}

type Action =
  | "create_order"
  | "status_by_cid"
  | "status_by_invoice"
  | "status_by_trackingcode"
  | "get_balance";

export async function POST(req: NextRequest) {
  try {
    const headers = getAuthHeaders();
    if (!headers) {
      return NextResponse.json(
        {
          error:
            "STEADFAST_API_KEY / STEADFAST_SECRET_KEY কনফিগার করা নেই। Vercel Project Settings → Environment Variables এ যোগ করো।",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action, payload } = body as { action: Action; payload: Record<string, unknown> };

    let url = "";
    let method: "GET" | "POST" = "POST";
    let fetchBody: string | undefined;

    switch (action) {
      case "create_order":
        url = `${BASE_URL}/create_order`;
        fetchBody = JSON.stringify(payload);
        break;
      case "status_by_cid":
        url = `${BASE_URL}/status_by_cid/${payload.consignment_id}`;
        method = "GET";
        break;
      case "status_by_invoice":
        url = `${BASE_URL}/status_by_invoice/${payload.invoice}`;
        method = "GET";
        break;
      case "status_by_trackingcode":
        url = `${BASE_URL}/status_by_trackingcode/${payload.tracking_code}`;
        method = "GET";
        break;
      case "get_balance":
        url = `${BASE_URL}/get_balance`;
        method = "GET";
        break;
      default:
        return NextResponse.json({ error: "অজানা action" }, { status: 400 });
    }

    const res = await fetch(url, { method, headers, body: fetchBody });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Steadfast error (${res.status})`, details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ result: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
