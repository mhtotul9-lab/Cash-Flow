import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "হিসাবের খাতা | কাপড় বিজনেস ক্যাশ ফ্লো",
  description:
    "পাইকারি কাপড় বিজনেসের জন্য ক্যাশ ফ্লো হিসাব — ডাইরেক্ট সেল ও পার্টনার সেল আলাদা করে প্রফিট ট্র্যাকিং।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-base)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
