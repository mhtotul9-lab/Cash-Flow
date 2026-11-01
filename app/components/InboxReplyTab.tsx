"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Store,
  Save,
  Globe,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useInboxProducts, useInboxBusiness } from "@/lib/inbox-hooks";
import {
  InboxProduct,
  InboxBusinessInfo,
  InboxReplyLang,
  InboxReplyResult,
  InboxThreadTurn,
  INBOX_MAX_PRODUCTS,
} from "@/lib/types";
import FormPanel, { FieldLabel, inputClass } from "./FormPanel";

type SubTab = "reply" | "products" | "business";

const TONE_OPTIONS: { value: string; label: string; prompt: string }[] = [
  { value: "friendly", label: "😊 বন্ধুসুলভ ও আন্তরিক", prompt: "friendly, warm and sincere" },
  { value: "respectful", label: "🙏 খুব ভদ্র ও সম্মানসূচক", prompt: "very polite and respectful" },
  { value: "professional", label: "💼 পেশাদার", prompt: "professional and clear" },
  { value: "direct", label: "⚡ সংক্ষিপ্ত ও সরাসরি", prompt: "short, direct and to the point (still polite)" },
];

const ADDRESS_OPTIONS = ["স্যার/ম্যাম", "আপু", "ভাইয়া", "আপনি (কোনো সম্বোধন ছাড়া)"];

const LANG_OPTIONS: { value: InboxReplyLang; label: string }[] = [
  { value: "auto", label: "অটো (কাস্টমার যেভাবে লিখেছে)" },
  { value: "bangla", label: "বাংলা" },
  { value: "banglish", label: "Banglish" },
  { value: "english", label: "English" },
];

const LANG_LABEL: Record<string, string> = {
  bangla: "বাংলা",
  banglish: "Banglish",
  english: "English",
  mixed: "মিশ্র ভাষা",
  other: "অন্য",
};

const RULES_SNIPPET = `match /users/{uid}/inboxProducts/{docId} {
  allow read: if request.auth != null && (
    request.auth.uid == uid ||
    get(/databases/$(database)/documents/teamMemberships/$(request.auth.uid)).data.ownerUid == uid
  );
  allow write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/inboxSettings/{docId} {
  allow read: if request.auth != null && (
    request.auth.uid == uid ||
    get(/databases/$(database)/documents/teamMemberships/$(request.auth.uid)).data.ownerUid == uid
  );
  allow write: if request.auth != null && request.auth.uid == uid;
}`;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyButton({
  text,
  label = "কপি",
  onCopied,
}: {
  text: string;
  label?: string;
  onCopied?: (text: string) => void;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const t = text.trim();
        if (!t) return;
        if (await copyText(t)) {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
          onCopied?.(t);
        }
      }}
      className="flex items-center gap-1.5 text-xs font-medium text-[var(--brown)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 hover:border-[var(--brown)] transition-colors btn-press"
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? "কপি হয়েছে" : label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  const rulesProblem = message.includes("Rules");
  return (
    <div className="bg-[var(--red-soft)] border border-[var(--red)]/30 rounded-xl p-3.5 text-sm text-[var(--red)] space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="whitespace-pre-wrap">{message}</span>
      </div>
      {rulesProblem && (
        <details className="text-xs text-[var(--text-primary)]">
          <summary className="cursor-pointer font-medium">Firebase Rules এ কী যোগ করতে হবে (দেখুন)</summary>
          <p className="mt-2 text-[var(--text-muted)]">
            Firebase Console → Firestore Database → Rules এ আপনার বিদ্যমান{" "}
            <code>match /users/{"{uid}"}/...</code> নিয়মগুলোর পাশে নিচের অংশ বসিয়ে Publish করুন:
          </p>
          <pre className="mt-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg p-2.5 overflow-x-auto text-[11px] leading-relaxed">
            {RULES_SNIPPET}
          </pre>
        </details>
      )}
    </div>
  );
}

// ================= AI স্ট্যাটাস =================
type AiState = "ok" | "missing" | "format";
interface AiStatusData {
  version: string;
  gemini: AiState;
  openrouter: AiState;
}

