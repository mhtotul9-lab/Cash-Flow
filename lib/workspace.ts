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
    if (!user) {
      setDataUid(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "teamMemberships", user.uid);
    getDoc(ref)
      .then((snap) => {
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
      })
      .finally(() => setLoading(false));
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
      await setDoc(doc(db, "users", ownerUid, "team", teamMemberId), {
        email: email.trim().toLowerCase(),
        permissions,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      const code = randomCode();
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
    async (ownerUid: string, memberId: string, permissions: WorkspacePermissions) => {
      await setDoc(doc(db, "users", ownerUid, "team", memberId), { permissions }, { merge: true });
    },
    []
  );

  const remove = useCallback(async (ownerUid: string, member: TeamMember) => {
    await deleteDoc(doc(db, "users", ownerUid, "team", member.id));
    if (member.memberUid) {
      await deleteDoc(doc(db, "teamMemberships", member.memberUid));
    }
  }, []);

  return { members, loading, invite, updatePermissions, remove };
}

// ========== ইনভাইট কোড দিয়ে জয়েন করা (মডারেটরের রেজিস্ট্রেশনের পর) ==========
export async function acceptInvite(code: string, newUid: string) {
  const inviteRef = doc(db, "teamInvites", code.trim().toUpperCase());
  const snap = await getDoc(inviteRef);
  if (!snap.exists()) {
    throw new Error("ইনভাইট কোড সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।");
  }
  const invite = snap.data() as TeamInvite;

  await setDoc(doc(db, "teamMemberships", newUid), {
    ownerUid: invite.ownerUid,
    permissions: invite.permissions,
    email: invite.email,
  });

  await setDoc(
    doc(db, "users", invite.ownerUid, "team", invite.teamMemberId),
    { status: "active", memberUid: newUid },
    { merge: true }
  );

  await deleteDoc(inviteRef);
  return invite;
}
