# AI সেটআপ — Gemini (প্রস্তাবিত, NexoraPilot এর টুল যেটা ব্যবহার করে)

ইনবক্স রিপ্লাই এখন প্রথমে **Google Gemini** ব্যবহার করে। Gemini না থাকলে OpenRouter (ঐচ্ছিক বিকল্প)।

## কী পাওয়ার উপায় (যেকোনো একটা)
**উপায় ১ — নতুন কী (বিনা পয়সায়):**
1. https://aistudio.google.com/apikey → Google অ্যাকাউন্ট দিয়ে লগইন।
2. **Create API key** → কী কপি করুন। কী `AQ.` দিয়ে শুরু হতে পারে (গুগল ২৮ মে ২০২৬ থেকে নতুন ধরনের কী দিচ্ছে) অথবা পুরনো `AIza` দিয়ে — দুটোই ঠিক, দুটোই কাজ করে।

**উপায় ২ — NexoraPilot এ আগে থেকে বসানো কী আছে:**
আপনার NexoraPilot সাইটে লগইন অবস্থায় F12 → Console এ লিখুন:
`JSON.parse(localStorage.getItem('es_sys')).systemGeminiKey`
Enter চাপলে কী-টা দেখাবে (ওই ব্রাউজারে যেখানে টুলটা চালান)।

## Vercel এ বসান
1. Vercel → প্রোজেক্ট → Settings → Environment Variables → Add New।
2. Name: `GEMINI_API_KEY`, Value: কী-টা (কোটেশন বা স্পেস ছাড়া), Production টিক → Save।
3. Deployments → সর্বশেষ ডিপ্লয় → ⋯ → **Redeploy** (না করলে কাজ করবে না)।

## ঐচ্ছিক
- `GEMINI_MODELS` : মডেলের নাম কমা দিয়ে (গুগল নাম বদলালে)। ডিফল্ট: gemini-3.5-flash, gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest।
- `OPENROUTER_API_KEY` : Gemini ব্যর্থ হলে বিকল্প (`sk-or-` দিয়ে শুরু)।

## এরর কী বলছে
| বার্তা | সমাধান |
|---|---|
| AI কী বসানো নেই | `GEMINI_API_KEY` বসান + Redeploy |
| ...Gemini কী বলে মনে হচ্ছে না | খালি / `undefined` / খুব ছোট / OpenRouter কী বসানো — সঠিক কী বসান |
| Gemini API key কাজ করছে না | কী ভুল/মুছে ফেলা — নতুন কী নিন |
| Gemini এর ফ্রি লিমিট শেষ (৪২৯) | ১ মিনিট পর চেষ্টা; দৈনিক শেষ হলে কাল |
| Gemini মডেল পাওয়া যায়নি | `GEMINI_MODELS` এ বর্তমান নাম দিন |
