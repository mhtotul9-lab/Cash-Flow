// নতুন Firebase প্রোজেক্টের কনফিগ (cash-flow-41031)।
// এই ভ্যালুগুলো সিক্রেট না — ব্রাউজারে থাকা স্বাভাবিক। আসল নিরাপত্তা আসে firestore.rules থেকে।
//
// ইচ্ছা করেই Vercel এর পুরনো NEXT_PUBLIC_FIREBASE_* ভ্যারিয়েবল এখানে পড়া হয় না,
// যাতে পুরনো (হারিয়ে যাওয়া) প্রোজেক্টের ভ্যালু ভুল করে নতুন প্রোজেক্টকে ওভাররাইড করতে না পারে।
export const firebaseConfig = {
  apiKey: "AIzaSyBD6Dk5rBn9jbExmwQsjXIVFdvj98uXIFg",
  authDomain: "cash-flow-41031.firebaseapp.com",
  projectId: "cash-flow-41031",
  storageBucket: "cash-flow-41031.firebasestorage.app",
  messagingSenderId: "95615259777",
  appId: "1:95615259777:web:24bd5f48fa22155370a980",
  measurementId: "G-C74KK2CT52",
};
