"use client";

import React from "react";
import Link from "next/link";

interface BreakingNewsTickerProps {
  items?: string[];
}

export default function BreakingNewsTicker({ items = [] }: BreakingNewsTickerProps) {
  const displayItems = items.length > 0 ? items : ["নতুন কোনো খবর নেই"];

  return (
    <div className="w-full bg-card/80 backdrop-blur-md border border-border rounded-xl sm:rounded-2xl text-foreground flex items-center relative overflow-hidden shadow-sm h-8 sm:h-9 md:h-10">
      {/* Ticker Tag Badge */}
      <div className="flex-shrink-0 bg-primary/10 text-primary font-bold px-2.5 sm:px-3.5 h-full border-r border-border flex items-center gap-1.5 z-10 select-none text-[11px] sm:text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
        <span className="font-semibold">নিউজ</span>
      </div>

      {/* Marquee Scroller */}
      <div className="flex-1 overflow-hidden whitespace-nowrap relative flex items-center h-full">
        <div className="flex gap-6 sm:gap-8 px-3 sm:px-4 animate-marquee min-w-max">
          {[...displayItems, ...displayItems].map((item, index) => (
            <Link
              href={`/news/${index}`}
              key={index}
              className="text-xs sm:text-sm text-foreground/80 hover:text-primary transition-colors flex items-center"
            >
              <span>{item}</span>
              <span className="mx-4 sm:mx-6 text-border font-light">|</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
