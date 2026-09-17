"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Filter,
  Volume2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Clock,
  Globe,
  Search,
  RefreshCw,
  Play,
  Share2,
  Bookmark,
  Check,
  Newspaper,
  Flame,
  Trash2,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

interface LiveRssFeedProps {
  isGlobal?: boolean;
  isArabic?: boolean;
  selectedCountry?: {
    code: string;
    name: string;
    flag: string;
    defaultLang: string;
  };
}

export interface StreamArticle {
  id: string;
  headline: string;
  title?: string;
  raw_content?: string;
  ai_summary?: string | null;
  image_url?: string | null;
  source: string;
  category: string;
  country?: string;
  original_url?: string;
  published_at: string;
  importance_score?: number;
  admin_id?: string;
}

const CATEGORY_MAP: Record<string, { bn: string; en: string; ar: string }> = {
  All: { bn: "সকল ক্যাটাগরি", en: "All Categories", ar: "جميع الفئات" },
  General: { bn: "সাধারণ", en: "General", ar: "عام" },
  Politics: { bn: "রাজনীতি", en: "Politics", ar: "سياسة" },
  Economy: { bn: "অর্থনীতি", en: "Economy", ar: "اقتصاد" },
  World: { bn: "আন্তর্জাতিক", en: "World / International", ar: "دولي" },
  Technology: { bn: "তথ্যপ্রযুক্তি", en: "Technology", ar: "تكنولوجيا" },
  Sports: { bn: "খেলাধুলা", en: "Sports", ar: "رياضة" },
  Entertainment: { bn: "বিনোদন", en: "Entertainment", ar: "ترفيه" },
  Education: { bn: "শিক্ষা", en: "Education", ar: "تعليم" },
  Lifestyle: { bn: "জীবনযাপন", en: "Lifestyle", ar: "نمط حياة" },
};

// Relative time formatter
function formatRelativeTime(dateStr: string, isArabic = false, isGlobal = false): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (isArabic) {
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return `منذ ${diffDays} يوم`;
    }
    if (isGlobal) {
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    }
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
    return `${diffDays} দিন আগে`;
  } catch (e) {
    return isArabic ? "حديثاً" : isGlobal ? "Recent" : "সম্প্রতি";
  }
}

// Fallback image helper
const getPlaceholderImage = (category: string) => {
  const cat = (category || "news").toLowerCase();
  if (cat.includes("tech")) return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
  if (cat.includes("sport")) return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80";
  if (cat.includes("econ") || cat.includes("business")) return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80";
};

