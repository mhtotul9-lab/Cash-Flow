"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  RefreshCw,
  Bell,
  Lightbulb,
  ArrowRight,
  Search,
  RotateCcw,
  GraduationCap,
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

// বড় বক্সে অ্যাপের card-elevated ব্যবহার করা হয়নি — ওটাতে ক্লিক করলে পুরো বক্স ছোট (scale) হয়ে "দেবে যায়"।
const CARD = "bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-sm)]";
const PRIMARY_BTN =
  "text-white font-medium rounded-xl shadow-[0_4px_14px_rgba(154,111,53,0.28)] hover:shadow-[0_6px_20px_rgba(154,111,53,0.36)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed";
const GRADIENT = { background: "var(--gradient-brown)" } as const;
const GHOST_BTN =
  "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brown-deep)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 hover:border-[var(--brown)] transition-colors disabled:opacity-60";

const TONE_OPTIONS: { value: string; label: string; prompt: string }[] = [
  { value: "friendly", label: "😊 বন্ধুসুলভ ও আন্তরিক", prompt: "friendly, warm and sincere" },
  { value: "respectful", label: "🙏 খুব ভদ্র ও সম্মানসূচক", prompt: "very polite and respectful" },
  { value: "professional", label: "💼 পেশাদার", prompt: "professional and clear" },
  { value: "direct", label: "⚡ সংক্ষিপ্ত ও সরাসরি", prompt: "short, direct and to the point (still polite)" },
];

const ADDRESS_OPTIONS = ["স্যার/ম্যাম", "আপু", "ভাইয়া", "আপনি (কোনো সম্বোধন ছাড়া)"];

const LANG_OPTIONS: { value: InboxReplyLang; label: string; hint: string }[] = [
  { value: "auto", label: "অটো", hint: "কাস্টমার যে ভাষায় লিখেছে, সেই ভাষায়" },
  { value: "bangla", label: "বাংলা", hint: "সবসময় বাংলা অক্ষরে" },
  { value: "banglish", label: "Banglish", hint: "ইংরেজি অক্ষরে বাংলা" },
  { value: "english", label: "English", hint: "সবসময় ইংরেজিতে" },
];

const LANG_LABEL: Record<string, string> = {
  bangla: "বাংলা",
  banglish: "Banglish",
  english: "English",
  mixed: "মিশ্র ভাষা",
  other: "অন্য",
};

const QUICK_MESSAGES = ["ভাই প্রাইস কত?", "এটা ভালো তো? ঠকবো না তো?", "পরে জানাবো", "কিভাবে অর্ডার করবো?", "dam koto?"];

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

// লেখা অনুযায়ী নিজে বড় হয় — স্ক্রিন যত ছোটই হোক, উত্তরের শেষ লাইন কখনো কাটা পড়ে না
function AutoGrow({
  value,
  onChange,
  minRows = 3,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className={`${className ?? ""} resize-none overflow-hidden`}
    />
  );
}

// ================= ছোট UI অংশ =================
// টোস্ট: পেজের কোনো কিছু নড়ায় না। (animate-fade-in এর ভেতরে fixed আটকে যায়, তাই body তে পোর্টাল)
function Toast({ text }: { text: string | null }) {
  if (!text || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] text-sm rounded-full px-5 py-2.5 shadow-[var(--shadow-lg)] animate-scale-in"
    >
      {text}
    </div>,
    document.body
  );
}

function CopyBtn({
  text,
  label = "কপি করুন",
  primary = false,
  onCopied,
}: {
  text: string;
  label?: string;
  primary?: boolean;
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
          setTimeout(() => setDone(false), 1600);
          onCopied?.(t);
        }
      }}
      style={primary ? GRADIENT : undefined}
      className={
        primary
          ? `inline-flex items-center gap-2 text-sm px-4 py-2.5 ${PRIMARY_BTN}`
          : GHOST_BTN
      }
    >
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
            Firebase Console → Firestore Database → Rules এ আপনার বিদ্যমান <code>match /users/{"{uid}"}/...</code> নিয়মগুলোর পাশে নিচের অংশ বসিয়ে Publish করুন:
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
  live?: "ok" | "rejected" | "limit" | "unverified" | null; // গুগলকে সত্যিই জিজ্ঞেস করে পাওয়া ফল
  liveDetail?: string;
}
type AiStatus = AiStatusData | "old" | "error" | null;

