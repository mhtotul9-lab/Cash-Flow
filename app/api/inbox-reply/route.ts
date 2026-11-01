import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildUserPrompt,
  cleanBusiness,
  cleanCatalog,
  cleanLang,
  cleanProduct,
  cleanThread,
  clean,
  extractJson,
  readApiKey,
  readGeminiKey,
  normalizeResult,
  LIMITS,
} from "@/lib/inbox-prompt";
import { firebaseConfig } from "@/lib/firebase-config";

export const maxDuration = 60;

// স্ক্রিনের স্ট্যাটাস লাইনে দেখানো হয় — বোঝা যায় নতুন কোড ডিপ্লয় হয়েছে কিনা
const VERSION = "2026-11-01-gemini";

// ============================================================================
//  AI প্রোভাইডার:
//   ১) Google Gemini (প্রধান) — NexoraPilot এর ইনবক্স টুল যেটা ব্যবহার করে। Vercel এ GEMINI_API_KEY লাগবে।
//   ২) OpenRouter (বিকল্প)   — Vercel এ OPENROUTER_API_KEY থাকলে Gemini ব্যর্থ হলে এটা চেষ্টা হবে।
//  কী গুলো শুধু সার্ভারে থাকে, ব্রাউজারে কখনো যায় না।
// ============================================================================

type Provider = "gemini" | "openrouter";
type FailKind = "auth" | "credit" | "limit" | "notfound" | "parse" | "other";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Gemini মডেলের নাম বদলায়, তাই ক্রমে চেষ্টা। Vercel এ GEMINI_MODELS (কমা দিয়ে) দিলে সেটা আগে চেষ্টা হবে।
const DEFAULT_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const DEFAULT_OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/free",
];

const REQUEST_TIMEOUT_MS = 20000;
const TOTAL_BUDGET_MS = 48000;

function listFromEnv(name: string, defaults: string[], max: number): string[] {
  const fromEnv = (process.env[name] ?? "")
    .split(",")
    .map((m) => m.trim().replace(/^["']+|["']+$/g, ""))
    .filter(Boolean);
  const all = [...fromEnv, ...defaults];
  return all.filter((m, i) => all.indexOf(m) === i).slice(0, max);
}

class AiError extends Error {
  kind: FailKind;
  provider: Provider;
  constructor(provider: Provider, kind: FailKind, message: string) {
    super(message);
    this.provider = provider;
    this.kind = kind;
  }
}

function shortDetail(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j?.error?.message) return String(j.error.message).slice(0, 160);
  } catch {
    /* ignore */
  }
  return body.replace(/\s+/g, " ").slice(0, 160);
}

async function safeFetch(provider: Provider, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new AiError(provider, "other", "সংযোগ ব্যর্থ বা সময় শেষ");
  }
}

