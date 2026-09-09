"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, Bookmark, Share2, Check, ExternalLink } from "lucide-react";

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

// Fallback image helper
const getPlaceholderImage = (category: string) => {
  const cat = category?.toLowerCase() || 'news';
  return `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80`;
};

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
  const router = useRouter();
  const [isCopied, setIsCopied] = React.useState(false);
  const cardImage = news.imageUrl || (news as any).image_url || getPlaceholderImage(news.category);

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
        imageUrl: cardImage,
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
      className="relative group h-full cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/news/${news.id}`)}
    >
      {/* Animated Gradient Border on Hover */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />

      <Card className="relative bg-card border-border group-hover:border-primary/20 rounded-2xl sm:rounded-[24px] overflow-hidden flex flex-col gap-0 justify-start p-3 sm:p-3.5 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5 h-full">
        {/* News Thumbnail Image Banner */}
        {cardImage && (
          <div className="block relative w-full h-38 sm:h-42 rounded-xl sm:rounded-[18px] overflow-hidden mb-2 bg-muted/40 shrink-0 group/thumb">
            <img
              src={cardImage}
              alt={cleanMarkdown(news.title)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-2.5 left-2.5 z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-sm">
                {news.category || "General"}
              </span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0 pt-0 pb-0">
          {/* Top Info: Category/Source/Time and Title */}
          <div>
            {/* Category, Clickable Source, Time */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="text-xs sm:text-[11px] font-bold uppercase tracking-wider text-primary shrink-0">
                  {news.category || "General"}
                </span>
                <span className="text-border shrink-0">|</span>
                {news.originalUrl ? (
                  <a
                    href={news.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs sm:text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors hover:underline truncate max-w-[120px] sm:max-w-none"
                    title={`মূল উৎস দেখুন (${news.source || "Source"})`}
                  >
                    {news.source || "KahfNews"}
                  </a>
                ) : (
                  <span className="text-xs sm:text-[11px] font-medium text-muted-foreground truncate max-w-[110px] sm:max-w-none">
                    {news.source || "KahfNews"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-1">
                <Clock className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-[11px] font-medium">{news.publishedAt}</span>
              </div>
            </div>

            {/* Title Only - Clear & Readable on Mobile */}
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground leading-snug tracking-tight line-clamp-2 mt-1">
              <Link
                href={`/news/${news.id}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary transition-colors duration-300"
              >
                {cleanMarkdown(news.title)}
              </Link>
            </h3>
          </div>

          {/* Action Bar - Listen Summary CTA & Source Link */}
          <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handlePlayAudio}
                  className="h-8 sm:h-8 px-3 sm:px-3.5 bg-primary text-primary-foreground hover:opacity-90 transition-all rounded-full font-bold text-xs sm:text-[11px] flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Play Gemini 3.1 Flash AI Audio Briefing"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Listen Summary</span>
                </Button>
              </motion.div>

              {news.originalUrl && (
                <a
                  href={news.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 sm:h-8 px-3 sm:px-3 rounded-full border border-border/80 hover:border-primary/40 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs sm:text-[11px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  title={`মূল উৎস (${news.source})`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Source</span>
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </a>
              )}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave?.();
                }}
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