function useAiStatus(): AiStatus {
  const { user } = useAuth();
  const uid = user?.uid;
  // user অবজেক্ট বদলালেও যেন বারবার রিকোয়েস্ট না যায় — শুধু uid বদলালে একবার চেক হয়
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });
  const [status, setStatus] = useState<AiStatus>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      try {
        const token = await userRef.current?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/inbox-reply?check=1", { headers: { Authorization: `Bearer ${token}` } });
        if (!alive) return;
        // GET কাজ না করলে (৪০৫) মানে সাইটে এখনো পুরনো কোড ডিপ্লয় আছে
        if (res.status === 404 || res.status === 405) return setStatus("old");
        if (!res.ok) return setStatus("error");
        setStatus((await res.json()) as AiStatusData);
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  return status;
}

interface AiView {
  tone: "ok" | "warn" | "bad";
  pill: string;
  title?: string;
  detail?: string;
  steps?: boolean;
  open?: boolean;
}

function aiView(status: AiStatus): AiView | null {
  if (!status || status === "error") return null;
  if (status === "old") {
    return {
      tone: "bad",
      pill: "পুরনো কোড",
      title: "সাইটে এখনো পুরনো কোড ডিপ্লয় আছে। GitHub-এ নতুন ফাইল আপলোড করে Vercel-এ ডিপ্লয় শেষ (Ready) হওয়া পর্যন্ত অপেক্ষা করুন।",
    };
  }
  const backup = status.openrouter === "ok" ? " · বিকল্প: OpenRouter" : "";
  if (status.gemini === "ok") {
    if (status.live === "rejected") {
      return {
        tone: "bad",
        pill: "Gemini কী ভুল",
        title: "Google আপনার Gemini কী গ্রহণ করছে না — কী-টা ভুল, মুছে ফেলা বা অকার্যকর।",
        detail: status.liveDetail ? `Google বলছে: ${status.liveDetail}` : undefined,
        steps: true,
        open: true,
      };
    }
    if (status.live === "limit") {
      return {
        tone: "warn",
        pill: "Gemini কী ঠিক · সীমা শেষ",
        title: "Gemini কী ঠিক আছে ✅ কিন্তু এই মুহূর্তে গুগলের ফ্রি সীমা শেষ। ১ মিনিট পর আবার চেষ্টা করুন।",
      };
    }
    if (status.live === "unverified") return { tone: "ok", pill: `Gemini কী বসানো আছে${backup}` };
    return { tone: "ok", pill: `Gemini প্রস্তুত ✅${backup}` };
  }
  const gemProblem =
    status.gemini === "format"
      ? "Vercel এ GEMINI_API_KEY এ যা বসানো আছে সেটা Gemini কী বলে মনে হচ্ছে না (খালি, খুব ছোট বা অন্য কোনো লেখা)।"
      : "Gemini কী এখনো Vercel এ বসানো নেই।";
  if (status.openrouter === "ok") {
    return {
      tone: "warn",
      pill: "শুধু OpenRouter",
      title: "শুধু OpenRouter চালু আছে — ফ্রি লিমিট খুব কম (দিনে ৫০টি), তাই বারবার ব্যর্থ হবে।",
      detail: gemProblem,
      steps: true,
      open: status.gemini === "format",
    };
  }
  return { tone: "bad", pill: "AI কী নেই", title: "কোনো AI কী ঠিকভাবে বসানো নেই।", detail: gemProblem, steps: true, open: true };
}

const TONE_STYLE = {
  ok: "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/25",
  warn: "bg-[var(--mustard-soft)] text-[var(--mustard)] border-[var(--mustard)]/30",
  bad: "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]/30",
} as const;

function AiPill({ view }: { view: AiView | null }) {
  if (!view) return null;
  const dot = view.tone === "ok" ? "bg-[var(--green)] pulse-dot" : view.tone === "warn" ? "bg-[var(--mustard)]" : "bg-[var(--red)]";
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium rounded-full border px-3 py-1.5 ${TONE_STYLE[view.tone]}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {view.pill}
    </span>
  );
}

