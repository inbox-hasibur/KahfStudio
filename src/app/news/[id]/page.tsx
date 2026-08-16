"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Clock, Globe, ArrowLeft, Play, Share2, Bookmark, 
  ThumbsUp, MessageCircle, ExternalLink, Tag, Volume2, AlignLeft, Sparkles, Bot, ChevronUp, ChevronDown, ChevronLeft, Settings, Headphones, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioPlayer from "@/components/AudioPlayer";
import { useSession } from "@/lib/auth-client";

// Using Unsplash source for placeholder images based on category
const getPlaceholderImage = (category: string) => {
  const cat = category?.toLowerCase() || 'news';
  return `https://source.unsplash.com/800x600/?${cat},bangladesh`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;

  const [newsItem, setNewsItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [relatedStories, setRelatedStories] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"full" | "summary">("summary");
  const [isStickyExpanded, setIsStickyExpanded] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  const handleToggleBookmark = async () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    if (!userId || !id) return;

    try {
      if (nextState) {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, newsId: id }),
        });
      } else {
        await fetch(`/api/bookmarks?userId=${userId}&newsId=${id}`, {
          method: 'DELETE',
        });
      }
    } catch (e) {
      console.error("Failed to update bookmark in DB:", e);
    }
  };

  // Auto-collapse sticky bar after 3s, expand on scroll up
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY) {
        setIsStickyExpanded(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsStickyExpanded(false);
      }
      setLastScrollY(currentScrollY);
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsStickyExpanded(false);
      }, 3000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial auto-collapse
    timeout = setTimeout(() => setIsStickyExpanded(false), 3000);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [lastScrollY]);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/news/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          const item = data.data;
          setNewsItem({
            id: item.id,
            title: item.headline,
            summary: item.ai_summary || item.raw_content,
            raw_content: item.raw_content || item.content,
            category: item.category || "General",
            source: item.source || "Unknown",
            publishedAt: item.published_at || item.created_at,
            imageUrl: item.image_url || getPlaceholderImage(item.category),
            originalUrl: item.original_url,
            author: "KahfNews AI",
            readTime: "3 min read",
            tags: [item.category || "News"],
          });
        }
      } catch (err) {
        console.error("Failed to load article:", err);
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchRelated() {
      try {
        const res = await fetch(`/api/news?limit=3`);
        const data = await res.json();
        if (data.success && data.data) {
          setRelatedStories(data.data.filter((item: any) => item.id !== id).slice(0, 3));
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function checkSavedStatus() {
      if (!userId || !id) return;
      try {
        const res = await fetch(`/api/bookmarks?userId=${userId}`);
        const data = await res.json();
        if (data.success && data.savedIds) {
          setIsBookmarked(data.savedIds.includes(id));
        }
      } catch (err) {
        console.error("Failed to check saved status:", err);
      }
    }
    
    if (id) {
      fetchArticle();
      fetchRelated();
      checkSavedStatus();
    }
  }, [id, userId]);

  if (loading) {
    return (
      <main className="max-w-[800px] mx-auto px-4 md:px-6 pt-32 pb-32 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    );
  }

  if (!newsItem) {
    return (
      <main className="max-w-[800px] mx-auto px-4 md:px-6 pt-32 pb-32">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-foreground mb-4">Story Not Found</h1>
          <p className="text-muted-foreground mb-8">The story you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button className="rounded-full bg-primary text-primary-foreground px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const formattedDate = new Date(newsItem.publishedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = new Date(newsItem.publishedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const paragraphs = newsItem.summary.split("\n\n").filter(Boolean);

  const handlePlayAudio = (type: "full" | "summary") => {
    const isEnglish = typeof document !== 'undefined' && (document.cookie.includes('googtrans=/bn/en') || localStorage.getItem('kahf-language') === 'EN');
    const preferredLang = isEnglish ? 'EN' : 'BN';

    const event = new CustomEvent('play-audio', {
      detail: {
        id: newsItem.id,
        title: newsItem.title,
        summary: type === "full" ? newsItem.raw_content : newsItem.summary,
        imageUrl: newsItem.imageUrl,
        source: newsItem.source,
        preferredLang,
        preferredType: type,
        audioUrls: {
          bn_full: (newsItem as any).audio_bn_full,
          bn_summary: (newsItem as any).audio_bn_summary,
          en_full: (newsItem as any).audio_en_full,
          en_summary: (newsItem as any).audio_en_summary,
        }
      }
    });
    window.dispatchEvent(event);
  };

  const renderCleanedNewsContent = (content: string) => {
    if (!content) return <p className="text-muted-foreground italic">Full news content is not available.</p>;

    const lines = content.split('\n').filter(line => line.trim() !== '');
    const paragraphs: string[] = [];
    const images: string[] = [];
    const metadata: string[] = [];

    lines.forEach(line => {
      // Check for markdown image: ![alt](url)
      const mdImageMatch = line.match(/!\[.*?\]\((.*?)\)/);
      if (mdImageMatch) {
        images.push(mdImageMatch[1]);
        return;
      }
      
      // Check for raw image URL
      if (line.match(/^https?:\/\/.*\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
        images.push(line.trim());
        return;
      }

      // Check for common metadata-like lines
      if (line.toLowerCase().startsWith('author:') || 
          line.toLowerCase().startsWith('source:') || 
          line.toLowerCase().startsWith('published:') ||
          line.toLowerCase().startsWith('date:')) {
        metadata.push(line);
        return;
      }

      paragraphs.push(line);
    });

    return (
      <div className="space-y-3.5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-xs sm:text-sm md:text-[15px] leading-relaxed text-foreground/90 font-normal">
            {p.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
          </p>
        ))}
        
        {images.length > 0 && (
          <div className="flex flex-col gap-3 my-4">
            {images.map((img, i) => (
              <img key={i} src={img} alt="" className="w-full max-h-[260px] sm:max-h-[300px] rounded-xl object-cover border border-border shadow-sm mx-auto" />
            ))}
          </div>
        )}

        {metadata.length > 0 && (
          <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
            <h4 className="font-bold mb-2 text-foreground text-xs">Metadata / Credits</h4>
            {metadata.map((meta, i) => (
              <div key={i} className="mb-0.5 last:mb-0">{meta}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.main
      className="max-w-[860px] mx-auto px-3 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3.5 sm:mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
        </Link>
      </motion.div>

      <article>
        {/* Meta Info */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {newsItem.category}
          </span>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">
              {formattedDate} · {formattedTime}
            </span>
          </div>
          <span className="text-border">•</span>
          <span className="text-[11px] font-medium text-muted-foreground">{newsItem.readTime}</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-snug tracking-tight mb-3 sm:mb-5 notranslate"
        >
          {newsItem.title}
        </motion.h1>

        {/* View Toggle & Play Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3.5 mb-5 sm:mb-6 bg-muted/40 p-1.5 rounded-xl border border-border">
          {/* Slider Toggle */}
          <div className="relative flex items-center bg-card rounded-lg p-1 border border-border w-full sm:w-[260px] md:w-[290px] shadow-sm">
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-md shadow-sm"
              animate={{ left: activeView === "summary" ? "4px" : "calc(50% + 0px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setActiveView("summary")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold z-10 transition-colors ${
                activeView === "summary" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Summary
            </button>
            <button
              onClick={() => setActiveView("full")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold z-10 transition-colors ${
                activeView === "full" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              Full News
            </button>
          </div>

          {/* Audio Play Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              className="flex-1 sm:flex-none h-8 text-xs rounded-lg gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              onClick={() => handlePlayAudio("summary")}
            >
              <Play className="w-3 h-3 fill-current" />
              Listen Summary
            </Button>
          </div>
        </motion.div>

        {/* Author & Actions Row */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mb-6 pb-4 border-b border-border"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {newsItem.author?.split(" ").map((n: string) => n[0]).join("") || "K"}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-foreground">{newsItem.author || "KahfNews"}</p>
              <p className="text-[11px] text-muted-foreground">{newsItem.source}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              className={`p-2 rounded-full transition-colors ${isLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsLiked(!isLiked)}
              aria-label="Like"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              className={`p-2 rounded-full transition-colors ${isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleBookmark}
              aria-label="Bookmark"
              title={isBookmarked ? "সেভ করা থেকে সরান" : "খবরটি সেভ করুন"}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} />
            </motion.button>
            <motion.button
              className={`p-2 rounded-full transition-colors ${isCopied ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              aria-label="Share"
              title={isCopied ? "লিংক কপি হয়েছে!" : "শেয়ার করুন"}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          variants={itemVariants}
          className="relative w-full aspect-[21/9] max-h-[260px] sm:max-h-[320px] md:max-h-[360px] rounded-xl overflow-hidden mb-5 border border-border shadow-sm bg-muted/40"
        >
          <img
            src={newsItem.imageUrl}
            alt=""
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
        </motion.div>

        {/* Article Content */}
        <motion.div variants={itemVariants} className="mb-8 min-h-[250px]">
          {activeView === "summary" ? (
            <div className="space-y-4">
              {paragraphs.map((paragraph: string, index: number) => (
                <p
                  key={`summary-${index}`}
                  className="text-xs sm:text-sm md:text-[15px] leading-relaxed text-foreground/85 font-medium notranslate"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            renderCleanedNewsContent(newsItem.raw_content)
          )}
        </motion.div>

        {/* Tags */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-1.5 mb-6">
          {newsItem.tags?.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-border my-6" />

        {/* Source & Original Link */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Source</p>
              <p className="text-foreground font-semibold text-xs sm:text-sm">{newsItem.source}</p>
            </div>
          </div>

          <a
            href={newsItem.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-card border border-border rounded-xl font-semibold text-xs text-foreground hover:bg-muted hover:border-primary/20 transition-all active:scale-95 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Read Original Article
          </a>
        </motion.div>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <motion.div variants={itemVariants}>
            <h3 className="text-sm sm:text-base font-bold text-foreground mb-3">Related Stories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedStories.map((story) => (
                <Link key={story.id} href={`/news/${story.id}`}>
                  <motion.div
                    className="p-3 bg-card border border-border rounded-xl hover:border-primary/20 transition-all group"
                    whileHover={{ y: -2 }}
                  >
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                      {story.category || "General"}
                    </span>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-1">
                      {story.headline || story.title}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </article>

      {/* Sticky Bottom Actions Bar (Synced with Home Design System) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
        <div className="flex items-center gap-1.5 p-1.5 bg-card/90 border border-border/80 backdrop-blur-2xl rounded-full shadow-2xl">
          {/* Sphere Toggle Button (Greenish-White 3D Spinning Sphere) */}
          <button
            onClick={() => setIsStickyExpanded((prev) => !prev)}
            className="relative group w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
            title={isStickyExpanded ? "Minimize Menu" : "Expand Menu"}
          >
            {isStickyExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5 text-foreground group-hover:text-primary transition-colors" />
            ) : (
              <motion.div
                className="w-3.5 h-3.5 rounded-full relative z-10"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #ecfdf5, #10b981, #064e3b)",
                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.5), inset -1px -1px 3px rgba(0, 0, 0, 0.2)",
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </button>

          {/* Expandable Options */}
          <AnimatePresence>
            {isStickyExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                {/* 1. Listen Summary */}
                <button
                  onClick={() => handlePlayAudio("summary")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Listen Summary</span>
                </button>

                {/* 2. Listen Full News */}
                <button
                  onClick={() => handlePlayAudio("full")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-full text-xs font-semibold transition-all border border-border whitespace-nowrap cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5 text-primary" />
                  <span>Full Audio</span>
                </button>

                {/* 3. Voice Settings */}
                <button
                  onClick={() => {
                    const event = new CustomEvent("open-audio-settings");
                    window.dispatchEvent(event);
                  }}
                  className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border border-border cursor-pointer shrink-0"
                  title="Voice Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <AudioPlayer />
    </motion.main>
  );
}
