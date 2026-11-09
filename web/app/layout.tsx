import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wuthering Hub | Wuthering Waves Companion",
  description: "A bilingual Wuthering Waves companion for characters, damage planning, and build evaluation.",
  applicationName: "Wuthering Hub",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html><body>{children}</body></html>;
}