function AiBanner({ view }: { view: AiView | null }) {
  if (!view || !view.title) return null;
  return (
    <div className={`rounded-xl border p-3 text-xs ${TONE_STYLE[view.tone]}`}>
      <p className="font-medium">{view.title}</p>
      {view.detail && <p className="mt-1 text-[var(--text-muted)]">{view.detail}</p>}
      {view.steps && (
        <details className="mt-1.5" open={view.open}>
          <summary className="cursor-pointer font-medium underline">ঠিক করার ৪টি ধাপ (দেখুন)</summary>
          <ol className="list-decimal pl-5 space-y-1 mt-2 text-[var(--text-primary)]">
            <li>
              aistudio.google.com/apikey এ গিয়ে <b>Create API key</b> চাপুন, তারপর কী-টার পাশের <b>Copy</b> বাটন চাপুন (হাতে লিখবেন না)।
            </li>
            <li>
              Vercel → প্রোজেক্ট → Settings → Environment Variables → <code>GEMINI_API_KEY</code> এর ডানে <b>⋯ → Edit</b> → পুরনো মান মুছে নতুন কী পেস্ট (কোটেশন/স্পেস ছাড়া) → Save।
            </li>
            <li>
              Vercel → Deployments → সবচেয়ে উপরের ডিপ্লয়ের <b>⋯</b> → <b>Redeploy</b> → &quot;Ready&quot; পর্যন্ত অপেক্ষা।
            </li>
            <li>এই পেজ রিফ্রেশ করুন — উপরে সবুজ ট্যাগ এলে হয়ে গেছে।</li>
          </ol>
        </details>
      )}
    </div>
  );
}

