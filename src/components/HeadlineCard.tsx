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
        className="relative min-w-[360px] md:min-w-[500px] h-[180px] md:h-[200px] rounded-[24px] overflow-hidden group cursor-pointer snap-center card-hover bg-card border border-border"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700" />

      {/* Animated Glow Border on Hover */}
      <motion.div 
        className="absolute inset-0 rounded-[24px] border border-transparent group-hover:border-primary/30 transition-all duration-500 pointer-events-none"
        whileHover={{ boxShadow: "inset 0 0 20px rgba(59, 130, 246, 0.1)" }}
      />

      {/* Content - Improved hierarchy with white space */}
      <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between">
        {/* Top Section: Category & Source - Grouped on the left */}
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider">
            {news.category}
          </Badge>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {news.source}
          </span>
        </div>

        {/* Title - Emphasis through typography */}
        <h2 className="text-base md:text-lg lg:text-xl font-bold text-foreground leading-snug tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {news.title}
        </h2>

        {/* Bottom Action Bar - Balance and alignment */}
        <div className="flex items-center justify-between mt-auto">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-full text-primary text-xs font-semibold transition-all border border-primary/10 group-hover:border-primary/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Listen</span>
          </motion.button>
          
          <motion.button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Index Badge - Visual interest element */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-[10px] font-bold">
        {String(index + 1).padStart(2, '0')}
      </div>
      </motion.div>
    </Link>
  );
};

export default HeadlineCard;
