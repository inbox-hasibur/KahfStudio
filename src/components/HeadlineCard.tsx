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
    summary?: string;
    audio_bn_full?: string;
    audio_bn_summary?: string;
    audio_en_full?: string;
    audio_en_summary?: string;
  };
  index?: number;
}

const HeadlineCard = ({ news, index = 0 }: HeadlineCardProps) => {
  const handlePlayAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isEnglish = typeof document !== 'undefined' && (document.cookie.includes('googtrans=/bn/en') || localStorage.getItem('kahf-language') === 'EN');
    const preferredLang = isEnglish ? 'EN' : 'BN';

    const event = new CustomEvent('play-audio', {
      detail: {
        id: news.id,
        title: news.title,
        summary: news.summary || "No summary available.",
        imageUrl: news.imageUrl,
        source: news.source,
        preferredLang,
        preferredType: 'summary',
        audioUrls: {
          bn_full: news.audio_bn_full,
          bn_summary: news.audio_bn_summary,
          en_full: news.audio_en_full,
          en_summary: news.audio_en_summary,
        }
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <Link href={`/news/${news.id || ''}`}>
      <motion.div 
        className="relative min-w-[340px] sm:min-w-[440px] md:min-w-[540px] h-[125px] sm:h-[145px] md:h-[165px] rounded-2xl sm:rounded-3xl overflow-hidden group cursor-pointer snap-center bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -3, scale: 1.01 }}
      >
        {/* Decorative Ambient Glow Orbs (Matching Hero Card Style) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />

        {/* Content */}
        <div className="absolute inset-0 p-3.5 sm:p-5 md:p-6 flex flex-col justify-between">
          {/* Top Section: Category & Source */}
          <div className="flex items-center gap-2 sm:gap-2.5 pr-12">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 uppercase tracking-wider">
              {news.category}
            </Badge>
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[140px] sm:max-w-none">
              {news.source}
            </span>
          </div>

          {/* Title - Vertically Centered in Available Space */}
          <div className="flex-1 flex items-center py-1 my-auto">
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
              {news.title}
            </h2>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between mt-auto">
            <motion.button
              onClick={handlePlayAudio}
              className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full text-primary text-[10px] sm:text-xs font-semibold transition-all border border-primary/10 group-hover:border-primary/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>Listen</span>
            </motion.button>
            
            <motion.button
              className="p-1 sm:p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </motion.button>
          </div>
        </div>

        {/* Clean Plain Numbering (No Box Background - Clean & Elegant) */}
        <div className="absolute top-3.5 sm:top-5 right-4 sm:right-6 text-muted-foreground/60 group-hover:text-primary font-mono text-xs sm:text-sm md:text-base font-black select-none tracking-tight transition-colors">
          {String(index + 1).padStart(2, '0')}
        </div>
      </motion.div>
    </Link>
  );
};

export default HeadlineCard;
