import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

// গুগল থেকে হিন্দ শিলিগুড়ি ফন্ট লোড করা হচ্ছে
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "স্মার্ট হাজিরা সিস্টেম",
  description: "ডিজিটাল হাজিরা ও স্বয়ংক্রিয় এসএমএস নোটিফিকেশন সিস্টেম",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className={`${hindSiliguri.className} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}