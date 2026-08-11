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
        className="relative min-w-[360px] md:min-w-[500px] h-[180px] md:h-[200px] rounded-2xl overflow-hidden group cursor-pointer snap-center card-hover bg-card border border-border"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />

      {/* Animated Glow Border on Hover */}
      <motion.div 
        className="absolute inset-0 rounded-[24px] border border-transparent group-hover:border-primary/30 transition-all duration-500 pointer-events-none"
        whileHover={{ boxShadow: "inset 0 0 20px rgba(59, 130, 246, 0.1)" }}
      />

      {/* Content - Improved hierarchy with white space */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
        {/* Top Section: Category & Source */}
        <div className="flex items-center justify-start gap-3 mb-auto pb-4">
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider">
            {news.category}
          </Badge>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {news.source}
          </span>
        </div>

        {/* Title - Reduced font size */}
        <h2 className="text-base md:text-lg lg:text-xl font-bold text-foreground leading-snug tracking-tight mb-4 group-hover:text-primary transition-colors line-clamp-2">
          {news.title}
        </h2>

        {/* Bottom Action Bar - Balance and alignment */}
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-primary/10 rounded-full text-foreground text-[11px] font-semibold transition-all border border-border group-hover:border-primary/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-3.5 h-3.5 text-primary group-hover:text-primary" fill="currentColor" />
            <span>Listen</span>
          </motion.button>
          
          <motion.button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted bg-muted/50 border border-border"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Index Badge */}
      <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-muted/80 backdrop-blur-md flex items-center justify-center text-muted-foreground text-[10px] font-bold border border-border">
        {String(index + 1).padStart(2, '0')}
      </div>
      </motion.div>
    </Link>
  );
};

export default HeadlineCard;
