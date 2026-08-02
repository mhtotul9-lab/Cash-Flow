"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BookOpen } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="flex items-center gap-2.5 opacity-60">
        <BookOpen className="w-5 h-5 text-[var(--brown)] animate-pulse" />
        <span className="font-[family-name:var(--font-display)] text-sm">লোড হচ্ছে...</span>
      </div>
    </div>
  );
}
