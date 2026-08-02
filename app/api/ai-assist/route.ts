import { NextRequest, NextResponse } from "next/server";

const PRIMARY_MODEL = "openai/gpt-oss-120b:free";
const BACKUP_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
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
      temperature: 0.3,
    }),
  });

  if (res.status === 429) {
    throw Object.assign(new Error("rate_limited"), { code: 429 });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callWithFallback(systemPrompt: string, userPrompt: string) {
  try {
    return await callOpenRouter(PRIMARY_MODEL, systemPrompt, userPrompt);
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 429) {
      return await callOpenRouter(BACKUP_MODEL, systemPrompt, userPrompt);
    }
    throw err;
  }
}

const SUGGEST_SYSTEM_PROMPT = `তুমি একজন কঠোর, সরাসরি ক্যাশ ফ্লো উপদেষ্টা যিনি একটি বাংলাদেশী পাইকারি কাপড় বিজনেসের জন্য কাজ করো।
এই ব্যবসার মডেল: মালিক পাইকারি দরে কাপড় কিনে Facebook/TikTok অ্যাড দিয়ে নিজে সেল করে (ডাইরেক্ট সেল), এবং কিছু সেল পার্টনার দোকানদারদের মাধ্যমে হয় যাদের প্রতি সেলে কমিশন দিতে হয় (পার্টনার সেল) — কিন্তু অ্যাড খরচ ও প্রোডাক্ট খরচ মালিকের।
ব্যবহারকারী তাদের বর্তমান ক্যাশ পজিশন, KPI এবং অ্যালার্ট এর ডেটা দিবে।
তোমার কাজ: ৩-৫টি সংক্ষিপ্ত, কার্যকর পরামর্শ দেওয়া, গুরুত্ব অনুসারে সাজানো।
সবসময় ক্যাশ সারভাইভাল কে প্রথম প্রায়োরিটি দিবে, তারপর profit margin, তারপর growth।
ডাইরেক্ট সেল বনাম পার্টনার সেল এর প্রফিট তুলনা করে পরামর্শে ব্যবহার করতে পারো।
শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দিবে, অন্য কোনো টেক্সট ছাড়া:
{
  "recommendations": [
    { "priority": "critical" | "high" | "medium" | "low", "action": "string (বাংলায়, সংক্ষিপ্ত, সরাসরি)" }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload } = body as { payload: unknown };

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Debug: Vercel logs এ দেখা যাবে key আছে কিনা ও কত character
    console.log("[ai-assist] OPENROUTER_API_KEY present:", !!apiKey, "length:", apiKey?.length ?? 0);

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY কনফিগার করা নেই বা ফাঁকা।" },
        { status: 500 }
      );
    }

    const userPrompt =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const raw = await callWithFallback(SUGGEST_SYSTEM_PROMPT, userPrompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI রেসপন্স পার্স করা যায়নি।", raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
