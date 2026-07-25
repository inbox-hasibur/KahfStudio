"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Headphones } from "lucide-react";

interface HeadlineCardProps {
  news: {
    title: string;
    category: string;
    imageUrl: string;
    source: string;
  };
  index?: number;
}

const HeadlineCard = ({ news, index = 0 }: HeadlineCardProps) => {
  return (
    <motion.div 
      className="relative min-w-[320px] md:min-w-[420px] h-[260px] md:h-[300px] rounded-[28px] overflow-hidden group cursor-pointer snap-center card-hover"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      {/* Background Image - Enhanced with parallax effect */}
      <motion.img
        src={news.imageUrl}
        alt={news.title}
        className="absolute inset-0 w-full h-full object-cover"
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Multi-layer Gradient Overlay - Better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Animated Glow Border on Hover */}
      <motion.div 
        className="absolute inset-0 rounded-[28px] border-2 border-transparent group-hover:border-primary/30 transition-all duration-500 pointer-events-none"
        whileHover={{ boxShadow: "0 0 40px rgba(59, 130, 246, 0.2)" }}
      />

      {/* Content - Improved hierarchy with white space */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
        {/* Top Section: Category & Source - Clear visual separation */}
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-primary text-primary-foreground border-none text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider shadow-lg">
            {news.category}
          </Badge>
          <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
            {news.source}
          </span>
        </div>

        {/* Title - Emphasis through typography */}
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white leading-tight tracking-tight mb-4 group-hover:text-primary/90 transition-colors line-clamp-2 drop-shadow-lg">
          {news.title}
        </h2>

        {/* Bottom Action Bar - Balance and alignment */}
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-semibold transition-all border border-white/10"
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Listen</span>
          </motion.button>
          
          <motion.button
            className="p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
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
  );
};

export default HeadlineCard;
