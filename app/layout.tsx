import type { Metadata } from "next";
import "./globals.css";
import { ArkivHistory } from "@/app/components/ArkivHistory";

export const metadata: Metadata = {
  title: "ENSv2 Inspector",
  description: "A developer debugger for ENSv2 resolution.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<ArkivHistory /></body></html>;
}
