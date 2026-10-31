"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { TeamMember, TeamInvite, WorkspacePermissions, PERMISSION_MODULES } from "./types";

export function allPermissions(value: boolean): WorkspacePermissions {
  const perms = {} as WorkspacePermissions;
  PERMISSION_MODULES.forEach((m) => (perms[m.key] = value));
  return perms;
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ========== এই লগইন করা uid আসলে কার ডেটা দেখবে ==========
// মালিক হলে নিজের uid-ই "dataUid", মডারেটর হলে owner এর uid
export function useWorkspace(user: User | null) {
  const [dataUid, setDataUid] = useState<string | undefined>(undefined);
  const [isOwner, setIsOwner] = useState(true);
  const [permissions, setPermissions] = useState<WorkspacePermissions>(allPermissions(true));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!user) {
        if (!cancelled) {
          setDataUid(undefined);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const ref = doc(db, "teamMemberships", user.uid);
      try {
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as { ownerUid: string; permissions: WorkspacePermissions };
          setDataUid(data.ownerUid);
          setIsOwner(false);
          setPermissions(data.permissions);
        } else {
          setDataUid(user.uid);
          setIsOwner(true);
          setPermissions(allPermissions(true));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { dataUid, isOwner, permissions, loading };
}

// ========== মালিকের টিম মেম্বার লিস্ট (owner এর ড্যাশবোর্ডে ব্যবহার হয়) ==========
export function useTeamMembers(ownerUid: string | undefined) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerUid) return;
    const q = query(collection(db, "users", ownerUid, "team"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          } as TeamMember;
        })
      );
      setLoading(false);
    });
    return () => unsub();
  }, [ownerUid]);

  const invite = useCallback(
    async (ownerUid: string, ownerBusinessName: string, email: string, permissions: WorkspacePermissions) => {
      const teamMemberId = crypto.randomUUID();
      const code = randomCode();
      await setDoc(doc(db, "users", ownerUid, "team", teamMemberId), {
        email: email.trim().toLowerCase(),
        permissions,
        status: "pending",
        inviteCode: code,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "teamInvites", code), {
        code,
        ownerUid,
        ownerBusinessName,
        email: email.trim().toLowerCase(),
        permissions,
        teamMemberId,
        createdAt: serverTimestamp(),
      } as unknown as TeamInvite);
      return code;
    },
    []
  );

  const updatePermissions = useCallback(
    async (ownerUid: string, memberId: string, permissions: WorkspacePermissions, memberUid?: string) => {
      await setDoc(doc(db, "users", ownerUid, "team", memberId), { permissions }, { merge: true });
      // মেম্বার নিজের অ্যাক্সেস পড়ে teamMemberships থেকে — সেটাও আপডেট না করলে নতুন permission কাজ করে না
      if (memberUid) {
        await setDoc(doc(db, "teamMemberships", memberUid), { permissions }, { merge: true });
      }
    },
    []
  );

  const remove = useCallback(async (ownerUid: string, member: TeamMember) => {
    // পেন্ডিং হলে ইনভাইট কোডটাও বাতিল — নাহলে মুছে ফেলা মেম্বার কোড দিয়ে ঢুকে পড়তে পারত
    if (member.inviteCode) {
      try {
        await deleteDoc(doc(db, "teamInvites", member.inviteCode));
      } catch {
        // ইনভাইট আগেই ব্যবহার/মুছে গেছে — সমস্যা নেই
      }
    }
    await deleteDoc(doc(db, "users", ownerUid, "team", member.id));
    if (member.memberUid) {
      await deleteDoc(doc(db, "teamMemberships", member.memberUid));
    }
  }, []);

  return { members, loading, invite, updatePermissions, remove };
}

// ========== ইনভাইট কোড দিয়ে জয়েন করা (মডারেটরের রেজিস্ট্রেশনের পর) ==========
export async function acceptInvite(code: string, newUid: string) {
  const cleanCode = code.trim().toUpperCase();
  const inviteRef = doc(db, "teamInvites", cleanCode);

  let snap;
  try {
    snap = await getDoc(inviteRef);
  } catch {
    throw new Error("ইনভাইট কোড যাচাই করা যায়নি। কোড সঠিক কিনা দেখুন।");
  }
  if (!snap.exists()) {
    throw new Error("ইনভাইট কোড সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।");
  }
  const invite = snap.data() as TeamInvite;

  try {
    await setDoc(doc(db, "teamMemberships", newUid), {
      ownerUid: invite.ownerUid,
      permissions: invite.permissions,
      email: invite.email,
      inviteCode: cleanCode,
    });

    await setDoc(
      doc(db, "users", invite.ownerUid, "team", invite.teamMemberId),
      { status: "active", memberUid: newUid },
      { merge: true }
    );
  } catch (err) {
    const c = (err as { code?: string })?.code;
    if (c === "permission-denied") {
      throw new Error(
        "এই ইনভাইট যে ইমেইলে পাঠানো হয়েছে, ঠিক সেই ইমেইল দিয়েই রেজিস্ট্রেশন করতে হবে। (অথবা মালিক ইনভাইটটি বাতিল করেছেন)"
      );
    }
    throw err;
  }

  try {
    await deleteDoc(inviteRef);
  } catch {
    // ইনভাইট মুছতে না পারলেও জয়েন সফল — কোডটা আর কাজে লাগবে না (মেম্বারশিপ আগেই তৈরি)
  }
  return invite;
}
