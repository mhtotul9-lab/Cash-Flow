# ইনবক্স রিপ্লাই মাস্টার — সেটআপ গাইড

## নতুন/বদলানো ফাইল
- নতুন: `app/components/InboxReplyTab.tsx` (স্ক্রিন)
- নতুন: `app/api/inbox-reply/route.ts` (AI সার্ভার রুট)
- নতুন: `lib/inbox-prompt.ts` (CARE মেথডের নিয়ম + যাচাই)
- নতুন: `lib/inbox-hooks.ts` (Firestore হুক)
- বদল: `lib/types.ts` (শেষে নতুন টাইপ যোগ), `app/components/Sidebar.tsx` (১টা মেনু আইটেম), `app/dashboard/page.tsx` (১টা import + ১টা ট্যাব)
- আর কোনো ফাইল বদলানো হয়নি, নতুন প্যাকেজও লাগে না।

## ১) Firestore Rules
পুরো প্রোজেক্টের সম্পূর্ণ Rules এখন `firestore.rules` ফাইলে আছে (ইনবক্স রিপ্লাইয়ের অংশসহ)। কীভাবে বসাতে হবে তা `FIREBASE_SETUP_BN.md` এ ধাপে ধাপে লেখা আছে।

## ২) Vercel Environment Variables
- `OPENROUTER_API_KEY` — আগে থেকেই থাকলে নতুন কিছু লাগবে না।
- Firebase কনফিগ এখন কোডেই আছে (`lib/firebase-config.ts`), আলাদা ভ্যারিয়েবল লাগে না।

## ৩) ডিপ্লয়
GitHub এ পুশ করলে Vercel অটো ডিপ্লয় করবে।

## ৪) প্রথমবার ব্যবহার
১. ইনবক্স রিপ্লাই → "ব্যবসার তথ্য" → সব তথ্য ঠিক করে সেভ।
২. "প্রোডাক্ট" → প্রোডাক্ট যোগ (শুধু সত্যি তথ্য)।
৩. "উত্তর তৈরি" → প্রোডাক্ট বেছে কাস্টমারের মেসেজ পেস্ট → বাটন চাপুন।