export default function LiveRssFeed({ isGlobal = false, isArabic = false, selectedCountry }: LiveRssFeedProps) {
  const countryCode = selectedCountry?.code || "BD";
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const isAdmin = (sessionData?.user as any)?.role === "admin";

  const router = useRouter();
  const [articles, setArticles] = useState<StreamArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Fetch bookmarks on load
  useEffect(() => {
    if (!userId) return;
    const fetchBookmarks = () => {
      fetch(`/api/bookmarks?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.savedIds) setSavedIds(data.savedIds);
        })
        .catch(() => {});
    };
    fetchBookmarks();

    const handleSync = () => fetchBookmarks();
    window.addEventListener("bookmarks-changed", handleSync);
    return () => window.removeEventListener("bookmarks-changed", handleSync);
  }, [userId]);

  const handleToggleSave = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push("/register");
      return;
    }

    const isCurrentlySaved = savedIds.includes(id);
    setSavedIds((prev) =>
      isCurrentlySaved ? prev.filter((s) => s !== id) : [...prev, id]
    );

    try {
      if (!isCurrentlySaved) {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newsId: id }),
        });
      } else {
        await fetch(`/api/bookmarks?userId=${userId}&newsId=${id}`, { method: "DELETE" });
      }
      window.dispatchEvent(new CustomEvent("bookmarks-changed"));
    } catch (e) {
      setSavedIds((prev) =>
        isCurrentlySaved ? [...prev, id] : prev.filter((s) => s !== id)
      );
    }
  };

  const handleDeleteArticle = async (articleId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this news article?")) return;

    // Optimistic UI update: immediately remove from feed
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("article-deleted", { detail: { id: articleId } }));
    }

    try {
      const res = await fetch(`/api/news?id=${articleId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to delete article");
      }
    } catch (err) {
      console.error("Delete article failed:", err);
    }
  };

  // Cross-component deletion synchronization
  useEffect(() => {
    const handleArticleDeleted = (e: CustomEvent) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setArticles((prev) => prev.filter((a) => a.id !== deletedId));
      }
    };
    window.addEventListener("article-deleted", handleArticleDeleted as EventListener);
    return () => {
      window.removeEventListener("article-deleted", handleArticleDeleted as EventListener);
    };
  }, []);

  // Fetch articles synchronized with current country/region
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (countryCode && countryCode.toUpperCase() !== "ALL") {
      params.set("country", countryCode);
    }
    // Fetch a generous pool of up to 100 articles
    params.set("limit", "100");
    params.set("sort", "date");

    fetch(`/api/news?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setArticles(data.data || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Live RSS Feed fetch error:", err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [countryCode]);

  // Extract distinct available sources
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.source) set.add(a.source.trim());
    });
    return Array.from(set).sort();
  }, [articles]);

  // Extract distinct available categories for current source
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const pool = selectedSource === "All" ? articles : articles.filter((a) => a.source === selectedSource);
    pool.forEach((a) => {
      if (a.category) set.add(a.category.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [articles, selectedSource]);

  // Filter articles based on source, category, and search query
  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      // 1. Source filter
      if (selectedSource !== "All" && item.source !== selectedSource) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== "All") {
        const itemCat = (item.category || "").toLowerCase();
        const targetCat = selectedCategory.toLowerCase();
        if (itemCat !== targetCat) {
          // Check category translation matches
          const mapped = CATEGORY_MAP[selectedCategory];
          if (!mapped || (mapped.en.toLowerCase() !== itemCat && mapped.bn.toLowerCase() !== itemCat)) {
            return false;
          }
        }
      }
      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (item.headline || item.title || "").toLowerCase();
        const content = (item.raw_content || "").toLowerCase();
        const source = (item.source || "").toLowerCase();
        if (!title.includes(q) && !content.includes(q) && !source.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, selectedSource, selectedCategory, searchQuery]);

  const displayedArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = filteredArticles.length > visibleCount;

  // Handle Play via Device Native WebSpeech TTS (Zero Gemini quota)
  const handlePlayNativeAudio = (item: StreamArticle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanTitle = (item.headline || item.title || "")
      .replace(/[*_#`[\]()]/g, "")
      .trim();
    const cleanContent = (item.raw_content || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[*_#`[\]()]/g, "")
      .slice(0, 1500)
      .trim();

    const preferredLang = isArabic ? "AR" : isGlobal ? "EN" : "BN";

    const event = new CustomEvent("play-audio", {
      detail: {
        id: item.id,
        title: cleanTitle,
        summary: cleanTitle,
        raw_content: cleanContent || cleanTitle,
        imageUrl: item.image_url || getPlaceholderImage(item.category),
        source: `${item.source || "RSS"} (Live Stream)`,
        preferredLang,
        preferredType: "full",
        audioUrls: {}, // Empty audioUrls signals the player to use Native WebSpeech TTS!
      },
    });
    window.dispatchEvent(event);
  };

  const handleShare = (item: StreamArticle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(item.original_url || `${window.location.origin}/news/${item.id}`);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <section className="w-full mb-10 mt-8 pt-6 border-t border-border/70">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 shrink-0 shadow-sm">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-sans font-bold text-foreground tracking-tight">
                {isArabic
                  ? "البث المباشر لجميع الأخبار والـ RSS"
                  : isGlobal
                  ? "Live All News & RSS Stream"
                  : "লাইভ সব সংবাদ ও আরএসএস স্ট্রিম"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                LIVE {selectedCountry?.flag || "🇧🇩"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isArabic
                ? "تغذية إخبارية فورية من جميع المصادر المعتمدة مباشرة بدون تلخيص"
                : isGlobal
                ? "Continuous live feed aggregated directly from verified regional news sources"
                : "যাচাইকৃত সকল সোর্স থেকে সরাসরি প্রাপ্ত সমস্ত খবরের তাৎক্ষণিক আনকাট স্ট্রিম"}
            </p>
          </div>
        </div>

        {/* Source & Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[170px] sm:min-w-[210px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "بحث في الأخبار..." : isGlobal ? "Search live stream..." : "সংবাদ খুঁজুন..."}
              className="w-full h-9 pl-8 pr-3 text-xs bg-muted/40 border border-border/80 focus:border-primary/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none transition-all"
            />
          </div>

          {/* Source Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSourceDropdownOpen((prev) => !prev)}
              className="h-9 px-3.5 bg-card hover:bg-muted/70 border border-border/80 hover:border-primary/40 rounded-xl text-xs font-semibold text-foreground flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[150px]">
                {selectedSource === "All"
                  ? isArabic
                    ? "جميع المصادر"
                    : isGlobal
                    ? "All Sources"
                    : "সকল সোর্স"
                  : selectedSource}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isSourceDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isSourceDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSourceDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-56 max-h-64 overflow-y-auto custom-scrollbar bg-card/95 backdrop-blur-xl border border-border/90 rounded-2xl shadow-2xl p-1.5 z-50 text-foreground"
                  >
                    <div
                      onClick={() => {
                        setSelectedSource("All");
                        setIsSourceDropdownOpen(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
                        selectedSource === "All"
                          ? "bg-primary text-primary-foreground font-bold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{isArabic ? "جميع المصادر" : isGlobal ? "All Sources" : "সকল সোর্স"}</span>
                      <span className="text-[10px] opacity-80">({articles.length})</span>
                    </div>

                    {availableSources.map((src) => {
                      const count = articles.filter((a) => a.source === src).length;
                      return (
                        <div
                          key={src}
                          onClick={() => {
                            setSelectedSource(src);
                            setSelectedCategory("All");
                            setIsSourceDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
                            selectedSource === src
                              ? "bg-primary text-primary-foreground font-bold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="truncate pr-2">{src}</span>
                          <span className="text-[10px] opacity-75 shrink-0">({count})</span>
                        </div>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      {availableCategories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 no-scrollbar">
          {availableCategories.map((cat) => {
            const label =
              cat === "All"
                ? isArabic
                  ? "الكل"
                  : isGlobal
                  ? "All"
                  : "সব"
                : (CATEGORY_MAP[cat]?.[isArabic ? "ar" : isGlobal ? "en" : "bn"] || cat);

            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl bg-muted/40 animate-pulse border border-border/60"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedArticles.length === 0 && (
        <div className="py-16 text-center bg-card/40 border border-dashed border-border rounded-3xl p-6">
          <Newspaper className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {isArabic
              ? "لا توجد أخبار مطابقة للتصفية الحالية"
              : isGlobal
              ? "No live stream news matching your filter"
              : "এই ফিল্টারে কোনো লাইভ সংবাদ পাওয়া যায়নি"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {isArabic
              ? "جرب اختيار مصدر مختلف أو مسح كلمة البحث"
              : isGlobal
              ? "Try selecting a different source or clearing the search keyword."
              : "অন্য কোনো সোর্স নির্বাচন করুন অথবা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।"}
          </p>
          {(selectedSource !== "All" || selectedCategory !== "All" || searchQuery) && (
            <Button
              onClick={() => {
                setSelectedSource("All");
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* Articles Grid (Using our solid NewsCard aesthetic) */}
      {!loading && displayedArticles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {displayedArticles.map((article) => {
            const cardImg = article.image_url || getPlaceholderImage(article.category);
            const timeAgo = formatRelativeTime(article.published_at, isArabic, isGlobal);

            return (
              <motion.div
                key={article.id}
                className="relative group h-full flex flex-col cursor-pointer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
              >
                {/* Glow border effect on hover */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" />

                <Card className="relative bg-card border-border/80 group-hover:border-primary/30 rounded-2xl overflow-hidden flex flex-col justify-between p-3 transition-all duration-300 shadow-sm hover:shadow-lg h-full">
                  {/* Thumbnail Image */}
                  {cardImg && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden mb-2.5 bg-muted/40 shrink-0 group/thumb">
                      <img
                        src={cardImg}
                        alt={article.headline || article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {article.category || "General"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Meta info: Source & Time */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-foreground truncate" title={article.source}>
                            {article.source || "RSS"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground/80">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo}</span>
                        </div>
                      </div>

                      {/* Headline (Uncut raw RSS headline) */}
                      <h3 className="text-sm font-bold text-foreground leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
                        <Link href={`/news/${article.id}`}>
                          {article.headline || article.title}
                        </Link>
                      </h3>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                      {/* Listen Button (Device Native WebSpeech TTS - Zero Gemini Quota) */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={(e) => handlePlayNativeAudio(article, e)}
                          size="sm"
                          className="h-7 px-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/25 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                          title="Play via Device Native WebSpeech TTS (Male Voice)"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isArabic ? "استمع" : isGlobal ? "Listen" : "শুনুন"}</span>
                        </Button>

                        {/* Direct Source Link + Copy Button */}
                        {article.original_url && (
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={article.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 px-2.5 rounded-full border border-border/80 hover:border-primary/40 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium inline-flex items-center gap-1 transition-all"
                              title={`Open original story at ${article.source}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{isArabic ? "المصدر" : "Source"}</span>
                              <ExternalLink className="w-3 h-3 text-primary" />
                            </a>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (typeof window !== "undefined") {
                                  await navigator.clipboard.writeText(article.original_url!);
                                  setCopiedSourceId(article.id);
                                  setTimeout(() => setCopiedSourceId(null), 2000);
                                }
                              }}
                              className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                copiedSourceId === article.id
                                  ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40"
                                  : "border-border/80 hover:border-primary/40 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                              title={copiedSourceId === article.id ? "উৎস লিংক কপি হয়েছে!" : "Copy Source Link"}
                            >
                              {copiedSourceId === article.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Secondary Actions: Bookmark, Share, Delete */}
                      <div className="flex items-center gap-0.5">
                        {/* Bookmark / Save Button */}
                        <button
                          onClick={(e) => handleToggleSave(article.id, e)}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            savedIds.includes(article.id)
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title={savedIds.includes(article.id) ? "সংরক্ষিত (Saved)" : "সংরক্ষণ করুন (Save to Archive)"}
                        >
                          <Bookmark className="w-3.5 h-3.5" fill={savedIds.includes(article.id) ? "currentColor" : "none"} />
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={(e) => handleShare(article, e)}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            copiedId === article.id
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title={copiedId === article.id ? "Copied!" : "Share Link"}
                        >
                          {copiedId === article.id ? (
                            <Check className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Admin Direct Delete Button */}
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDeleteArticle(article.id, e)}
                            className="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-red-500 hover:bg-red-500/15 cursor-pointer"
                            title="সংবাদ মুছে ফেলুন (Admin Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            variant="outline"
            className="px-6 py-2 rounded-full border-border/90 hover:border-primary/40 bg-card hover:bg-muted text-xs font-bold text-foreground transition-all shadow-sm cursor-pointer"
          >
            {isArabic
              ? `عرض المزيد (${filteredArticles.length - visibleCount} متبقية)`
              : isGlobal
              ? `Load More Stories (${filteredArticles.length - visibleCount} remaining)`
              : `আরও সংবাদ দেখুন (${filteredArticles.length - visibleCount}টি বাকি)`}
          </Button>
        </div>
      )}
    </section>
  );
}
