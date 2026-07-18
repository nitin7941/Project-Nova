import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Project Nova — AI Developer Productivity Platform",
  description:
    "Project Nova accelerates the software lifecycle: code review, test generation, docs, and system design powered by Claude.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