// ================= প্রোডাক্ট বাছাই (ড্রপডাউন) =================
function ProductPicker({
  products,
  value,
  onChange,
  onAdd,
}: {
  products: InboxProduct[];
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = products.find((p) => p.id === value) ?? null;
  const list = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 text-left bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 hover:border-[var(--brown)] transition-colors"
      >
        <span className="w-9 h-9 rounded-lg bg-[#F1E6D2] text-[var(--brown-deep)] flex items-center justify-center shrink-0">
          {selected ? <Package className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate">{selected ? selected.name : "সাধারণ উত্তর"}</span>
          <span className="block text-xs text-[var(--text-faint)] truncate">
            {selected ? (selected.price ? `৳ ${selected.price}` : "দাম দেওয়া নেই") : "কোনো নির্দিষ্ট প্রোডাক্ট ছাড়া"}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden"
        >
          {products.length > 6 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
              <Search className="w-3.5 h-3.5 text-[var(--text-faint)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="প্রোডাক্ট খুঁজুন..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={value === "general"}
              onClick={() => pick("general")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--bg-base)]"
            >
              <Globe className="w-4 h-4 text-[var(--text-faint)]" />
              <span className="flex-1">সাধারণ উত্তর (প্রোডাক্ট ছাড়া)</span>
              {value === "general" && <Check className="w-4 h-4 text-[var(--brown)]" />}
            </button>
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={value === p.id}
                onClick={() => pick(p.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[var(--bg-base)]"
              >
                <Package className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                {p.price && <span className="num text-xs text-[var(--brown-deep)] shrink-0">৳{p.price}</span>}
                {value === p.id && <Check className="w-4 h-4 text-[var(--brown)] shrink-0" />}
              </button>
            ))}
            {list.length === 0 && products.length > 0 && <p className="px-3 py-3 text-xs text-[var(--text-faint)]">কিছু পাওয়া যায়নি।</p>}
            {products.length === 0 && (
              <button type="button" onClick={onAdd} className="w-full px-3 py-2.5 text-xs text-left text-[var(--brown)] font-medium hover:bg-[var(--bg-base)]">
                এখনো কোনো প্রোডাক্ট নেই — প্রথম প্রোডাক্ট যোগ করুন →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= উত্তর তৈরি (ওয়ার্কস্পেস) =================
function Bubble({ role, text }: { role: "customer" | "me"; text: string }) {
  const mine = role === "me";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span className="text-[10px] text-[var(--text-faint)] mb-0.5 px-1">{mine ? "আপনি" : "কাস্টমার"}</span>
      <p
        className={`max-w-[88%] whitespace-pre-wrap text-sm leading-relaxed px-3.5 py-2.5 border ${
          mine
            ? "bg-[#F1E6D2] border-[var(--border-strong)] rounded-2xl rounded-br-md"
            : "bg-[var(--bg-base)] border-[var(--border-subtle)] rounded-2xl rounded-bl-md"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function ReplyWorkspace({
  products,
  business,
  businessSaved,
  goTo,
  notify,
}: {
  products: InboxProduct[];
  business: InboxBusinessInfo;
  businessSaved: boolean;
  goTo: (t: SubTab) => void;
  notify: (text: string) => void;
}) {
  const { user } = useAuth();
  const [productId, setProductId] = useState<string>("general");
  const [lang, setLang] = useState<InboxReplyLang>("auto");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InboxReplyResult | null>(null);
  const [drafts, setDrafts] = useState({ main: "", short: "", follow: "" });
  const [view, setView] = useState<"main" | "short">("main");
  // এই কাস্টমারের সাথে এ পর্যন্ত কথোপকথন — AI আগের কথা মনে রাখবে
  const [thread, setThread] = useState<InboxThreadTurn[]>([]);
  const [last, setLast] = useState<{ msg: string; committed: boolean } | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null); // কাস্টমারের সর্বশেষ মেসেজের বাবল
  const msgRef = useRef<HTMLTextAreaElement>(null);

  const selected = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);
  const committed = !!last?.committed;
  // কপি করা শেষ আদান-প্রদান খসড়া কার্ডেই দেখানো হয়, তাই বাবলে দুবার দেখানো হয় না
  const shownThread = committed ? thread.slice(0, -2) : thread;

  // ডেস্কটপ: শুধু কথোপকথনের ভেতরের স্ক্রল নড়ে, পুরো পেজ নড়ে না।
  // উত্তর এলে কাস্টমারের মেসেজ + উত্তরের উপরের অংশ একসাথে দেখা যায়; অন্য সময় একদম নিচে।
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const el = chatRef.current;
    if (!el) return;
    const p = pendingRef.current;
    if (result && p) {
      el.scrollTop = p.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [thread.length, last, loading, result, error, committed]);

  // মোবাইল: ভেতরে আলাদা স্ক্রল নেই, পেজই স্ক্রল করে। উত্তর/এরর এলে একবার কাস্টমারের মেসেজের কাছে নিয়ে যাওয়া হয়
  // (কপি করলে নড়ে না)
  useEffect(() => {
    if ((result || error) && typeof window !== "undefined" && window.innerWidth < 1024) {
      pendingRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    }
  }, [result, error]);

  async function generate(variant: boolean) {
    // "আরেকটা ভার্সন": আগের কপি-করা টার্ন বাদ দিয়ে একই মেসেজে আবার
    let t = thread;
    let msg = message.trim();
    if (variant && last) {
      msg = last.msg;
      if (last.committed) {
        t = thread.slice(0, -2);
        setThread(t);
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
    setResult(null);
    setLast({ msg, committed: false });
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
      setView("main");
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "কিছু একটা ভুল হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  // উত্তর কপি করলে সেটা কথোপকথনে যোগ হয় (ফলো-আপ বাদে)
  function onCopied(kind: "main" | "short" | "follow", text: string) {
    if (kind === "follow") {
      notify("✅ ফলো-আপ কপি হয়েছে");
      return;
    }
    if (!last || last.committed) {
      notify("✅ কপি হয়েছে");
      return;
    }
    setThread((t) => [...t, { role: "customer", text: last.msg }, { role: "me", text }]);
    setLast({ ...last, committed: true });
    setMessage("");
    notify("✅ কপি হয়েছে — Messenger এ পেস্ট করুন। কাস্টমার রিপ্লাই দিলে নতুন মেসেজ পেস্ট করুন।");
    msgRef.current?.focus({ preventScroll: true });
  }

  function resetThread() {
    setThread([]);
    setLast(null);
    setResult(null);
    setMessage("");
    setError(null);
  }

  const activeText = view === "short" ? drafts.short : drafts.main;
  const hasChat = shownThread.length > 0 || !!last || loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:flex-1 lg:min-h-0">
      {/* ============ বাম: ইনপুট ============ */}
      <section className={`${CARD} lg:col-span-5 flex flex-col lg:min-h-0`}>
        <div className="flex-1 min-h-0 lg:overflow-y-auto p-4 sm:p-5 space-y-5">
          {!businessSaved && (
            <p className="text-xs bg-[var(--mustard-soft)] border border-[var(--mustard)]/30 rounded-lg px-3 py-2">
              ⚠️ ব্যবসার তথ্য সেভ করা হয়নি — ডিফল্ট ব্যবহার হচ্ছে।{" "}
              <button type="button" onClick={() => goTo("business")} className="underline font-medium">
                ঠিক করুন
              </button>
            </p>
          )}

          <div>
            <FieldLabel>
              <b className="text-[var(--brown)]">১</b> · কোন প্রোডাক্ট নিয়ে কথা হচ্ছে?
            </FieldLabel>
            <ProductPicker products={products} value={productId} onChange={setProductId} onAdd={() => goTo("products")} />
          </div>

          <div>
            <FieldLabel>
              <b className="text-[var(--brown)]">২</b> · উত্তরের ভাষা
            </FieldLabel>
            <div className="grid grid-cols-4 gap-1 bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border-subtle)]">
              {LANG_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  title={l.hint}
                  aria-pressed={lang === l.value}
                  onClick={() => setLang(l.value)}
                  className={`text-xs py-2 rounded-lg transition-colors ${
                    lang === l.value
                      ? "bg-[var(--bg-card)] text-[var(--brown-deep)] font-medium shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-faint)] mt-1.5">{LANG_OPTIONS.find((l) => l.value === lang)?.hint}</p>
          </div>

          <div>
            <FieldLabel>
              <b className="text-[var(--brown)]">৩</b> · কাস্টমারের মেসেজ পেস্ট করুন *
            </FieldLabel>
            <textarea
              ref={msgRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading) {
                  e.preventDefault();
                  generate(false);
                }
              }}
              rows={5}
              maxLength={2500}
              placeholder="যেমন: ভাই প্রাইস কত? / apu eta valo hobe to? thokbo na to? / price?"
              className={`${inputClass} resize-none`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-[var(--text-faint)]">বাংলা, Banglish, English সব চলবে · Ctrl+Enter চাপলেও হবে</span>
              <span className="text-[11px] text-[var(--text-faint)] num">{message.length}/2500</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_MESSAGES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setMessage(q);
                    msgRef.current?.focus({ preventScroll: true });
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card-soft)] text-[var(--text-muted)] hover:border-[var(--brown)] hover:text-[var(--brown-deep)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowExtra((s) => !s)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--brown)] flex items-center gap-1.5"
              aria-expanded={showExtra}
            >
              <Plus className={`w-4 h-4 transition-transform ${showExtra ? "rotate-45" : ""}`} />
              আরও তথ্য দিন (ঐচ্ছিক)
            </button>
            {showExtra && (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                maxLength={2500}
                placeholder="যেমন: কাস্টমার আগে অন্য পেজে দাম জিজ্ঞেস করেছিল। / এই কাস্টমার গিফট কিনছে। / আজ ১০% ছাড় দিতে পারো।"
                className={`${inputClass} resize-none mt-2`}
              />
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            style={GRADIENT}
            className={`w-full flex items-center justify-center gap-2 py-3.5 text-[15px] ${PRIMARY_BTN}`}
          >
            <Sparkles className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "উত্তর তৈরি হচ্ছে..." : "সেরা উত্তর তৈরি করুন"}
          </button>
        </div>
      </section>

      {/* ============ ডান: কথোপকথন ও উত্তর ============ */}
      <section className={`${CARD} lg:col-span-7 flex flex-col lg:min-h-0 overflow-hidden`}>
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card-soft)]">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-[var(--brown)] shrink-0" />
            <h3 className="text-sm font-medium truncate">কথোপকথন ও উত্তর</h3>
            {thread.length > 0 && <span className="text-[11px] text-[var(--text-faint)] shrink-0">({thread.length}টি বার্তা)</span>}
          </div>
          {hasChat && (
            <button type="button" onClick={resetThread} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--red)] border border-[var(--red)]/30 rounded-lg px-2.5 py-1.5 hover:bg-[var(--red-soft)] transition-colors shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              নতুন কাস্টমার
            </button>
          )}
        </header>

        <div ref={chatRef} className="flex-1 min-h-[220px] lg:min-h-0 lg:overflow-y-auto p-4 sm:p-5 space-y-3">
          {!hasChat && (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F1E6D2] text-[var(--brown-deep)] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-[family-name:var(--font-display)] text-base font-medium">এখানে আপনার উত্তর আসবে</h4>
              <ol className="mt-3 text-sm text-[var(--text-muted)] space-y-1.5 text-left">
                <li>১. প্রোডাক্ট বেছে কাস্টমারের মেসেজ পেস্ট করুন</li>
                <li>২. &quot;সেরা উত্তর তৈরি করুন&quot; চাপুন</li>
                <li>৩. উত্তর কপি করে Messenger এ পাঠান</li>
                <li>৪. কাস্টমার রিপ্লাই দিলে শুধু নতুন মেসেজটা পেস্ট করুন — আগের কথা মনে থাকবে</li>
              </ol>
            </div>
          )}

          {shownThread.map((t, i) => (
            <Bubble key={i} role={t.role} text={t.text} />
          ))}

          {last && (
            <div ref={pendingRef} className="scroll-mt-3">
              <Bubble role="customer" text={last.msg} />
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-[var(--border-subtle)] p-4 space-y-2.5" aria-live="polite">
              <p className="text-xs text-[var(--text-faint)] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-[var(--brown)]" />
                কাস্টমারের মন বুঝে উত্তর সাজানো হচ্ছে...
              </p>
              <div className="skeleton h-3 rounded w-11/12" />
              <div className="skeleton h-3 rounded w-9/12" />
              <div className="skeleton h-3 rounded w-10/12" />
              <div className="skeleton h-3 rounded w-6/12" />
            </div>
          )}

          {error && <ErrorBanner message={error} />}

          {result && !loading && (
            <div className={`rounded-2xl border-2 overflow-hidden ${committed ? "border-[var(--green)]/40" : "border-[var(--brown)]/40"} bg-[var(--bg-card)]`}>
              <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="tag-brown rounded-full px-2.5 py-1 font-medium">{result.customerType}</span>
                <span className="tag-mustard rounded-full px-2.5 py-1 font-medium">{LANG_LABEL[result.language] ?? result.language}</span>
                {selected && <span className="tag-green rounded-full px-2.5 py-1 font-medium">📦 {selected.name}</span>}
                {committed && <span className="bg-[var(--green)] text-white rounded-full px-2.5 py-1 font-medium">✓ কপি করা হয়েছে</span>}
              </div>
              {result.customerIntent && (
                <p className="px-4 text-xs text-[var(--text-muted)]">
                  🧠 <b>কাস্টমারের মনে:</b> {result.customerIntent}
                </p>
              )}

              <div className="px-4 pt-3">
                {drafts.short && (
                  <div className="inline-flex gap-1 bg-[var(--bg-base)] p-1 rounded-lg border border-[var(--border-subtle)] mb-2">
                    {(
                      [
                        ["main", "সম্পূর্ণ"],
                        ["short", "⚡ ছোট"],
                      ] as const
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={view === k}
                        onClick={() => setView(k)}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          view === k ? "bg-[var(--bg-card)] text-[var(--brown-deep)] font-medium shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <AutoGrow
                  value={activeText}
                  onChange={(v) => setDrafts((d) => ({ ...d, [view]: v }))}
                  minRows={4}
                  label="কাস্টমারকে পাঠানোর উত্তর (এডিট করা যায়)"
                  className={`${inputClass} text-[15px] leading-relaxed bg-[var(--bg-card-soft)]`}
                />
                <p className="text-[11px] text-[var(--text-faint)] mt-1">✏️ দরকার হলে লেখাটা সরাসরি এডিট করুন</p>
              </div>

              <div className="px-4 py-3 flex flex-wrap gap-2">
                <CopyBtn primary text={activeText} onCopied={(t) => onCopied(view, t)} label={committed ? "আবার কপি" : "কপি করুন"} />
                <button type="button" onClick={() => generate(true)} disabled={loading} className={GHOST_BTN}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  আরেকটা ভার্সন
                </button>
              </div>

              {(result.nextStep || result.upsellTip) && (
                <div className="px-4 pb-3 grid gap-2 sm:grid-cols-2">
                  {result.nextStep && (
                    <p className="text-xs bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-lg p-2.5 flex gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--brown)] shrink-0 mt-0.5" />
                      <span>
                        <b>এরপর:</b> {result.nextStep}
                      </span>
                    </p>
                  )}
                  {result.upsellTip && (
                    <p className="text-xs bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] rounded-lg p-2.5 flex gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-[var(--mustard)] shrink-0 mt-0.5" />
                      <span>
                        <b>আপসেল আইডিয়া:</b> {result.upsellTip}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {drafts.follow && (
                <details className="border-t border-[var(--border-subtle)] px-4 py-3">
                  <summary className="cursor-pointer text-xs font-medium flex items-center gap-1.5 select-none">
                    <Bell className="w-3.5 h-3.5 text-[var(--brown)]" />
                    ২৪ ঘণ্টায় রিপ্লাই না এলে এই ফলো-আপ পাঠান
                  </summary>
                  <AutoGrow
                    value={drafts.follow}
                    onChange={(v) => setDrafts((d) => ({ ...d, follow: v }))}
                    label="ফলো-আপ বার্তা"
                    className={`${inputClass} text-sm mt-2`}
                  />
                  <div className="mt-2">
                    <CopyBtn text={drafts.follow} onCopied={(t) => onCopied("follow", t)} label="ফলো-আপ কপি" />
                  </div>
                </details>
              )}

              <details className="border-t border-[var(--border-subtle)] px-4 py-3">
                <summary className="cursor-pointer text-xs font-medium flex items-center gap-1.5 select-none">
                  <GraduationCap className="w-3.5 h-3.5 text-[var(--brown)]" />
                  এই উত্তরে CARE মেথড কীভাবে কাজ করেছে
                </summary>
                <dl className="mt-2.5 space-y-2 text-xs">
                  {(
                    [
                      ["C — Context", result.care.context],
                      ["A — Assurance", result.care.assurance],
                      ["R — Reasoning", result.care.reasoning],
                      ["E — Engagement", result.care.engagement],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-medium text-[var(--brown-deep)]">{k}</dt>
                      <dd className="text-[var(--text-muted)]">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </details>

              {result.warnings.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] bg-[var(--mustard-soft)]/60 px-4 py-3 text-xs">
                  <p className="font-medium flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--mustard)]" />
                    প্রোডাক্টে এই তথ্য যোগ করলে উত্তর আরও জোরালো হতো
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">আপনার প্রোডাক্ট</p>
          <p className="text-xs text-[var(--text-faint)]">
            {products.length}/{INBOX_MAX_PRODUCTS}টি সেভ আছে · AI শুধু এখানে লেখা সত্যি তথ্যই ব্যবহার করবে
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={openNew} disabled={full} style={GRADIENT} className={`flex items-center gap-1.5 text-sm px-4 py-2.5 ${PRIMARY_BTN}`}>
            <Plus className="w-4 h-4" />
            নতুন প্রোডাক্ট
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-[var(--text-faint)]">প্রোডাক্ট যোগ/এডিট শুধু মালিক করতে পারবেন। আপনি উত্তর তৈরিতে এগুলো ব্যবহার করতে পারবেন।</p>
      )}

      {products.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-2xl p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F1E6D2] text-[var(--brown-deep)] flex items-center justify-center mb-3">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            এখনো কোনো প্রোডাক্ট নেই। {canEdit ? "নাম, দাম ও বিবরণ একবার সেভ করলেই হবে — বারবার দিতে হবে না।" : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p) => (
            <div key={p.id} className={`${CARD} p-4 hover:border-[var(--border-strong)] transition-colors`}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#F1E6D2] text-[var(--brown-deep)] flex items-center justify-center font-medium shrink-0">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-[15px] leading-snug line-clamp-2">{p.name}</h4>
                  {p.price && <p className="num text-sm text-[var(--brown-deep)] mt-0.5">৳ {p.price}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-2 text-[var(--text-faint)] hover:text-[var(--brown)]" title="এডিট">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(p)} className="p-2 text-[var(--text-faint)] hover:text-[var(--red)]" title="মুছুন">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {p.details && <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-3 whitespace-pre-wrap">{p.details}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.offer && <span className="tag-green text-[10px] rounded-full px-2 py-0.5">অফার আছে</span>}
                {p.stockNote && <span className="tag-mustard text-[10px] rounded-full px-2 py-0.5">স্টক নোট</span>}
                {p.socialProof && <span className="tag-brown text-[10px] rounded-full px-2 py-0.5">রিভিউ/প্রুফ আছে</span>}
                {!p.offer && !p.stockNote && !p.socialProof && <span className="text-[10px] text-[var(--text-faint)]">অফার/প্রুফ যোগ করলে উত্তর আরও জোরালো হবে</span>}
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
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেভ করা যায়নি");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof InboxBusinessInfo, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dis = !canEdit;

  return (
    <form onSubmit={submit} className="space-y-4 max-w-3xl">
      <p className="text-xs text-[var(--text-faint)]">
        {canEdit
          ? "এই তথ্য একবার সেভ করলে সব উত্তরে কাজে লাগবে। যা জানেন না, ফাঁকা রাখুন — AI নিজে থেকে কিছু বানাবে না।"
          : "ব্যবসার তথ্য শুধু মালিক এডিট করতে পারবেন।"}
      </p>

      <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
        <h4 className="text-sm font-medium">🏪 পরিচয় ও কথার ধরন</h4>
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
      </div>

      <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
        <h4 className="text-sm font-medium">🚚 ডেলিভারি ও অর্ডার</h4>
        <div>
          <FieldLabel>ডেলিভারি তথ্য</FieldLabel>
          <input disabled={dis} value={form.delivery} onChange={(e) => set("delivery", e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>পেমেন্ট পদ্ধতি</FieldLabel>
            <input disabled={dis} value={form.payment} onChange={(e) => set("payment", e.target.value)} className={inputClass} placeholder="যেমন: Cash On Delivery / বিকাশ" />
          </div>
          <div>
            <FieldLabel>অর্ডারের জন্য যা লাগে</FieldLabel>
            <input disabled={dis} value={form.orderNeeds} onChange={(e) => set("orderNeeds", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
        <h4 className="text-sm font-medium">🛡️ পলিসি, যোগাযোগ ও নির্দেশনা</h4>
        <div>
          <FieldLabel hint="যা সত্যি তা-ই লিখুন">রিটার্ন / ওয়ারেন্টি পলিসি (সব প্রোডাক্টের জন্য)</FieldLabel>
          <input disabled={dis} value={form.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} className={inputClass} placeholder="যেমন: পণ্য হাতে পেয়ে চেক করে নেওয়া যাবে" />
        </div>
        <div>
          <FieldLabel>কল / হোয়াটসঅ্যাপ নম্বর</FieldLabel>
          <input disabled={dis} value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel hint="ঐচ্ছিক">বিশেষ নির্দেশনা</FieldLabel>
          <textarea disabled={dis} value={form.instructions} rows={3} onChange={(e) => set("instructions", e.target.value)} className={`${inputClass} resize-y`} placeholder="যেমন: কখনো ডিসকাউন্ট অফার করবে না / সব উত্তরে ইনশাআল্লাহ বলবে" />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {canEdit && (
        <button type="submit" disabled={saving} style={GRADIENT} className={`flex items-center gap-2 py-3 px-6 text-sm ${PRIMARY_BTN}`}>
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
  const ai = aiView(useAiStatus());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const tabs: { id: SubTab; label: string; icon: typeof MessageCircle }[] = [
    { id: "reply", label: "উত্তর তৈরি", icon: MessageCircle },
    { id: "products", label: `প্রোডাক্ট (${prod.data.length})`, icon: Package },
    { id: "business", label: "ব্যবসার তথ্য", icon: Store },
  ];

  const loadError = prod.error || biz.error;

  return (
    // ডেস্কটপে "উত্তর তৈরি" ট্যাবে উচ্চতা স্থির — ভেতরের অংশ নিজে স্ক্রল করে, পুরো পেজ কাঁপে না
    <div className={`flex flex-col gap-4 ${sub === "reply" ? "lg:h-[max(34rem,calc(100vh_-_4rem))]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium">ইনবক্স রিপ্লাই মাস্টার</h2>
          <p className="text-xs text-[var(--text-faint)] mt-1 leading-relaxed max-w-2xl">
            কাস্টমারের মেসেজ পেস্ট করুন — &quot;ইনবক্সে বাজিমাত&quot; বইয়ের CARE মেথড অনুযায়ী কপি-রেডি উত্তর পাবেন, যাতে কাস্টমার দাম শুনে চলে না গিয়ে আবার রিপ্লাই দেয়।
          </p>
        </div>
        <AiPill view={ai} />
      </div>

      <AiBanner view={ai} />
      {loadError && <ErrorBanner message={loadError} />}

      <div className="inline-flex self-start gap-1 bg-[var(--bg-card-soft)] border border-[var(--border-subtle)] p-1 rounded-xl max-w-full overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSub(t.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                active
                  ? "bg-[var(--bg-card)] text-[var(--brown-deep)] font-medium shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "reply" && (
        <ReplyWorkspace products={prod.data} business={biz.business} businessSaved={biz.saved} goTo={setSub} notify={notify} />
      )}
      {sub === "products" && (
        <ProductsPanel products={prod.data} canEdit={isOwner} onAdd={prod.add} onUpdate={prod.update} onRemove={prod.remove} />
      )}
      {sub === "business" && (
        <BusinessPanel key={biz.saved ? "saved" : "default"} business={biz.business} canEdit={isOwner} onSave={biz.save} />
      )}

      <Toast text={toast} />
    </div>
  );
}
