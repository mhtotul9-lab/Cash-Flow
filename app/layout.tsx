import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "হিসাবের খাতা | কাপড় বিজনেস ক্যাশ ফ্লো",
  description:
    "পাইকারি কাপড় বিজনেসের জন্য ক্যাশ ফ্লো হিসাব — ডাইরেক্ট সেল ও পার্টনার সেল আলাদা করে প্রফিট ট্র্যাকিং।",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "হিসাবের খাতা",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#9A6F35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] overscroll-none">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
