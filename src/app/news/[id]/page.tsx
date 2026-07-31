"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Clock, Globe, ArrowLeft, Play, Share2, Bookmark, 
  ThumbsUp, MessageCircle, ExternalLink, Tag, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const handlePlayAudio = () => {
    const event = new CustomEvent('play-audio', {
      detail: {
        title: newsItem.title,
        summary: newsItem.summary
      }
    });
    window.dispatchEvent(event);
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
          className="text-[28px] md:text-[40px] lg:text-[48px] font-bold text-foreground leading-[1.1] tracking-tight mb-6"
        >
          {newsItem.title}
        </motion.h1>

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

        {/* Listen Card */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between p-5 bg-primary/5 rounded-2xl border border-primary/10 mb-10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Listen to this story
              </p>
              <p className="text-foreground font-semibold">AI Voice Briefing</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handlePlayAudio} className="bg-primary text-primary-foreground hover:opacity-90 rounded-full font-bold px-6 gap-2">
              <Play className="w-4 h-4 fill-current" />
              Play
            </Button>
          </motion.div>
        </motion.div>

        {/* Article Content */}
        <motion.div variants={itemVariants} className="mb-10">
          {paragraphs.map((paragraph: string, index: number) => (
            <p
              key={index}
              className="text-[17px] md:text-[18px] leading-[1.7] text-foreground/80 font-medium mb-6 last:mb-0"
            >
              {paragraph}
            </p>
          ))}
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
    </motion.main>
  );
}
