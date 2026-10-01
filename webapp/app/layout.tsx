import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meta-Plant",
  description: "Campaign optimization history, visualized as a plant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: "#101c16", color: "#EDE7D9" }}
      >
        <nav
          style={{
            display: "flex",
            gap: 20,
            padding: "14px 24px",
            borderBottom: "1px solid #26362c",
            background: "#16241d",
          }}
        >
          <Link href="/campaigns" style={{ color: "#EDE7D9", textDecoration: "none" }}>Campaigns</Link>
          <Link href="/changes" style={{ color: "#EDE7D9", textDecoration: "none" }}>Log change</Link>
          <Link href="/tree" style={{ color: "#DCAE5C", textDecoration: "none" }}>Plant</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
