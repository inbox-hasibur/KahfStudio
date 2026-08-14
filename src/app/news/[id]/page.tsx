"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Clock, Globe, ArrowLeft, Play, Share2, Bookmark, 
  ThumbsUp, MessageCircle, ExternalLink, Tag, Volume2, AlignLeft, Sparkles, Bot, ChevronUp, ChevronDown, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioPlayer from "@/components/AudioPlayer";

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
  const [newsItem, setNewsItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [relatedStories, setRelatedStories] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"full" | "summary">("summary");
  const [isStickyExpanded, setIsStickyExpanded] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
    
    if (id) {
      fetchArticle();
      fetchRelated();
    }
  }, [id]);

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
      <div className="space-y-6">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[17px] md:text-[18px] leading-[1.8] text-foreground/85 font-medium">
            {p}
          </p>
        ))}
        
        {images.length > 0 && (
          <div className="flex flex-col gap-4 my-8">
            {images.map((img, i) => (
              <img key={i} src={img} alt={`Article image ${i + 1}`} className="w-full rounded-2xl object-cover border border-border shadow-sm" />
            ))}
          </div>
        )}

        {metadata.length > 0 && (
          <div className="mt-10 p-5 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
            <h4 className="font-bold mb-3 text-foreground">Metadata / Credits</h4>
            {metadata.map((meta, i) => (
              <div key={i} className="mb-1 last:mb-0">{meta}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.main
      className="max-w-[860px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
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
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-[1.25] tracking-tight mb-4 sm:mb-6"
        >
          {newsItem.title}
        </motion.h1>

        {/* View Toggle & Play Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-6 sm:mb-8 bg-muted/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-border">
          {/* Slider Toggle */}
          <div className="relative flex items-center bg-card rounded-lg sm:rounded-xl p-1 border border-border w-full sm:w-[280px] md:w-[320px] shadow-sm">
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-md sm:rounded-lg shadow-sm"
              animate={{ left: activeView === "summary" ? "4px" : "calc(50% + 0px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setActiveView("summary")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold z-10 transition-colors ${
                activeView === "summary" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Summary
            </button>
            <button
              onClick={() => setActiveView("full")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold z-10 transition-colors ${
                activeView === "full" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              Full News
            </button>
          </div>

          {/* Audio Play Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              className="flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
              onClick={() => handlePlayAudio("summary")}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Listen Summary
            </Button>
          </div>
        </motion.div>

        {/* Author & Actions Row */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mb-8 pb-6 border-b border-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {newsItem.author?.split(" ").map((n: string) => n[0]).join("") || "K"}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{newsItem.author || "KahfNews"}</p>
              <p className="text-[12px] text-muted-foreground">{newsItem.source}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              className={`p-2.5 rounded-full transition-colors ${isLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsLiked(!isLiked)}
              aria-label="Like"
            >
              <ThumbsUp className="w-4 h-4" />
            </motion.button>
            <motion.button
              className={`p-2.5 rounded-full transition-colors ${isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsBookmarked(!isBookmarked)}
              aria-label="Bookmark"
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
            </motion.button>
            <motion.button
              className="p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          variants={itemVariants}
          className="relative w-full aspect-video rounded-[24px] overflow-hidden mb-10 border border-border"
        >
          <img
            src={newsItem.imageUrl}
            alt={newsItem.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </motion.div>



        {/* Article Content */}
        <motion.div variants={itemVariants} className="mb-10 min-h-[300px]">
          {activeView === "summary" ? (
            <div className="space-y-6">
              {paragraphs.map((paragraph: string, index: number) => (
                <p
                  key={`summary-${index}`}
                  className="text-[17px] md:text-[18px] leading-[1.8] text-foreground/85 font-medium"
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
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
          {newsItem.tags?.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-border my-8" />

        {/* Source & Original Link */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</p>
              <p className="text-foreground font-semibold">{newsItem.source}</p>
            </div>
          </div>

          <a
            href={newsItem.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-full font-semibold text-[13px] text-foreground hover:bg-muted hover:border-primary/20 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Read Original Article
          </a>
        </motion.div>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-bold text-foreground mb-4">Related Stories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedStories.map((story) => (
                <Link key={story.id} href={`/news/${story.id}`}>
                  <motion.div
                    className="p-4 bg-card border border-border rounded-2xl hover:border-primary/20 transition-all group"
                    whileHover={{ y: -2 }}
                  >
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {story.category || "General"}
                    </span>
                    <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-1.5">
                      {story.headline || story.title}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </article>

      {/* Sticky Bottom Collapsible Action Bar */}
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        onMouseEnter={() => setIsStickyExpanded(true)}
        onMouseLeave={() => setIsStickyExpanded(false)}
      >
        <motion.div
          className="bg-black/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl flex items-center overflow-hidden cursor-pointer"
          animate={{
            width: isStickyExpanded ? "auto" : "56px",
            height: "56px",
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Expanded Content */}
          <div className="flex items-center gap-1.5 px-1 whitespace-nowrap opacity-100" style={{ display: isStickyExpanded ? 'flex' : 'none' }}>
            <Button 
              variant="ghost" 
              className="rounded-full text-white hover:bg-white/10 hover:text-white font-semibold text-[13px] h-11 px-4"
              onClick={() => handlePlayAudio("full")}
            >
              <Play className="w-4 h-4 mr-1.5" /> Full News
            </Button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <Button 
              variant="ghost" 
              className="rounded-full text-white hover:bg-white/10 hover:text-white font-semibold text-[13px] h-11 px-4"
              onClick={() => handlePlayAudio("summary")}
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Summary
            </Button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <Button 
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[13px] h-11 px-5 shadow-lg shadow-primary/20"
              onClick={() => alert("Chat feature coming soon!")}
            >
              <Bot className="w-4 h-4 mr-1.5" /> Chat with News
            </Button>
            
            <div className="w-px h-6 bg-white/20 mx-1" />
            
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:text-primary bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => {
                const event = new CustomEvent('open-audio-settings');
                window.dispatchEvent(event);
              }}
              title="Voice Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsed Content (3 animated dots like listening) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-100 gap-1" style={{ display: !isStickyExpanded ? 'flex' : 'none' }}>
            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
          </div>
        </motion.div>
      </motion.div>
      
      <AudioPlayer />
    </motion.main>
  );
}
