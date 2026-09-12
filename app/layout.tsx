import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENSv2 Inspector",
  description: "A developer debugger for ENSv2 resolution.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
