import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildUserPrompt,
  cleanBusiness,
  cleanCatalog,
  cleanLang,
  cleanProduct,
  clean,
  extractJson,
  normalizeResult,
  LIMITS,
} from "@/lib/inbox-prompt";
import { firebaseConfig } from "@/lib/firebase-config";

// আগের /api/ai-assist এর মতোই OpenRouter ব্যবহার করা হয়েছে — একই OPENROUTER_API_KEY কাজ করবে।
const PRIMARY_MODEL = "openai/gpt-oss-120b:free";
const BACKUP_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export const maxDuration = 60;

// লগইন করা ইউজার কিনা যাচাই — যেন বাইরের কেউ আপনার OpenRouter key দিয়ে AI চালাতে না পারে।
// (নতুন কোনো প্যাকেজ লাগে না — Firebase এর নিজস্ব REST API ব্যবহার করা হয়েছে)
async function verifyFirebaseUser(idToken: string): Promise<boolean> {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) return false;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { users?: unknown[] };
    return Array.isArray(data.users) && data.users.length > 0;
  } catch {
    return false;
  }
}

async function callOpenRouter(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// প্রথম মডেল ব্যর্থ হলে (rate limit / সার্ভার এরর / খারাপ JSON) ব্যাকআপ মডেল চেষ্টা করে
async function generate(systemPrompt: string, userPrompt: string) {
  let lastError: unknown = null;
  for (const model of [PRIMARY_MODEL, BACKUP_MODEL]) {
    try {
      const raw = await callOpenRouter(model, systemPrompt, userPrompt);
      return normalizeResult(extractJson(raw));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI উত্তর দিতে পারেনি");
}

export async function POST(req: NextRequest) {
  try {
    // ১) লগইন যাচাই
    const auth = req.headers.get("authorization") || "";
    const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!idToken || !(await verifyFirebaseUser(idToken))) {
      return NextResponse.json({ error: "লগইন যাচাই করা যায়নি। পেজ রিফ্রেশ করে আবার লগইন করুন।" }, { status: 401 });
    }

    // ২) API key আছে কিনা
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim().length === 0) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY কনফিগার করা নেই বা ফাঁকা।" }, { status: 500 });
    }

    // ৩) ইনপুট পরিষ্কার
    const body = (await req.json()) as Record<string, unknown>;
    const message = clean(body.message, LIMITS.message);
    if (!message) {
      return NextResponse.json({ error: "কাস্টমারের মেসেজ খালি।" }, { status: 400 });
    }
    const context = clean(body.context, LIMITS.context);
    const lang = cleanLang(body.lang);
    const business = cleanBusiness(body.business);
    const product = cleanProduct(body.product);
    const catalog = cleanCatalog(body.catalog, product?.name);

    // ৪) AI কল
    const result = await generate(
      buildSystemPrompt(lang),
      buildUserPrompt({ business, product, catalog, message, context })
    );
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `উত্তর তৈরি করা যায়নি: ${message}` }, { status: 502 });
  }
}