// ------------------------------- Gemini -------------------------------
async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number
): Promise<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // JSON মোড — AI কে বাধ্য করে শুধু বৈধ JSON দিতে (ফ্রি OpenRouter মডেলে এটা থাকে না, তাই Gemini বেশি নির্ভরযোগ্য)
    generationConfig: { temperature, responseMimeType: "application/json" },
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await safeFetch("gemini", `${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
    });
    if (res.status < 500 || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 1500)); // মডেল ব্যস্ত (৫xx) — একটু থেমে আবার
  }
  if (!res) throw new AiError("gemini", "other", "উত্তর আসেনি");

  if (!res.ok) {
    const detail = shortDetail(await res.text());
    const keyProblem = res.status === 401 || res.status === 403 || (res.status === 400 && /api key|API_KEY/i.test(detail));
    const kind: FailKind = keyProblem ? "auth" : res.status === 429 ? "limit" : res.status === 404 ? "notfound" : "other";
    throw new AiError("gemini", kind, `${model} → ${res.status}: ${detail}`);
  }

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) {
    const block = data.promptFeedback?.blockReason;
    throw new AiError("gemini", block ? "other" : "parse", block ? `Gemini ব্লক করেছে: ${block}` : "খালি উত্তর");
  }
  return text;
}

// ------------------------------ OpenRouter ------------------------------
async function callOpenRouter(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number
): Promise<string> {
  const res = await safeFetch("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const detail = shortDetail(await res.text());
    const kind: FailKind =
      res.status === 401 || res.status === 403
        ? "auth"
        : res.status === 402
          ? "credit"
          : res.status === 429
            ? "limit"
            : res.status === 404
              ? "notfound"
              : "other";
    throw new AiError("openrouter", kind, `${model} → ${res.status}: ${detail}`);
  }
  const data = await res.json().catch(() => ({}));
  return data.choices?.[0]?.message?.content ?? "";
}

// ------------------------------ ব্যবহারকারীর জন্য বার্তা ------------------------------
function userMessage(provider: Provider, kind: FailKind, detail: string): string {
  const name = provider === "gemini" ? "Gemini" : "OpenRouter";
  switch (kind) {
    case "auth":
      return provider === "gemini"
        ? "Gemini API key কাজ করছে না (৪০০/৪০১/৪০৩)।\nকারণ: কী-টা ভুল, মুছে ফেলা, অথবা সেই কী-তে Gemini API বন্ধ।\nসমাধান: aistudio.google.com/apikey এ নতুন কী বানিয়ে Vercel এ GEMINI_API_KEY এ বসান → Redeploy করুন।"
        : "OpenRouter আপনার API key গ্রহণ করেনি (৪০১)।\nসমাধান: openrouter.ai এ নতুন কী বানিয়ে Vercel এ OPENROUTER_API_KEY এ বসান → Redeploy করুন।";
    case "credit":
      return "আপনার OpenRouter অ্যাকাউন্টের ব্যালেন্স নেগেটিভ (৪০২)। openrouter.ai → Credits এ কিছু ক্রেডিট যোগ করুন।";
    case "limit":
      return provider === "gemini"
        ? "Gemini এর ফ্রি লিমিট সাময়িকভাবে শেষ (৪২৯)। ১ মিনিট পর আবার চেষ্টা করুন। দৈনিক সীমা শেষ হলে কাল আবার চলবে।"
        : "OpenRouter এর ফ্রি লিমিট শেষ (৪২৯): প্রতি মিনিটে ২০টি, প্রতিদিন ৫০টি রিকোয়েস্ট। কিছুক্ষণ বা কাল আবার চেষ্টা করুন।";
    case "notfound":
      return provider === "gemini"
        ? "Gemini মডেল পাওয়া যায়নি (গুগল মডেলের নাম বদলায়)।\nসমাধান: Vercel এ GEMINI_MODELS এ বর্তমান মডেলের নাম দিন, যেমন gemini-2.5-flash।"
        : "কোনো ফ্রি মডেল পাওয়া যায়নি (মডেল বন্ধ/বদল হয়েছে বা OpenRouter এর Privacy সেটিংসে ব্লক)।\nসমাধান: Vercel এ OPENROUTER_MODELS এ বর্তমান :free মডেলের নাম দিন।";
    case "parse":
      return "AI এর উত্তর বোঝা যায়নি। আবার চেষ্টা করুন।";
    default:
      return `${name} এখন সাময়িকভাবে উত্তর দিতে পারছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।${detail ? `\n(কারিগরি তথ্য: ${detail})` : ""}`;
  }
}

const PRIORITY: FailKind[] = ["auth", "credit", "limit", "notfound", "parse", "other"];

interface ProviderPlan {
  provider: Provider;
  key: string;
  models: string[];
}

// একটার পর একটা প্রোভাইডার ও মডেল চেষ্টা। কী ভুল (auth) হলে ওই প্রোভাইডারের বাকি মডেলে লাভ নেই।
// সব ব্যর্থ হলে প্রতিটা প্রোভাইডারের এরর আলাদা করে দেখানো হয় — যাতে একটার সমস্যা আরেকটার আড়ালে লুকিয়ে না যায়।
async function generate(plans: ProviderPlan[], system: string, user: string, variant: boolean, notes: string[]) {
  const failures: AiError[] = [];
  const started = Date.now();

  outer: for (const plan of plans) {
    for (const model of plan.models) {
      if (Date.now() - started > TOTAL_BUDGET_MS) break outer;
      try {
        const raw =
          plan.provider === "gemini"
            ? await callGemini(plan.key, model, system, user, variant ? 1.0 : 0.8)
            : await callOpenRouter(plan.key, model, system, user, variant ? 0.9 : 0.5);
        return normalizeResult(extractJson(raw));
      } catch (err) {
        if (err instanceof AiError) {
          failures.push(err);
          if (err.kind === "auth") break; // এই প্রোভাইডারের কী-ই ভুল, পরের প্রোভাইডারে যাই
        } else {
          failures.push(new AiError(plan.provider, "parse", err instanceof Error ? err.message : "parse"));
        }
      }
    }
  }

  const parts: string[] = [];
  for (const plan of plans) {
    const mine = failures.filter((f) => f.provider === plan.provider);
    if (mine.length === 0) continue;
    const worst = PRIORITY.map((k) => mine.find((f) => f.kind === k)).find(Boolean)!;
    const detail = worst.kind === "other" ? worst.message : "";
    const label = plan.provider === "gemini" ? "【Gemini】" : "【OpenRouter】";
    parts.push(`${plans.length > 1 ? label + " " : ""}${userMessage(plan.provider, worst.kind, detail)}`);
  }
  if (parts.length === 0) parts.push("AI উত্তর দিতে পারেনি। আবার চেষ্টা করুন।");
  throw new AiError(plans[0].provider, "other", [...parts, ...notes].join("\n\n"));
}

// লগইন করা ইউজার কিনা যাচাই — যেন বাইরের কেউ আপনার AI কী দিয়ে খরচ করতে না পারে।
async function verifyFirebaseUser(idToken: string): Promise<boolean> {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) return false;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { users?: unknown[] };
    return Array.isArray(data.users) && data.users.length > 0;
  } catch {
    return false;
  }
}

// কোন কোন প্রোভাইডার চালু আছে — না থাকলে ব্যবহারকারীকে কী করতে হবে তার বার্তা
function planProviders(): { plans: ProviderPlan[]; error: string | null; notes: string[] } {
  const gem = readGeminiKey(process.env.GEMINI_API_KEY);
  const orr = readApiKey(process.env.OPENROUTER_API_KEY);
  const plans: ProviderPlan[] = [];
  if (gem.problem === null) {
    plans.push({ provider: "gemini", key: gem.key, models: listFromEnv("GEMINI_MODELS", DEFAULT_GEMINI_MODELS, 5) });
  }
  if (orr.problem === null) {
    plans.push({ provider: "openrouter", key: orr.key, models: listFromEnv("OPENROUTER_MODELS", DEFAULT_OPENROUTER_MODELS, 4) });
  }
  const notes: string[] = [];
  if (gem.problem === "missing") {
    notes.push("ℹ️ Gemini কী বসানো নেই (Vercel এ GEMINI_API_KEY)। বসালে এই সমস্যা থাকবে না — ফ্রি, aistudio.google.com/apikey থেকে নিন।");
  } else if (gem.problem === "format") {
    notes.push("ℹ️ Vercel এর GEMINI_API_KEY ভুল (AIza দিয়ে শুরু হওয়ার কথা), তাই Gemini বাদ গেছে। সঠিক কী বসান।");
  }
  if (plans.length > 0) return { plans, error: null, notes };

  if (gem.problem === "format") {
    return {
      plans,
      notes,
      error:
        "Vercel এ GEMINI_API_KEY এ যা বসানো আছে সেটা Gemini এর কী নয় (Gemini কী সবসময় AIza দিয়ে শুরু হয়)। aistudio.google.com/apikey থেকে সঠিক কী নিয়ে বসান, তারপর Redeploy করুন।",
    };
  }
  if (orr.problem === "format") {
    return {
      plans,
      notes,
      error:
        "Vercel এ OPENROUTER_API_KEY এ যা বসানো আছে সেটা OpenRouter এর কী নয় (সবসময় sk-or- দিয়ে শুরু হয়)। অথবা সহজ উপায়: aistudio.google.com/apikey থেকে ফ্রি Gemini কী নিয়ে GEMINI_API_KEY নামে বসান, তারপর Redeploy করুন।",
    };
  }
  return {
    plans,
    notes,
    error:
      "AI কী বসানো নেই।\nসবচেয়ে সহজ: aistudio.google.com/apikey থেকে ফ্রি Gemini কী নিয়ে Vercel → Settings → Environment Variables এ GEMINI_API_KEY নামে বসান, তারপর Redeploy করুন।\n(বিকল্প হিসেবে OPENROUTER_API_KEY ও চলবে।)",
  };
}

export async function POST(req: NextRequest) {
  try {
    // ১) লগইন যাচাই
    const auth = req.headers.get("authorization") || "";
    const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!idToken || !(await verifyFirebaseUser(idToken))) {
      return NextResponse.json({ error: "লগইন যাচাই করা যায়নি। পেজ রিফ্রেশ করে আবার লগইন করুন।" }, { status: 401 });
    }

    // ২) AI কী আছে কিনা
    const { plans, error: configError, notes } = planProviders();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 });
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
    const thread = cleanThread(body.thread);
    const variant = body.variant === true;

    // ৪) AI কল
    const result = await generate(
      plans,
      buildSystemPrompt(lang),
      buildUserPrompt({ business, product, catalog, message, context, thread, variant }),
      variant,
      notes
    );
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// স্ট্যাটাস: কোন AI কী ঠিকমতো বসানো আছে (কী নিজে কখনো পাঠানো হয় না)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!idToken || !(await verifyFirebaseUser(idToken))) {
    return NextResponse.json({ error: "লগইন যাচাই করা যায়নি।" }, { status: 401 });
  }
  const gem = readGeminiKey(process.env.GEMINI_API_KEY);
  const orr = readApiKey(process.env.OPENROUTER_API_KEY);
  return NextResponse.json({
    version: VERSION,
    gemini: gem.problem ?? "ok",
    openrouter: orr.problem ?? "ok",
  });
}
