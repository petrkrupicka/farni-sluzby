import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ParishProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Farní služby",
  description: "Správa dobrovolnických služeb ve farnosti",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <ParishProvider>{children}</ParishProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
