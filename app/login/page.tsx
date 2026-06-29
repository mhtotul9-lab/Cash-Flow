"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, Lock, Mail, Store } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, businessName);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "একটি সমস্যা হয়েছে।";
      setError(translateError(message));
    } finally {
      setSubmitting(false);
    }
  }

  function translateError(msg: string): string {
    if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password"))
      return "ইমেইল বা পাসওয়ার্ড ভুল।";
    if (msg.includes("auth/email-already-in-use")) return "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে।";
    if (msg.includes("auth/weak-password")) return "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।";
    if (msg.includes("auth/user-not-found")) return "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।";
    if (msg.includes("auth/invalid-email")) return "সঠিক ইমেইল দিন।";
    return msg;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-full bg-[var(--brown)]/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[var(--brown)]" strokeWidth={2} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold text-xl tracking-tight">
            হিসাবের খাতা
          </span>
        </div>

        <div className="receipt-card border border-[var(--border-subtle)] rounded-2xl p-7 shadow-sm">
          <div className="flex gap-1 mb-6 bg-[var(--bg-base)] rounded-lg p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "login" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
              }`}
            >
              লগইন
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "register" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
              }`}
            >
              নতুন অ্যাকাউন্ট
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">ব্যবসার নাম</label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="যেমন: Jolrasi Fashion"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brown)] transition-colors"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1.5 block">ইমেইল</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brown)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1.5 block">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brown)] transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--red)] bg-[var(--red-soft)] rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--brown)] text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {submitting ? "প্রসেসিং..." : mode === "login" ? "খাতা খুলুন" : "অ্যাকাউন্ট তৈরি করুন"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-faint)] mt-5">
          ডাইরেক্ট সেল ও পার্টনার সেল — দুই হিসাব একসাথে, পরিষ্কারভাবে
        </p>
      </div>
    </div>
  );
}
