"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Headphones } from "lucide-react";

import Link from "next/link";

interface HeadlineCardProps {
  news: {
    id?: string;
    title: string;
    category: string;
    imageUrl?: string;
    source: string;
  };
  index?: number;
}

const HeadlineCard = ({ news, index = 0 }: HeadlineCardProps) => {
  return (
    <Link href={`/news/${news.id || ''}`}>
      <motion.div 
        className="relative min-w-[340px] md:min-w-[480px] h-[220px] md:h-[260px] rounded-[24px] overflow-hidden group cursor-pointer snap-center card-hover bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-white/5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700" />

      {/* Animated Glow Border on Hover */}
      <motion.div 
        className="absolute inset-0 rounded-[24px] border border-transparent group-hover:border-primary/30 transition-all duration-500 pointer-events-none"
        whileHover={{ boxShadow: "inset 0 0 20px rgba(59, 130, 246, 0.1)" }}
      />

      {/* Content - Improved hierarchy with white space */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
        {/* Top Section: Category & Source - Clear visual separation */}
        <div className="flex items-center justify-between mb-auto pb-4">
          <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider">
            {news.category}
          </Badge>
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
            {news.source}
          </span>
        </div>

        {/* Title - Emphasis through typography */}
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white leading-snug tracking-tight mb-4 group-hover:text-primary transition-colors line-clamp-3">
          {news.title}
        </h2>

        {/* Bottom Action Bar - Balance and alignment */}
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-primary/20 rounded-full text-white text-xs font-semibold transition-all border border-white/10 group-hover:border-primary/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4 text-primary group-hover:text-white" fill="currentColor" />
            <span>Listen</span>
          </motion.button>
          
          <motion.button
            className="p-2.5 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10 bg-white/5 border border-white/5"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Index Badge - Visual interest element */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold border border-white/20">
        {String(index + 1).padStart(2, '0')}
      </div>
      </motion.div>
    </Link>
  );
};

export default HeadlineCard;