function AiStatus() {
  const { user } = useAuth();
  const uid = user?.uid;
  // user অবজেক্ট বদলালেও যেন বারবার রিকোয়েস্ট না যায় — শুধু uid বদলালে একবার চেক হয়
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });
  const [status, setStatus] = useState<AiStatusData | "old" | "error" | null>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      try {
        const token = await userRef.current?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/inbox-reply", { headers: { Authorization: `Bearer ${token}` } });
        if (!alive) return;
        // GET কাজ না করলে (৪০৫) মানে সাইটে এখনো পুরনো কোড ডিপ্লয় আছে
        if (res.status === 404 || res.status === 405) return setStatus("old");
        if (!res.ok) return setStatus("error");
        const data = (await res.json()) as AiStatusData;
        setStatus(data);
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!status || status === "error") return null;

  const steps = (
    <ol className="list-decimal pl-5 space-y-1 mt-2 text-[var(--text-primary)]">
      <li>
        aistudio.google.com/apikey এ গিয়ে <b>Create API key</b> চাপুন (কী <code>AIza</code> দিয়ে শুরু হয়, বিনা পয়সায়)।
      </li>
      <li>
        Vercel → প্রোজেক্ট → Settings → Environment Variables → Name: <code>GEMINI_API_KEY</code>, Value: কী-টা (কোটেশন/স্পেস ছাড়া) → Save।
      </li>
      <li>
        Vercel → Deployments → সবচেয়ে উপরের ডিপ্লয়ের <b>⋯</b> → <b>Redeploy</b>।
      </li>
      <li>এই পেজ রিফ্রেশ করুন — উপরে সবুজ লেখা এলে হয়ে গেছে।</li>
    </ol>
  );

  if (status === "old") {
    return (
      <div className="bg-[var(--red-soft)] border border-[var(--red)]/30 rounded-xl p-3 text-xs text-[var(--red)]">
        🔴 সাইটে এখনো পুরনো কোড ডিপ্লয় আছে। GitHub-এ নতুন ফাইল আপলোড করে Vercel-এ ডিপ্লয় শেষ (Ready) হওয়া পর্যন্ত অপেক্ষা করুন।
      </div>
    );
  }

  if (status.gemini === "ok") {
    return (
      <div className="bg-[var(--green-soft)] border border-[var(--green)]/30 rounded-xl p-2.5 text-xs text-[var(--green)]">
        🟢 AI প্রস্তুত — Gemini চালু আছে{status.openrouter === "ok" ? " (বিকল্প: OpenRouter)" : ""}
      </div>
    );
  }

  const gemProblem =
    status.gemini === "format"
      ? "Vercel এ GEMINI_API_KEY এ ভুল জিনিস বসানো আছে (Gemini কী সবসময় AIza দিয়ে শুরু হয়)।"
      : "Gemini কী এখনো Vercel এ বসানো নেই।";

  return (
    <div
      className={`rounded-xl p-3 text-xs border ${
        status.openrouter === "ok"
          ? "bg-[var(--mustard-soft)] border-[var(--mustard)]/30"
          : "bg-[var(--red-soft)] border-[var(--red)]/30"
      }`}
    >
      <p className="font-medium">
        {status.openrouter === "ok"
          ? "🟡 শুধু OpenRouter চালু আছে — ফ্রি লিমিট খুব কম (দিনে ৫০টি), তাই বারবার ব্যর্থ হবে।"
          : "🔴 কোনো AI কী ঠিকভাবে বসানো নেই।"}{" "}
        {gemProblem}
      </p>
      <details className="mt-1.5">
        <summary className="cursor-pointer font-medium underline">ঠিক করার ৪টি ধাপ (দেখুন)</summary>
        {steps}
      </details>
    </div>
  );
}

// ================= উত্তর তৈরি =================
function autoRows(text: string): number {
  return Math.min(14, Math.max(3, Math.ceil(text.length / 48) + (text.match(/\n/g) || []).length));
}

