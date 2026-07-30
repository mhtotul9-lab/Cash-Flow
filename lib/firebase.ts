import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.AIzaSyAjBBEiktZ7qJ2b_J6Q-T7nG5x8u68-b7s,
  authDomain: process.env.cash-flow-11f2d.firebaseapp.com,
  projectId: process.env.cash-flow-11f2d,
  storageBucket: process.env.cash-flow-11f2d.firebasestorage.app,
  messagingSenderId: process.env.874104841202,
  appId: process.env.1:874104841202:web:036e145a33021a016fc16b,
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
