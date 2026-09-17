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
    <footer className="border-t border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 mt-8 sm:mt-12 text-left notranslate">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          {/* Brand Info & Socials */}
          <div className="md:col-span-2 flex flex-col items-start">
            <Link href="/" className="flex items-center justify-start gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-sm font-black text-white italic">K</span>
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground">
                Kahf<span className="text-primary">News</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-sm leading-relaxed">
              এআই দ্বারা বাছাইকৃত বাংলাদেশের প্রথম সার্বিক নিউজ ব্রিফিং ও লাইভ মিডিয়া প্ল্যাটফর্ম।
            </p>
            {/* Real Social Media Links */}
            <div className="flex items-center gap-4 text-muted-foreground">
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="X (Twitter)"
                className="hover:text-primary transition-colors p-1 hover:scale-110 transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook"
                className="hover:text-primary transition-colors p-1 hover:scale-110 transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="LinkedIn"
                className="hover:text-primary transition-colors p-1 hover:scale-110 transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="GitHub"
                className="hover:text-primary transition-colors p-1 hover:scale-110 transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path></svg>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground mb-3">প্লাটফর্ম</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">খবর (Feed)</Link></li>
              <li><Link href="/media" className="hover:text-primary transition-colors">মিডিয়া (Live TV)</Link></li>
              <li><Link href="/archive" className="hover:text-primary transition-colors">আর্কাইভ (Archive)</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">প্রাইসিং (Pricing)</Link></li>
            </ul>
          </div>

          {/* Explore / Features */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground mb-3">এক্সপ্লোর</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li><Link href="/models" className="hover:text-primary transition-colors">এআই মডেলস (Models)</Link></li>
              <li><Link href="/archive" className="hover:text-primary transition-colors">আর্কাইভ (Archive)</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KahfStudio. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/models" className="hover:text-foreground transition-colors">AI Models</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
