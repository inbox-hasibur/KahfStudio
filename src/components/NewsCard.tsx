"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, ArrowUpRight, Bookmark, Share2, Check } from "lucide-react";

interface NewsCardProps {
  news: {
    id: string;
    title: string;
    summary: string;
    source: string;
    category: string;
    priority?: "high" | "medium" | "low";
    publishedAt: string;
    imageUrl?: string;
    originalUrl?: string;
    audio_bn_full?: string;
    audio_bn_summary?: string;
    audio_en_full?: string;
    audio_en_summary?: string;
  };
  isSaved?: boolean;
  onToggleSave?: () => void;
}

// Helper to remove raw markdown syntax like **bold** or ## Header
const cleanMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/#+\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
};

const NewsCard = ({ news, isSaved = false, onToggleSave }: NewsCardProps) => {
  const [isCopied, setIsCopied] = React.useState(false);

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isEnglish =
      typeof document !== "undefined" &&
      (document.cookie.includes("googtrans=/bn/en") || localStorage.getItem("kahf-language") === "EN");
    const preferredLang = isEnglish ? "EN" : "BN";

    const event = new CustomEvent("play-audio", {
      detail: {
        id: news.id,
        title: cleanMarkdown(news.title),
        summary: cleanMarkdown(news.summary),
        raw_content: (news as any).raw_content || (news as any).content || "",
        imageUrl: news.imageUrl,
        source: news.source,
        preferredLang,
        preferredType: "summary",
        audioUrls: {
          bn_full: news.audio_bn_full || (news as any).audioUrls?.bn_full || (news as any).audio_full,
          bn_summary: news.audio_bn_summary || (news as any).audioUrls?.bn_summary || (news as any).audio_summary,
          en_full: news.audio_en_full || (news as any).audioUrls?.en_full,
          en_summary: news.audio_en_summary || (news as any).audioUrls?.en_summary,
        },
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.div
      className="relative group h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      {/* Animated Gradient Border on Hover */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />

      <Card className="relative bg-card border-border group-hover:border-primary/20 rounded-2xl sm:rounded-[24px] overflow-hidden flex flex-col justify-between p-3.5 sm:p-4.5 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5 h-full">
        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          {/* Top Row: Category, Source, Time */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
                {news.category || "General"}
              </span>
              <span className="text-border">|</span>
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate max-w-[100px] sm:max-w-none">
                {news.source || "KahfNews"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-[11px] font-medium">{news.publishedAt}</span>
            </div>
          </div>

          {/* Title - Fixed 2-Line Container Height for 100% Uniform Card Heights */}
          <div className="min-h-[2.6rem] sm:min-h-[3rem] flex items-center mb-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-[1.35] tracking-tight line-clamp-2">
              <Link
                href={`/news/${news.id}`}
                className="hover:text-primary transition-colors duration-300"
              >
                {cleanMarkdown(news.title)}
              </Link>
            </h3>
          </div>

          {/* Summary - Fixed 2-Line Container Height */}
          <div className="min-h-[2.4rem] sm:min-h-[2.8rem] flex items-start mb-3">
            <p className="text-muted-foreground text-[11px] sm:text-xs leading-relaxed line-clamp-2 font-sans">
              {cleanMarkdown(news.summary)}
            </p>
          </div>

          {/* Action Bar - Single Clean "Listen Summary" CTA */}
          <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/50">
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handlePlayAudio}
                  className="h-7 sm:h-8 px-3 sm:px-3.5 bg-primary text-primary-foreground hover:opacity-90 transition-all rounded-full font-bold text-[10px] sm:text-[11px] flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Play Gemini 3.1 Flash AI Audio Briefing"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Listen Summary</span>
                </Button>
              </motion.div>

              <Link href={`/news/${news.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-border hover:bg-muted hover:border-primary/30 transition-all cursor-pointer"
                    title="Read article"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-1">
              <motion.button
                className={`p-2 transition-colors rounded-full hover:bg-muted ${
                  isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Bookmark"
                onClick={onToggleSave}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
              </motion.button>
              <motion.button
                className={`p-2 transition-colors rounded-full hover:bg-muted ${
                  isCopied ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Share"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/news/${news.id}`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                }}
                title={isCopied ? "লিংক কপি হয়েছে!" : "শেয়ার করুন"}
              >
                {isCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default NewsCard;
