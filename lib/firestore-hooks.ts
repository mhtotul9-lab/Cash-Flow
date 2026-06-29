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
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Order,
  Partner,
  DailyAdSpend,
  ExpenseEntry,
  CashPosition,
  CommissionPayment,
} from "./types";

function useCollection<T>(uid: string | undefined, name: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      return;
    }
    const ref = collection(db, "users", uid, name);
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Firestore error on ${name}:`, err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid, name]);

  const add = useCallback(
    async (item: Omit<T, "id" | "createdAt">) => {
      if (!uid) return;
      const ref = await addDoc(collection(db, "users", uid, name), {
        ...item,
        createdAt: Date.now(),
      });
      return ref.id;
    },
    [uid, name]
  );

  const bulkAdd = useCallback(
    async (items: Omit<T, "id" | "createdAt">[]) => {
      if (!uid || items.length === 0) return;
      // Firestore batch এর সর্বোচ্চ সীমা ৫০০ অপারেশন, তাই চাঙ্কে ভাগ করা
      const chunkSize = 450;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item, idx) => {
          const ref = doc(collection(db, "users", uid, name));
          batch.set(ref, { ...item, createdAt: Date.now() + idx });
        });
        await batch.commit();
      }
    },
    [uid, name]
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (!uid) return;
      await updateDoc(
        doc(db, "users", uid, name, id),
        patch as Record<string, unknown>
      );
    },
    [uid, name]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!uid) return;
      await deleteDoc(doc(db, "users", uid, name, id));
    },
    [uid, name]
  );

  return { data, loading, add, bulkAdd, update, remove };
}

export function useOrders(uid: string | undefined) {
  return useCollection<Order>(uid, "orders");
}

export function usePartners(uid: string | undefined) {
  return useCollection<Partner>(uid, "partners");
}

export function useDailyAdSpend(uid: string | undefined) {
  return useCollection<DailyAdSpend>(uid, "dailyAdSpend");
}

export function useExpenses(uid: string | undefined) {
  return useCollection<ExpenseEntry>(uid, "expenses");
}

export function useCommissionPayments(uid: string | undefined) {
  return useCollection<CommissionPayment>(uid, "commissionPayments");
}

export function useCashPosition(uid: string | undefined) {
  const [position, setPosition] = useState<CashPosition>({
    bankBalance: 0,
    mobileWalletBalance: 0,
    cashInHand: 0,
    minimumSafeCashLevel: 0,
    asOf: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      return;
    }
    const ref = doc(db, "users", uid, "meta", "cashPosition");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPosition(snap.data() as CashPosition);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const save = useCallback(
    async (pos: CashPosition) => {
      if (!uid) return;
      await setDoc(doc(db, "users", uid, "meta", "cashPosition"), pos);
    },
    [uid]
  );

  return { position, loading, save };
}
