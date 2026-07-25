import type { Metadata } from "next";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <body className={`${hindSiliguri.variable} ${notoSerif.variable} font-sans antialiased`} style={{ fontFamily: "var(--font-hind)" }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          {children}
          <Footer />
        </ThemeProvider>
        
        {/* Google Translate Element */}
        <div id="google_translate_element" className="hidden"></div>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({pageLanguage: 'bn', autoDisplay: false}, 'google_translate_element');
              }
            `,
          }}
        />
        <script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async defer></script>
      </body>
    </html>
  );
}
