"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, ArrowUpRight, Bookmark, Share2 } from "lucide-react";

interface NewsCardProps {
  news: {
    id: string;
    title: string;
    summary: string;
    source: string;
    category: string;
    priority: "high" | "medium" | "low";
    publishedAt: string;
    imageUrl?: string;
    originalUrl?: string;
  };
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const NewsCard = ({ news, isSaved = false, onToggleSave }: NewsCardProps) => {
  const handlePlayAudio = (type: 'full' | 'summary', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const textToPlay = type === 'full' ? `${news.title}. ${news.summary}` : news.summary;
    
    const event = new CustomEvent('play-audio', {
      detail: {
        title: news.title,
        summary: textToPlay
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.div 
      className="relative group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      {/* Animated Gradient Border on Hover */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
      
      <Card className="relative bg-card border-border group-hover:border-primary/20 rounded-[28px] overflow-hidden flex flex-col p-4 md:p-5 gap-5 md:gap-6 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5 h-full">
        

        {/* Content Section - Improved white space and alignment */}
        <div className="flex-1 flex flex-col min-w-0 py-1">
          {/* Top Row: Category, Source, Time - Clear hierarchy */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                {news.category}
              </span>
              <span className="text-border">|</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {news.source}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">
                {news.publishedAt}
              </span>
            </div>
          </div>

          {/* Title - Enhanced typography hierarchy */}
          <h3 className="text-lg md:text-xl lg:text-[22px] font-bold text-foreground leading-[1.35] tracking-tight mb-3 line-clamp-2">
            <Link 
              href={`/news/${news.id}`} 
              className="hover:text-primary transition-colors duration-300"
            >
              {news.title}
            </Link>
          </h3>

          {/* Summary - Better readability with optimal line length */}
          <p className="text-muted-foreground text-[14px] leading-[1.6] line-clamp-2 mb-4 flex-grow">
            {news.summary}
          </p>

          {/* Action Bar - Balanced layout with clear CTAs */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={(e) => handlePlayAudio('full', e)}
                  className="h-8 px-3 bg-primary text-primary-foreground hover:opacity-90 transition-all rounded-full font-semibold text-[11px] flex items-center gap-1 shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Full
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={(e) => handlePlayAudio('summary', e)}
                  variant="outline"
                  className="h-8 px-3 border-primary/20 text-primary hover:bg-primary/10 transition-all rounded-full font-semibold text-[11px] flex items-center gap-1 shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Summary
                </Button>
              </motion.div>
              
              <Link href={`/news/${news.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-9 w-9 rounded-full border-border hover:bg-muted hover:border-primary/30 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </Link>
            </div>
            
            {/* Secondary Actions - Subtle but accessible */}
            <div className="flex items-center gap-1">
              <motion.button
                className={`p-2 transition-colors rounded-full hover:bg-muted ${isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Bookmark"
                onClick={onToggleSave}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
              </motion.button>
              <motion.button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default NewsCard;
