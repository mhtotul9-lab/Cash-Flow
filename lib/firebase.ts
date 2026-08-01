import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// এই config ভ্যালুগুলো সিক্রেট না — ব্রাউজারে থাকা স্বাভাবিক।
// আসল নিরাপত্তা আসে Firestore/Auth এর Security Rules থেকে, এই key থেকে না।
// তোমার Vercel এ আগে থেকেই NEXT_PUBLIC_FIREBASE_* ভ্যারিয়েবলগুলো বসানো আছে,
// তাই এখানে সেগুলোই পড়া হচ্ছে (হার্ডকোড না করে) — লোকাল এ চালাতে হলে
// .env.local এও এই একই নামে ভ্যালুগুলো বসাতে হবে।
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const wasAlreadyInitialized = getApps().length > 0;

export const app = wasAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: true — নাহলে ফর্মের কোনো ঐচ্ছিক (optional) ফিল্ড
// undefined থাকলে Firestore পুরো সেভ রিকোয়েস্টটাই silently রিজেক্ট করে দেয়,
// যেটার কারণে "সেভ বাটনে কাজ করে না" সমস্যাটা হচ্ছিল।
export const db = wasAlreadyInitialized
  ? getFirestore(app)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });
