# Firebase সেটআপ গাইড (নতুন প্রোজেক্ট: cash-flow-41031)

## কোডে যা বদলানো হয়েছে
- `lib/firebase-config.ts` (নতুন): আপনার নতুন Firebase কনফিগ। Vercel এর পুরনো `NEXT_PUBLIC_FIREBASE_*` ভ্যারিয়েবল আর পড়া হয় না।
- `lib/firebase.ts`, `app/api/inbox-reply/route.ts`: এখন ওই কনফিগ ব্যবহার করে।
- `firestore.rules` (নতুন): পুরো প্রোজেক্টের সম্পূর্ণ Security Rules।
- `firebase.json`, `.firebaserc`, `firestore.indexes.json`: Firebase CLI চাইলে ব্যবহার করার জন্য (না চাইলে দরকার নেই)।
- `lib/workspace.ts`, `lib/types.ts`, `app/components/TeamTab.tsx`: টিম-মেম্বার সিস্টেমের ৩টা ত্রুটি ঠিক করা হয়েছে
  ১. মালিক permission বদলালে সেটা মেম্বারের কাছে পৌঁছাত না — এখন পৌঁছায়।
  ২. পেন্ডিং মেম্বার মুছলেও তার ইনভাইট কোড কাজ করত — এখন কোডও বাতিল হয়।
  ৩. ইনভাইট শুধু যে ইমেইলে গেছে সেই ইমেইল দিয়েই গ্রহণ করা যাবে (Rules এ বাধ্যতামূলক)।
- Analytics ইচ্ছা করে চালু করা হয়নি (দরকার নেই, আর সার্ভার-সাইড বিল্ডে সমস্যা করে)।

## ধাপ ১ — Firebase Console এ ঢুকুন
https://console.firebase.google.com → যে Google অ্যাকাউন্ট দিয়ে `cash-flow-41031` প্রোজেক্টটা বানিয়েছেন সেটা দিয়ে লগইন করে প্রোজেক্টটা খুলুন।

## ধাপ ২ — Authentication চালু করুন
Build → Authentication → Get started → Sign-in method → **Email/Password** → Enable → Save।

## ধাপ ৩ — আপনার সাইটের ডোমেইন অনুমতি দিন
Authentication → Settings → **Authorized domains** → Add domain → আপনার Vercel ডোমেইন (যেমন `yourapp.vercel.app`) এবং কাস্টম ডোমেইন থাকলে সেটাও। (`localhost` আগে থেকেই থাকে।)
না দিলে লাইভ সাইটে লগইন/রেজিস্টার কাজ করবে না।

## ধাপ ৪ — Firestore ডাটাবেস বানান
Build → Firestore Database → Create database → লোকেশন বেছে নিন (পরে বদলানো যায় না; বাংলাদেশের জন্য `asia-south1` (Mumbai) ভালো) → **Production mode** → Create।

## ধাপ ৫ — Rules বসান (সবচেয়ে জরুরি)
Firestore Database → **Rules** ট্যাব → ভেতরের সব লেখা মুছে ফেলুন → এই প্রোজেক্টের `firestore.rules` ফাইলের **পুরো লেখা** কপি করে পেস্ট করুন → **Publish**।

## ধাপ ৬ — কোড আপলোড ও Vercel
১. এই জিপের সব ফাইল আপনার GitHub প্রোজেক্টে বসিয়ে পুশ করুন।
২. Vercel → Project → Settings → Environment Variables:
   - `OPENROUTER_API_KEY` থাকতে হবে (ইনবক্স রিপ্লাই ও AI ফিচারের জন্য)।
   - আপনার আগের অন্য কী (যেমন Steadfast) যা ছিল তা রাখুন।
   - পুরনো `NEXT_PUBLIC_FIREBASE_*` গুলো আর কাজে লাগে না, মুছে দিতে পারেন (রাখলেও ক্ষতি নেই)।
৩. Redeploy করুন।

## ধাপ ৭ — প্রথমবার ব্যবহার
১. লাইভ সাইটে গিয়ে **নতুন করে রেজিস্টার** করুন (এটাই হবে মালিকের অ্যাকাউন্ট)।
২. পুরনো প্রোজেক্টের কোনো ডেটা নতুন প্রোজেক্টে আসেনি — সব নতুন করে শুরু।
৩. ইনবক্স রিপ্লাই → ব্যবসার তথ্য সেভ → প্রোডাক্ট যোগ।
৪. টিম ট্যাবে মডারেটরকে ইনভাইট করুন — **সে ঠিক যে ইমেইলে ইনভাইট করেছেন সেই ইমেইল দিয়েই** কোড ব্যবহার করে রেজিস্টার করবে।

## ধাপ ৮ — ভবিষ্যতে অ্যাকাউন্ট হারানো ঠেকান (খুব জরুরি)
- Firebase Console → ⚙️ Project settings → **Users and permissions** → Add member → আপনার আরেকটা Google অ্যাকাউন্ট **Owner** হিসেবে যোগ করুন।
- যে ইমেইল দিয়ে Firebase খুলেছেন সেটা কোথাও লিখে রাখুন এবং সেই Google অ্যাকাউন্টে 2-Step Verification ও রিকভারি ফোন/ইমেইল সেট করুন।

## Rules ঠিক আছে কিনা পরীক্ষা (ঐচ্ছিক, ২ মিনিট)
Firestore → Rules → **Rules Playground**:
- `get` `/databases/(default)/documents/users/অন্য_কারো_uid/orders/x` → Authenticated চালু, নিজের uid দিয়ে → **Denied** আসা উচিত।
- `get` `/databases/(default)/documents/users/আপনার_uid/orders/x` → আপনার নিজের uid দিয়ে → **Allowed** আসা উচিত।
- Authenticated বন্ধ রেখে যেকোনো পাথ → **Denied** আসা উচিত।
