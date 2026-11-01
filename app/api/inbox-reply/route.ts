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
  readApiKey,
  normalizeResult,
  LIMITS,
} from "@/lib/inbox-prompt";
import { firebaseConfig } from "@/lib/firebase-config";

// ফ্রি মডেল প্রতি সপ্তাহে বদলায়/বন্ধ হয়ে যায়, তাই কয়েকটা মডেল ক্রমে চেষ্টা করা হয়।
// Vercel এ OPENROUTER_MODELS নামে ভ্যারিয়েবল (কমা দিয়ে আলাদা করে) দিলে সেটাই আগে চেষ্টা হবে —
// তাহলে মডেল বন্ধ হলে কোড না বদলে শুধু Vercel থেকেই ঠিক করা যায়।
const DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/free",
];

function getModels(): string[] {
  const fromEnv = (process.env.OPENROUTER_MODELS ?? "")
    .split(",")
    .map((m) => m.trim().replace(/^["']+|["']+$/g, ""))
    .filter(Boolean);
  const all = [...fromEnv, ...DEFAULT_MODELS];
  return all.filter((m, i) => all.indexOf(m) === i).slice(0, 5);
}

type FailKind = "auth" | "credit" | "limit" | "notfound" | "parse" | "other";

class AiError extends Error {
  kind: FailKind;
  constructor(kind: FailKind, message: string) {
    super(message);
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

function userMessage(kind: FailKind, detail: string): string {
  switch (kind) {
    case "auth":
      return (
        "OpenRouter আপনার API key গ্রহণ করেনি (৪০১)।\n" +
        "কারণ: কী-টা ভুল, মুছে ফেলা বা নিষ্ক্রিয়।\n" +
        "সমাধান: openrouter.ai এ গিয়ে নতুন কী বানান → Vercel এ OPENROUTER_API_KEY এ বসান → Redeploy করুন।"
      );
    case "credit":
      return "আপনার OpenRouter অ্যাকাউন্টের ব্যালেন্স নেগেটিভ (৪০২)। openrouter.ai → Credits এ গিয়ে কিছু ক্রেডিট যোগ করুন, তাহলে ফ্রি মডেলও আবার চলবে।";
    case "limit":
      return "OpenRouter এর ফ্রি লিমিট শেষ (৪২৯): প্রতি মিনিটে ২০টি এবং প্রতিদিন ৫০টি রিকোয়েস্ট। কিছুক্ষণ পর বা কাল আবার চেষ্টা করুন। (১০ ডলারের ক্রেডিট একবার কিনলে দৈনিক সীমা ১০০০ হয়।)";
    case "notfound":
      return (
        "কোনো ফ্রি মডেল পাওয়া যায়নি (ফ্রি মডেল প্রায়ই বন্ধ/বদল হয়, অথবা OpenRouter এর Privacy সেটিংসে ফ্রি মডেল ব্লক করা আছে)।\n" +
        "সমাধান: openrouter.ai/models এ ফিল্টার করে একটা বর্তমান :free মডেল দেখে Vercel এ OPENROUTER_MODELS এ বসান, অথবা Settings → Privacy দেখুন।"
      );
    case "parse":
      return "AI এর উত্তর বোঝা যায়নি। আবার চেষ্টা করুন।";
    default:
      return `AI এখন সাময়িকভাবে উত্তর দিতে পারছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।${detail ? `\n(কারিগরি তথ্য: ${detail})` : ""}`;
  }
}

const PRIORITY: FailKind[] = ["auth", "credit", "limit", "notfound", "parse", "other"];

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

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
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
    throw new AiError(kind, `${model} → ${res.status}: ${detail}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// একটার পর একটা মডেল চেষ্টা করে। কী ভুল হলে (৪০১) বাকি মডেলে চেষ্টা করে লাভ নেই, তাই সাথে সাথে থামে।
async function generate(apiKey: string, systemPrompt: string, userPrompt: string) {
  const failures: AiError[] = [];
  for (const model of getModels()) {
    try {
      const raw = await callOpenRouter(apiKey, model, systemPrompt, userPrompt);
      return normalizeResult(extractJson(raw));
    } catch (err) {
      if (err instanceof AiError) {
        failures.push(err);
        if (err.kind === "auth") break;
      } else {
        failures.push(new AiError("parse", err instanceof Error ? err.message : "parse"));
      }
    }
  }
  const worst = PRIORITY.map((k) => failures.find((f) => f.kind === k)).find(Boolean);
  const kind = worst?.kind ?? "other";
  const detail = kind === "other" ? (worst?.message ?? "") : "";
  throw new AiError(kind, userMessage(kind, detail));
}

export async function POST(req: NextRequest) {
  try {
    // ১) লগইন যাচাই
    const auth = req.headers.get("authorization") || "";
    const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!idToken || !(await verifyFirebaseUser(idToken))) {
      return NextResponse.json({ error: "লগইন যাচাই করা যায়নি। পেজ রিফ্রেশ করে আবার লগইন করুন।" }, { status: 401 });
    }

    // ২) API key আছে কিনা এবং OpenRouter কী এর মতো দেখাচ্ছে কিনা
    const { key: apiKey, problem } = readApiKey(process.env.OPENROUTER_API_KEY);
    if (problem === "missing") {
      return NextResponse.json(
        { error: "Vercel এ OPENROUTER_API_KEY বসানো নেই বা ফাঁকা। openrouter.ai থেকে কী নিয়ে Vercel → Settings → Environment Variables এ বসান, তারপর Redeploy করুন।" },
        { status: 500 }
      );
    }
    if (problem === "format") {
      return NextResponse.json(
        { error: "Vercel এ OPENROUTER_API_KEY এ যা বসানো আছে সেটা OpenRouter এর কী নয় (OpenRouter এর কী সবসময় sk-or- দিয়ে শুরু হয়)। openrouter.ai → Keys থেকে সঠিক কী নিয়ে বসান, তারপর Redeploy করুন।" },
        { status: 500 }
      );
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
      apiKey,
      buildSystemPrompt(lang),
      buildUserPrompt({ business, product, catalog, message, context })
    );
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
