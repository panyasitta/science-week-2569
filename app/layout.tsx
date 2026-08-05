import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-thai";
import "@fontsource/pridi/500.css";
import "@fontsource/pridi/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ตำราลับแม่มด | สัปดาห์วิทยาศาสตร์ 2569",
  description: "งานสัปดาห์วิทยาศาสตร์แห่งชาติ โรงเรียนทุ่งเสลี่ยมชนูปถัมภ์ ปีการศึกษา 2569 พร้อมกำหนดการ กติกา และลิงก์สมัครการแข่งขัน",
  openGraph: {
    title: "ตำราลับแม่มด ถอดรหัสเวทมนตร์ด้วยวิทยาศาสตร์",
    description: "รวมกำหนดการ กติกา และลิงก์สมัคร 11 รายการแข่งขัน งานสัปดาห์วิทยาศาสตร์แห่งชาติ ปีการศึกษา 2569",
    locale: "th_TH",
    type: "website",
    images: [{ url: "/images/hero-science-week.webp", width: 1672, height: 941, alt: "หนังสือวิทยาศาสตร์เรืองแสงท่ามกลางสัญลักษณ์ทางวิทยาศาสตร์" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ตำราลับแม่มด | สัปดาห์วิทยาศาสตร์ 2569",
    description: "รวมกำหนดการ กติกา และลิงก์สมัครการแข่งขัน",
    images: ["/images/hero-science-week.webp"],
  },
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
