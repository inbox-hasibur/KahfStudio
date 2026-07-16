import type { Metadata } from "next";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";

const hindSiliguri = Hind_Siliguri({ 
  subsets: ["bengali", "latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind",
});

const notoSerif = Noto_Serif_Bengali({ 
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: "KahfNews | খবর এআই",
  description: "AI-powered personalized news briefing for Bangladesh",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className={`${hindSiliguri.variable} ${notoSerif.variable} font-sans antialiased min-h-screen bg-background text-foreground`} style={{ fontFamily: "var(--font-hind)" }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
