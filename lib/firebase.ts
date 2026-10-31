import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

const wasAlreadyInitialized = getApps().length > 0;

export const app = wasAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: true — নাহলে ফর্মের কোনো ঐচ্ছিক (optional) ফিল্ড
// undefined থাকলে Firestore পুরো সেভ রিকোয়েস্টটাই silently রিজেক্ট করে দেয়,
// যেটার কারণে "সেভ বাটনে কাজ করে না" সমস্যাটা হচ্ছিল।
export const db = wasAlreadyInitialized
  ? getFirestore(app)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });
