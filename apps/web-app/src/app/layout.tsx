import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Carbon Platform",
  description: "Project owner portal foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
