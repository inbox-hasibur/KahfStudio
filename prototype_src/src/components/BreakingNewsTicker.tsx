"use client";

import React from "react";
import Link from "next/link";

interface BreakingNewsTickerProps {
  items?: string[];
}

export default function BreakingNewsTicker({ items = [] }: BreakingNewsTickerProps) {
  const displayItems = items.length > 0 ? items : ["নতুন কোনো খবর নেই"];

  return (
    <div className="w-full bg-[#111116]/60 backdrop-blur-md border border-primary/30 rounded-2xl text-white flex items-center relative overflow-hidden mb-8 shadow-sm">
      <div className="flex-shrink-0 bg-primary/20 text-primary font-bold px-4 py-2.5 border-r border-primary/30 flex items-center gap-2 z-10 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></span>
        <span className="font-serif">ব্রেকিং নিউজ</span>
      </div>
      
      <div className="flex-1 overflow-hidden whitespace-nowrap relative flex items-center h-10">
        <div className="flex gap-8 px-4 animate-marquee min-w-max">
          {/* Double the items to make the infinite scroll seamless */}
          {[...displayItems, ...displayItems].map((item, index) => (
            <Link href={`/news/${index}`} key={index} className="text-sm md:text-base text-gray-200 hover:text-primary transition-colors flex items-center">
              {item} <span className="mx-6 text-primary/50">|</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
