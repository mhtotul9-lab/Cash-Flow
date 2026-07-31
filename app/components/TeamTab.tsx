"use client";

import { useState } from "react";
import { Users, UserPlus, Trash2, Copy, Check, Clock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTeamMembers, allPermissions } from "@/lib/workspace";
import { PERMISSION_MODULES, WorkspacePermissions, TeamMember } from "@/lib/types";

function PermissionEditor({
  value,
  onChange,
}: {
  value: WorkspacePermissions;
  onChange: (p: WorkspacePermissions) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PERMISSION_MODULES.map((m) => (
        <label
          key={m.key}
          className="flex items-center gap-2 text-xs bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value[m.key]}
            onChange={(e) => onChange({ ...value, [m.key]: e.target.checked })}
            className="accent-[var(--brown)]"
          />
          {m.label}
        </label>
      ))}
    </div>
  );
}

export default function TeamTab({ ownerUid }: { ownerUid: string }) {
  const { user } = useAuth();
  const { members, invite, updatePermissions, remove } = useTeamMembers(ownerUid);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<WorkspacePermissions>(allPermissions(false));
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<WorkspacePermissions>(allPermissions(false));

  async function handleInvite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const code = await invite(ownerUid, "", email, perms);
      setInviteCode(code);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ইনভাইট তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!inviteCode) return;
    const link = `${window.location.origin}/login?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-medium mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brown)]" />
            টিম ও মডারেটর
          </h2>
          <p className="text-xs text-[var(--text-faint)]">তোমার হয়ে যারা ডেটা ইনপুট করবে, তাদের জন্য অ্যাক্সেস কন্ট্রোল করো</p>
        </div>
        <button
          onClick={() => {
            setShowInvite(true);
            setInviteCode(null);
            setEmail("");
            setPerms(allPermissions(false));
          }}
          className="flex items-center gap-2 text-sm btn-gradient text-white px-4 py-2.5 rounded-lg btn-press"
        >
          <UserPlus className="w-4 h-4" />
          মডারেটর যোগ করো
        </button>
      </div>

      {showInvite && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 card-elevated animate-scale-in space-y-4">
          {!inviteCode ? (
            <>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">মডারেটরের ইমেইল</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="moderator@example.com"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--brown)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">কোন কোন ট্যাবে অ্যাক্সেস দেবে</label>
                <PermissionEditor value={perms} onChange={setPerms} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInvite}
                  disabled={busy || !email.trim()}
                  className="btn-gradient text-white text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 btn-press"
                >
                  {busy ? "তৈরি হচ্ছে..." : "ইনভাইট লিংক বানাও"}
                </button>
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-sm text-[var(--text-muted)] px-4 py-2.5"
                >
                  বাতিল
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[var(--green)] text-sm">
                <ShieldCheck className="w-4 h-4" />
                ইনভাইট তৈরি হয়েছে — এই লিংকটা মডারেটরকে পাঠাও (WhatsApp/Messenger এ)
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-xs num break-all">
                {typeof window !== "undefined" ? `${window.location.origin}/login?invite=${inviteCode}` : ""}
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 text-sm btn-gradient text-white px-4 py-2.5 rounded-lg btn-press"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "কপি হয়েছে" : "লিংক কপি করো"}
              </button>
              <button onClick={() => setShowInvite(false)} className="text-sm text-[var(--text-muted)] block">
                বন্ধ করো
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden card-elevated">
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-faint)]">
            এখনো কোনো মডারেটর যোগ করা হয়নি — {user?.email} শুধু তুমিই অ্যাডমিন হিসেবে সব দেখছ
          </p>
        )}
        {members.map((m: TeamMember) => (
          <div key={m.id} className="border-b border-[var(--border-subtle)] last:border-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate">{m.email}</span>
                  {m.status === "pending" ? (
                    <span className="flex items-center gap-1 text-[10px] tag-mustard px-2 py-0.5 rounded-full shrink-0">
                      <Clock className="w-2.5 h-2.5" /> পেন্ডিং
                    </span>
                  ) : (
                    <span className="text-[10px] tag-green px-2 py-0.5 rounded-full shrink-0">অ্যাক্টিভ</span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-faint)] mt-0.5 truncate">
                  {PERMISSION_MODULES.filter((mod) => m.permissions?.[mod.key]).map((mod) => mod.label).join(", ") || "কোনো অ্যাক্সেস নেই"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    if (editingId === m.id) {
                      setEditingId(null);
                    } else {
                      setEditingId(m.id);
                      setEditPerms(m.permissions);
                    }
                  }}
                  className="text-[11px] text-[var(--brown)] hover:underline"
                >
                  {editingId === m.id ? "বন্ধ করো" : "এডিট"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`${m.email} কে সরিয়ে দিতে চাও?`)) remove(ownerUid, m);
                  }}
                  className="text-[var(--red)] hover:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {editingId === m.id && (
              <div className="px-4 pb-4 space-y-3 animate-scale-in">
                <PermissionEditor value={editPerms} onChange={setEditPerms} />
                <button
                  onClick={async () => {
                    await updatePermissions(ownerUid, m.id, editPerms);
                    setEditingId(null);
                  }}
                  className="text-sm btn-gradient text-white px-4 py-2 rounded-lg btn-press"
                >
                  সেভ করো
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