function ReplyPanel({
  products,
  business,
  businessSaved,
  goTo,
}: {
  products: InboxProduct[];
  business: InboxBusinessInfo;
  businessSaved: boolean;
  goTo: (t: SubTab) => void;
}) {
  const { user } = useAuth();
  const [productId, setProductId] = useState<string>("general");
  const [lang, setLang] = useState<InboxReplyLang>("auto");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<InboxReplyResult | null>(null);
  const [drafts, setDrafts] = useState({ main: "", short: "", follow: "" });
  // এই কাস্টমারের সাথে এ পর্যন্ত কথোপকথন — AI আগের কথা মনে রাখবে
  const [thread, setThread] = useState<InboxThreadTurn[]>([]);
  const [last, setLast] = useState<{ msg: string; committed: boolean } | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  async function generate(variant: boolean) {
    // "আরেকটা ভার্সন": আগের কপি-করা টার্ন বাদ দিয়ে একই মেসেজে আবার
    let t = thread;
    let msg = message.trim();
    if (variant && last) {
      msg = last.msg;
      if (last.committed) {
        t = thread.slice(0, -2);
        setThread(t);
        setLast({ ...last, committed: false });
      }
      setMessage(last.msg);
    }
    if (!msg) {
      setError("আগে কাস্টমারের মেসেজ পেস্ট করুন।");
      return;
    }
    if (!user) {
      setError("লগইন সম্পূর্ণ হয়নি, একটু অপেক্ষা করুন।");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const tone = TONE_OPTIONS.find((x) => x.value === business.tone)?.prompt ?? business.tone;
      const res = await fetch("/api/inbox-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: msg,
          context,
          lang,
          variant,
          thread: t,
          business: { ...business, tone },
          product: selected
            ? {
                name: selected.name,
                price: selected.price,
                details: selected.details,
                offer: selected.offer,
                stockNote: selected.stockNote,
                socialProof: selected.socialProof,
              }
            : null,
          catalog: products.map((p) => ({ name: p.name, price: p.price })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: InboxReplyResult; error?: string };
      if (!res.ok || !data.result) {
        throw new Error(data.error || "উত্তর তৈরি করা যায়নি।");
      }
      setResult(data.result);
      setDrafts({ main: data.result.mainReply, short: data.result.shortReply, follow: data.result.followUp });
      setLast({ msg, committed: false });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "কিছু একটা ভুল হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  // উত্তর কপি করলে সেটা কথোপকথনে যোগ হয় (ফলো-আপ বাদে)
  function onCopied(kind: "main" | "short" | "follow", text: string) {
    if (kind === "follow" || !last || last.committed) return;
    setThread((t) => [...t, { role: "customer", text: last.msg }, { role: "me", text }]);
    setLast({ ...last, committed: true });
    setMessage("");
    setNotice("কপি হয়েছে ✅ — কাস্টমার রিপ্লাই দিলে শুধু তার নতুন মেসেজ পেস্ট করুন, AI আগের কথা মনে রাখবে।");
  }

  function resetThread() {
    setThread([]);
    setLast(null);
    setResult(null);
    setMessage("");
    setNotice(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <AiStatus />
      {!businessSaved && (
        <div className="bg-[var(--mustard-soft)] border border-[var(--mustard)]/30 rounded-xl p-3 text-xs text-[var(--text-primary)] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--mustard)] shrink-0 mt-0.5" />
          <span>
            ব্যবসার তথ্য এখনো সেভ করা হয়নি — এখন ডিফল্ট তথ্য ব্যবহার হচ্ছে।{" "}
            <button type="button" onClick={() => goTo("business")} className="underline font-medium">
              ব্যবসার তথ্য ঠিক করুন
            </button>
          </span>
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-4 card-elevated">
        <div>
          <FieldLabel>কোন প্রোডাক্ট নিয়ে কথা হচ্ছে?</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProductId("general")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors btn-press ${
                productId === "general"
                  ? "bg-[var(--brown)] text-white border-[var(--brown)]"
                  : "bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              সাধারণ উত্তর
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className={`px-3 py-2 rounded-xl text-sm border transition-colors btn-press ${
                  productId === p.id
                    ? "bg-[var(--brown)] text-white border-[var(--brown)]"
                    : "bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                }`}
              >
                {p.name}
                {p.price && <span className="opacity-70"> · ৳{p.price}</span>}
              </button>
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] mt-2">
              এখনো কোনো প্রোডাক্ট সেভ করা নেই।{" "}
              <button type="button" onClick={() => goTo("products")} className="text-[var(--brown)] underline font-medium">
                প্রথম প্রোডাক্ট যোগ করুন
              </button>{" "}
              — তাহলে উত্তর সেই প্রোডাক্টের তথ্য অনুযায়ী আসবে।
            </p>
          )}
        </div>

        {thread.length > 0 && (
          <details className="bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-xl p-3" open>
            <summary className="cursor-pointer text-sm font-medium select-none">
              💬 এই কাস্টমারের সাথে কথোপকথন ({thread.length}টি বার্তা)
            </summary>
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto text-xs">
              {thread.map((t, i) => (
                <p key={i} className={t.role === "me" ? "text-[var(--brown-deep)]" : "text-[var(--text-muted)]"}>
                  <b>{t.role === "me" ? "আমি" : "কাস্টমার"}:</b> {t.text}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={resetThread}
              className="mt-2 text-xs font-medium text-[var(--red)] border border-[var(--red)]/30 rounded-lg px-2.5 py-1.5 hover:bg-[var(--red-soft)] transition-colors"
            >
              🆕 নতুন কাস্টমার (কথোপকথন মুছুন)
            </button>
          </details>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>উত্তরের ভাষা</FieldLabel>
            <select value={lang} onChange={(e) => setLang(e.target.value as InboxReplyLang)} className={inputClass}>
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel hint="ইনবক্স থেকে কপি করে পেস্ট করুন — বাংলা, Banglish, English সব চলবে">কাস্টমারের মেসেজ *</FieldLabel>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2500}
            placeholder="যেমন: ভাই প্রাইস কত? / apu eta valo hobe to? thokbo na to? / price?"
            className={`${inputClass} resize-y`}
          />
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)] hover:text-[var(--brown)] select-none">
            ➕ আরও তথ্য দিন (ঐচ্ছিক) — আগের কথোপকথন / বিশেষ নির্দেশনা
          </summary>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            maxLength={2500}
            placeholder="যেমন: কাস্টমার আগে অন্য পেজে দাম জিজ্ঞেস করেছিল। / এই কাস্টমার গিফট কিনছে। / আজ ১০% ছাড় দিতে পারো।"
            className={`${inputClass} resize-y mt-2`}
          />
        </details>

        <button
          type="button"
          onClick={() => generate(false)}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 btn-gradient text-white font-medium rounded-xl py-3 px-5 text-sm disabled:opacity-60"
        >
          <Sparkles className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "উত্তর তৈরি হচ্ছে..." : "সেরা উত্তর তৈরি করুন"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {notice && (
        <div className="bg-[var(--green-soft)] border border-[var(--green)]/30 rounded-xl p-3 text-sm text-[var(--green)]">{notice}</div>
      )}

      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="tag-brown rounded-full px-2.5 py-1 font-medium">কাস্টমার: {result.customerType}</span>
            <span className="tag-mustard rounded-full px-2.5 py-1 font-medium">
              ভাষা: {LANG_LABEL[result.language] ?? result.language}
            </span>
            {selected && <span className="tag-green rounded-full px-2.5 py-1 font-medium">📦 {selected.name}</span>}
          </div>
          {result.customerIntent && <p className="text-sm text-[var(--text-muted)]">🧠 <b>কাস্টমারের মনে:</b> {result.customerIntent}</p>}

          <div className="bg-[var(--bg-card)] border-2 border-[var(--brown)]/40 rounded-2xl p-4 card-elevated">
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[var(--brown)]" />
                কাস্টমারকে এই উত্তরটি পাঠান <span className="text-[11px] text-[var(--text-faint)] font-normal">(দরকারে এডিট করুন)</span>
              </h4>
            </div>
            <textarea
              value={drafts.main}
              onChange={(e) => setDrafts({ ...drafts, main: e.target.value })}
              rows={autoRows(drafts.main)}
              className={`${inputClass} resize-y text-[15px] leading-relaxed`}
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              <CopyButton text={drafts.main} onCopied={(t) => onCopied("main", t)} />
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--brown)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 hover:border-[var(--brown)] transition-colors btn-press disabled:opacity-60"
              >
                🔄 আরেকটা ভার্সন
              </button>
            </div>
          </div>

          {drafts.short && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
              <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">⚡ ছোট ভার্সন</h4>
              <textarea
                value={drafts.short}
                onChange={(e) => setDrafts({ ...drafts, short: e.target.value })}
                rows={autoRows(drafts.short)}
                className={`${inputClass} resize-y text-sm`}
              />
              <div className="mt-2.5">
                <CopyButton text={drafts.short} onCopied={(t) => onCopied("short", t)} />
              </div>
            </div>
          )}

          {result.nextStep && (
            <p className="text-sm bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-xl p-3">
              ➡️ <b>এরপর:</b> {result.nextStep}
            </p>
          )}
          {result.upsellTip && (
            <p className="text-sm bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-xl p-3">
              🛍️ <b>আপসেল আইডিয়া:</b> {result.upsellTip}
            </p>
          )}

          {drafts.follow && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
              <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">🔔 ২৪ ঘণ্টায় রিপ্লাই না এলে এই ফলো-আপ পাঠান</h4>
              <textarea
                value={drafts.follow}
                onChange={(e) => setDrafts({ ...drafts, follow: e.target.value })}
                rows={autoRows(drafts.follow)}
                className={`${inputClass} resize-y text-sm`}
              />
              <div className="mt-2.5">
                <CopyButton text={drafts.follow} onCopied={(t) => onCopied("follow", t)} />
              </div>
            </div>
          )}

          <details className="bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-2xl p-4">
            <summary className="cursor-pointer text-sm font-medium">🎓 এই উত্তরে CARE মেথড কীভাবে কাজ করেছে</summary>
            <dl className="mt-3 space-y-2 text-sm">
              {(
                [
                  ["C — Context", result.care.context],
                  ["A — Assurance", result.care.assurance],
                  ["R — Reasoning", result.care.reasoning],
                  ["E — Engagement", result.care.engagement],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-medium text-[var(--brown-deep)]">{k}</dt>
                  <dd className="text-[var(--text-muted)]">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </details>

          {result.warnings.length > 0 && (
            <div className="bg-[var(--mustard-soft)] border border-[var(--mustard)]/30 rounded-xl p-3.5 text-sm space-y-1.5">
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[var(--mustard)]" />
                প্রোডাক্টে এই তথ্য যোগ করলে উত্তর আরও জোরালো হতো
              </p>
              <ul className="list-disc pl-5 text-[var(--text-primary)] space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-[var(--text-faint)]">
            💡 উত্তর কপি করলে সেটা কথোপকথনে যোগ হয়ে যায়। কাস্টমার রিপ্লাই দিলে শুধু তার নতুন মেসেজ পেস্ট করুন।
          </p>
        </div>
      )}
    </div>
  );
}

// ================= প্রোডাক্ট =================
type ProductForm = Omit<InboxProduct, "id" | "createdAt">;
const EMPTY_PRODUCT: ProductForm = { name: "", price: "", details: "", offer: "", stockNote: "", socialProof: "" };

function ProductsPanel({
  products,
  canEdit,
  onAdd,
  onUpdate,
  onRemove,
}: {
  products: InboxProduct[];
  canEdit: boolean;
  onAdd: (p: ProductForm) => Promise<void>;
  onUpdate: (id: string, p: Partial<InboxProduct>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<InboxProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_PRODUCT);
    setError(null);
    setShowForm(true);
  }
  function openEdit(p: InboxProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      price: p.price,
      details: p.details,
      offer: p.offer,
      stockNote: p.stockNote,
      socialProof: p.socialProof,
    });
    setError(null);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("প্রোডাক্টের নাম দিন।");
      return;
    }
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await onUpdate(editing.id, form);
      else await onAdd(form);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  }

  async function del(p: InboxProduct) {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return;
    try {
      await onRemove(p.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "মুছা যায়নি");
    }
  }

  const full = products.length >= INBOX_MAX_PRODUCTS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">
          {products.length}/{INBOX_MAX_PRODUCTS}টি প্রোডাক্ট সেভ আছে
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            disabled={full}
            className="flex items-center gap-1.5 btn-gradient text-white text-sm font-medium rounded-xl px-4 py-2.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            নতুন প্রোডাক্ট
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-[var(--text-faint)]">প্রোডাক্ট যোগ/এডিট শুধু মালিক করতে পারবেন। আপনি উত্তর তৈরিতে এগুলো ব্যবহার করতে পারবেন।</p>
      )}

      {products.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-2xl p-8 text-center text-sm text-[var(--text-faint)]">
          📦 এখনো কোনো প্রোডাক্ট নেই। {canEdit ? '"নতুন প্রোডাক্ট" চেপে নাম, দাম ও বিবরণ সেভ করুন — একবার সেভ করলেই হবে।' : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger">
          {products.map((p) => (
            <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 card-elevated">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium text-[15px] truncate">{p.name}</h4>
                  {p.price && <p className="num text-sm text-[var(--brown-deep)] mt-0.5">৳ {p.price}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-[var(--text-faint)] hover:text-[var(--brown)]" title="এডিট">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(p)} className="p-1.5 text-[var(--text-faint)] hover:text-[var(--red)]" title="মুছুন">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {p.details && <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-3 whitespace-pre-wrap">{p.details}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {p.offer && <span className="tag-green text-[10px] rounded-full px-2 py-0.5">অফার আছে</span>}
                {p.stockNote && <span className="tag-mustard text-[10px] rounded-full px-2 py-0.5">স্টক নোট</span>}
                {p.socialProof && <span className="tag-brown text-[10px] rounded-full px-2 py-0.5">রিভিউ/প্রুফ আছে</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FormPanel
          title={editing ? "প্রোডাক্ট এডিট" : "নতুন প্রোডাক্ট"}
          onClose={() => setShowForm(false)}
          onSubmit={submit}
          submitLabel={saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          wide
        >
          <div>
            <FieldLabel>প্রোডাক্টের নাম *</FieldLabel>
            <input value={form.name} maxLength={150} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="যেমন: কটন পাঞ্জাবি / লন থ্রি-পিস" />
          </div>
          <div>
            <FieldLabel hint="বাংলায় বা ইংরেজিতে, রেঞ্জও লিখতে পারেন">দাম (৳)</FieldLabel>
            <input value={form.price} maxLength={80} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} placeholder="যেমন: ৯৫০ বা ৯৫০-১২০০" />
          </div>
          <div>
            <FieldLabel hint="ফেব্রিক, সাইজ, রঙ, ফিটিং, বিশেষত্ব — যা সত্যি তা-ই লিখুন">বিবরণ</FieldLabel>
            <textarea value={form.details} maxLength={1200} rows={4} onChange={(e) => setForm({ ...form, details: e.target.value })} className={`${inputClass} resize-y`} placeholder="যেমন: ১০০% কটন, M/L/XL/XXL, ৩টা রঙ, গরমে আরামদায়ক" />
          </div>
          <div>
            <FieldLabel hint="শুধু সত্যিকারের অফার থাকলে লিখুন, না থাকলে ফাঁকা রাখুন">অফার / ডিসকাউন্ট</FieldLabel>
            <input value={form.offer} maxLength={600} onChange={(e) => setForm({ ...form, offer: e.target.value })} className={inputClass} placeholder="যেমন: ২টা নিলে ১০% ছাড়, রবিবার পর্যন্ত" />
          </div>
          <div>
            <FieldLabel hint="শুধু সত্যি হলে — না থাকলে ফাঁকা">স্টক তথ্য</FieldLabel>
            <input value={form.stockNote} maxLength={600} onChange={(e) => setForm({ ...form, stockNote: e.target.value })} className={inputClass} placeholder="যেমন: XL সাইজ আছে মাত্র ৫ পিস" />
          </div>
          <div>
            <FieldLabel hint="সত্যিকারের রিভিউ/বিক্রির তথ্য — বানিয়ে লিখবেন না">সোশ্যাল প্রুফ</FieldLabel>
            <input value={form.socialProof} maxLength={600} onChange={(e) => setForm({ ...form, socialProof: e.target.value })} className={inputClass} placeholder="যেমন: গত মাসে ১২০ পিস বিক্রি হয়েছে" />
          </div>
          {error && <ErrorBanner message={error} />}
        </FormPanel>
      )}
    </div>
  );
}

// ================= ব্যবসার তথ্য =================
function BusinessPanel({
  business,
  canEdit,
  onSave,
}: {
  business: InboxBusinessInfo;
  canEdit: boolean;
  onSave: (b: InboxBusinessInfo) => Promise<void>;
}) {
  const [form, setForm] = useState<InboxBusinessInfo>(business);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof InboxBusinessInfo, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dis = !canEdit;

  return (
    <form onSubmit={submit} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-4 card-elevated">
      <p className="text-xs text-[var(--text-faint)]">
        {canEdit
          ? "এই তথ্য একবার সেভ করলে সব উত্তরে কাজে লাগবে। যা জানেন না, ফাঁকা রাখুন — AI নিজে থেকে কিছু বানাবে না।"
          : "ব্যবসার তথ্য শুধু মালিক এডিট করতে পারবেন।"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>দোকান / পেজ / কোম্পানির নাম</FieldLabel>
          <input disabled={dis} value={form.shopName} onChange={(e) => set("shopName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel>আপনার (উত্তরদাতার) নাম</FieldLabel>
          <input disabled={dis} value={form.replierName} onChange={(e) => set("replierName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel>কাস্টমারকে সম্বোধন</FieldLabel>
          <select disabled={dis} value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass}>
            {!ADDRESS_OPTIONS.includes(form.address) && form.address && <option value={form.address}>{form.address}</option>}
            {ADDRESS_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>কথার টোন</FieldLabel>
          <select disabled={dis} value={form.tone} onChange={(e) => set("tone", e.target.value)} className={inputClass}>
            {TONE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>ডেলিভারি তথ্য</FieldLabel>
        <input disabled={dis} value={form.delivery} onChange={(e) => set("delivery", e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>পেমেন্ট পদ্ধতি</FieldLabel>
        <input disabled={dis} value={form.payment} onChange={(e) => set("payment", e.target.value)} className={inputClass} placeholder="যেমন: Cash On Delivery / বিকাশ" />
      </div>
      <div>
        <FieldLabel hint="যা সত্যি তা-ই লিখুন">রিটার্ন / ওয়ারেন্টি পলিসি (সব প্রোডাক্টের জন্য)</FieldLabel>
        <input disabled={dis} value={form.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} className={inputClass} placeholder="যেমন: পণ্য হাতে পেয়ে চেক করে নেওয়া যাবে" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>কল / হোয়াটসঅ্যাপ নম্বর</FieldLabel>
          <input disabled={dis} value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel>অর্ডারের জন্য যা লাগে</FieldLabel>
          <input disabled={dis} value={form.orderNeeds} onChange={(e) => set("orderNeeds", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel hint="ঐচ্ছিক">বিশেষ নির্দেশনা</FieldLabel>
        <textarea disabled={dis} value={form.instructions} rows={3} onChange={(e) => set("instructions", e.target.value)} className={`${inputClass} resize-y`} placeholder="যেমন: কখনো ডিসকাউন্ট অফার করবে না / সব উত্তরে ইনশাআল্লাহ বলবে" />
      </div>
      {error && <ErrorBanner message={error} />}
      {canEdit && (
        <button type="submit" disabled={saving} className="flex items-center gap-2 btn-gradient text-white font-medium rounded-xl py-2.5 px-5 text-sm disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "সেভ হচ্ছে..." : saved ? "সেভ হয়েছে ✓" : "সেভ করুন"}
        </button>
      )}
    </form>
  );
}

// ================= মূল ট্যাব =================
export default function InboxReplyTab({ uid, isOwner }: { uid: string; isOwner: boolean }) {
  const [sub, setSub] = useState<SubTab>("reply");
  const prod = useInboxProducts(uid);
  const biz = useInboxBusiness(uid);

  const tabs: { id: SubTab; label: string; icon: typeof MessageCircle }[] = [
    { id: "reply", label: "উত্তর তৈরি", icon: MessageCircle },
    { id: "products", label: `প্রোডাক্ট (${prod.data.length})`, icon: Package },
    { id: "business", label: "ব্যবসার তথ্য", icon: Store },
  ];

  const loadError = prod.error || biz.error;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">ইনবক্স রিপ্লাই মাস্টার</h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5 leading-relaxed">
          কাস্টমারের মেসেজ পেস্ট করুন, প্রোডাক্ট সিলেক্ট করুন — &quot;ইনবক্সে বাজিমাত&quot; বইয়ের CARE মেথড অনুযায়ী কপি-রেডি উত্তর পাবেন, যাতে কাস্টমার দাম শুনে চলে না গিয়ে আবার রিপ্লাই দেয়।
        </p>
      </div>

      {loadError && <ErrorBanner message={loadError} />}

      <div className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? "border-[var(--brown)] text-[var(--brown)] font-medium"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "reply" && (
        <ReplyPanel products={prod.data} business={biz.business} businessSaved={biz.saved} goTo={setSub} />
      )}
      {sub === "products" && (
        <ProductsPanel
          products={prod.data}
          canEdit={isOwner}
          onAdd={prod.add}
          onUpdate={prod.update}
          onRemove={prod.remove}
        />
      )}
      {sub === "business" && (
        <BusinessPanel
          key={biz.saved ? "saved" : "default"}
          business={biz.business}
          canEdit={isOwner}
          onSave={biz.save}
        />
      )}
    </div>
  );
}
