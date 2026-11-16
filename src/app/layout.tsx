import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KO Builders | Custom Home Selections, Takeoff & Trade Specification Portal",
  description:
    "Interactive architectural selections, Nuform ConForm CF8i & 2x4 framing takeoff, hydronic radiant & ERV specification portal for KO Builders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
