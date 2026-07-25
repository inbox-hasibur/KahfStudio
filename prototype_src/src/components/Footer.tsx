"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();

  // Hide footer on admin and profile pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/profile")) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12 text-center md:text-left notranslate">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          <div className="md:col-span-1 flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-[14px] font-black text-white italic">K</span>
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground">
                Kahf<span className="text-primary">News</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6">
              এআই দ্বারা বাছাইকৃত বাংলাদেশের প্রথম ব্যক্তিগতকৃত নিউজ ব্রিফিং প্ল্যাটফর্ম।
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path></svg>
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">প্লাটফর্ম</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">খবর</Link></li>
              <li><Link href="/media" className="hover:text-primary transition-colors">মিডিয়া</Link></li>
              <li><Link href="/archive" className="hover:text-primary transition-colors">আর্কাইভ</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">প্রাইসিং</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">রিসোর্স</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/models" className="hover:text-primary transition-colors">এআই মডেলস</Link></li>
              <li><Link href="/api" className="hover:text-primary transition-colors">এপিআই এক্সেস</Link></li>
              <li><Link href="/docs" className="hover:text-primary transition-colors">ডকুমেন্টেশন</Link></li>
              <li><Link href="/support" className="hover:text-primary transition-colors">সাপোর্ট</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">কোম্পানি</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">আমাদের সম্পর্কে</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">গোপনীয়তা নীতি</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">শর্তাবলী</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">যোগাযোগ</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KahfStudio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
