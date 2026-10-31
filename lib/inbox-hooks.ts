"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { InboxProduct, InboxBusinessInfo } from "./types";

export const DEFAULT_BUSINESS: InboxBusinessInfo = {
  shopName: "Jolrasi",
  replierName: "",
  address: "স্যার/ম্যাম",
  tone: "friendly",
  delivery: "ঢাকার ভেতরে ৬০ টাকা, ঢাকার বাইরে ১২০ টাকা। ডেলিভারি হতে ১-২ দিন লাগবে।",
  payment: "Cash On Delivery",
  returnPolicy: "",
  phone: "",
  orderNeeds: "নাম, পূর্ণ ঠিকানা, মোবাইল নম্বর",
  instructions: "",
};

function errMsg(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === "permission-denied") {
    return "Firestore Rules এ নতুন কালেকশনের অনুমতি দেওয়া নেই। (নিচের নির্দেশনা অনুযায়ী Rules আপডেট করুন)";
  }
  return err instanceof Error ? err.message : "অজানা সমস্যা";
}

// ========== প্রোডাক্ট লিস্ট: users/{uid}/inboxProducts ==========
export function useInboxProducts(uid: string | undefined) {
  const [data, setData] = useState<InboxProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "inboxProducts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InboxProduct));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error on inboxProducts:", err);
        setError(errMsg(err));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const add = useCallback(
    async (item: Omit<InboxProduct, "id" | "createdAt">) => {
      if (!uid) throw new Error("লগইন সম্পূর্ণ হয়নি");
      try {
        await addDoc(collection(db, "users", uid, "inboxProducts"), { ...item, createdAt: Date.now() });
      } catch (e) {
        throw new Error(errMsg(e));
      }
    },
    [uid]
  );

  const update = useCallback(
    async (id: string, patch: Partial<InboxProduct>) => {
      if (!uid) throw new Error("লগইন সম্পূর্ণ হয়নি");
      try {
        await updateDoc(doc(db, "users", uid, "inboxProducts", id), patch as Record<string, unknown>);
      } catch (e) {
        throw new Error(errMsg(e));
      }
    },
    [uid]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!uid) throw new Error("লগইন সম্পূর্ণ হয়নি");
      try {
        await deleteDoc(doc(db, "users", uid, "inboxProducts", id));
      } catch (e) {
        throw new Error(errMsg(e));
      }
    },
    [uid]
  );

  return { data, loading, error, add, update, remove };
}

// ========== ব্যবসার তথ্য: users/{uid}/inboxSettings/business ==========
export function useInboxBusiness(uid: string | undefined) {
  const [business, setBusiness] = useState<InboxBusinessInfo>(DEFAULT_BUSINESS);
  const [saved, setSaved] = useState(false); // Firestore এ আসলেই সেভ করা আছে কিনা
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "inboxSettings", "business");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setBusiness({ ...DEFAULT_BUSINESS, ...(snap.data() as Partial<InboxBusinessInfo>) });
          setSaved(true);
        } else {
          setSaved(false);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error on inboxSettings:", err);
        setError(errMsg(err));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const save = useCallback(
    async (info: InboxBusinessInfo) => {
      if (!uid) throw new Error("লগইন সম্পূর্ণ হয়নি");
      try {
        await setDoc(doc(db, "users", uid, "inboxSettings", "business"), info);
      } catch (e) {
        throw new Error(errMsg(e));
      }
    },
    [uid]
  );

  return { business, saved, loading, error, save };
}
