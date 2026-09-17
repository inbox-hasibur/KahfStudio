"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Archive as ArchiveIcon, 
  ArrowLeft, 
  Search, 
  Globe, 
  Tag, 
  Radio, 
  Calendar, 
  Sparkles, 
  Lock, 
  LayoutGrid, 
  List, 
  Bookmark, 
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import NewsCard from "@/components/NewsCard";

const getPlaceholderImage = (category: string) => {
  const cat = category?.toLowerCase() || 'news';
  return `https://source.unsplash.com/800x600/?${cat},news`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function detectLanguage(headline: string, rawContent: string, country?: string): "bn" | "ar" | "en" {
  const sample = `${headline || ""} ${rawContent?.slice(0, 300) || ""}`;
  if (/[\u0600-\u06FF]/.test(sample)) return "ar";
  if (/[\u0980-\u09FF]/.test(sample) || country?.toUpperCase() === "BD") return "bn";
  return "en";
}

export default function ArchivePage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const isPremium = (session?.user as any)?.tier === "premium" || (session?.user as any)?.role === "admin";
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "personalized" | "saved">("general");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // 4 Dedicated Filter Dropdowns (Synced Country Edition)
  const [selectedCountry, setSelectedCountry] = useState<string>("BD");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");

  // Sync default country from user's current edition in localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCountry = localStorage.getItem("kahf_user_country") || "BD";
      setSelectedCountry(savedCountry);
    }
  }, []);

  // Listen to cross-app country changes
  React.useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail?.country) setSelectedCountry(e.detail.country);
      else {
        const saved = localStorage.getItem("kahf_user_country");
        if (saved) setSelectedCountry(saved);
      }
    };
    window.addEventListener("kahf-country-changed", handleCountryChange as EventListener);
    return () => window.removeEventListener("kahf-country-changed", handleCountryChange as EventListener);
  }, []);

  const [articles, setArticles] = useState<any[]>([]);
  const [savedArticles, setSavedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const mapArticle = React.useCallback((item: any) => {
    const lang = detectLanguage(item.headline, item.raw_content, item.country);
    return {
      id: item.id,
      title: item.headline,
      summary: item.ai_summary || item.raw_content,
      category: item.category || "General",
      source: item.source || "KahfNews",
      country: item.country || "GLOBAL",
      language: lang,
      priority: "medium",
      publishedAt: new Date(item.published_at || item.created_at).toLocaleDateString(),
      imageUrl: item.image_url || getPlaceholderImage(item.category),
      rawDate: new Date(item.published_at || item.created_at),
      isPersonalized: item.is_personalized || item.type === 'personalized' || false,
      audio_bn_full: item.audio_bn_full,
      audio_bn_summary: item.audio_bn_summary,
      audio_en_full: item.audio_en_full,
      audio_en_summary: item.audio_en_summary,
    };
  }, []);

  React.useEffect(() => {
    async function fetchArchive() {
      try {
        setLoading(true);
        const countryParam = selectedCountry && selectedCountry !== "all" ? `&country=${encodeURIComponent(selectedCountry)}` : "";
        const res = await fetch(`/api/news?limit=150${countryParam}`);
        const data = await res.json();
        if (data.success && data.data) {
          const mapped = data.data.map(mapArticle);
          setArticles(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch archive:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchArchive();
  }, [selectedCountry, mapArticle]);

  const fetchSavedBookmarks = React.useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/bookmarks?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        if (data.savedIds) setSavedIds(data.savedIds);
        if (data.data) {
          setSavedArticles(data.data.map(mapArticle));
        }
      }
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  }, [userId, mapArticle]);

  React.useEffect(() => {
    fetchSavedBookmarks();
  }, [fetchSavedBookmarks]);

  // Cross-component bookmark synchronization
  React.useEffect(() => {
    const handleSync = () => fetchSavedBookmarks();
    window.addEventListener("bookmarks-changed", handleSync);
    return () => window.removeEventListener("bookmarks-changed", handleSync);
  }, [fetchSavedBookmarks]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/register");
    }
  }, [status, router]);

  const toggleSave = async (id: string) => {
    const isCurrentlySaved = savedIds.includes(id);
    // Optimistic update
    setSavedIds((prev) =>
      isCurrentlySaved ? prev.filter((savedId) => savedId !== id) : [...prev, id]
    );
    if (isCurrentlySaved) {
      setSavedArticles((prev) => prev.filter((a) => a.id !== id));
    }

    if (!userId) return;

    try {
      if (!isCurrentlySaved) {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newsId: id }),
        });
      } else {
        await fetch(`/api/bookmarks?userId=${userId}&newsId=${id}`, {
          method: "DELETE",
        });
      }
      window.dispatchEvent(new CustomEvent("bookmarks-changed"));
    } catch (e) {
      console.error("Failed to toggle bookmark in DB:", e);
      fetchSavedBookmarks();
    }
  };

  // Distinct categories and sources from loaded articles
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const list = activeTab === "saved" ? savedArticles : articles;
    list.forEach((a) => {
      if (a.category) set.add(a.category.trim());
    });
    return Array.from(set).sort();
  }, [articles, savedArticles, activeTab]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    const list = activeTab === "saved" ? savedArticles : articles;
    list.forEach((a) => {
      if (a.source) set.add(a.source.trim());
    });
    return Array.from(set).sort();
  }, [articles, savedArticles, activeTab]);

  const resetFilters = () => {
    setSelectedCountry("all");
    setSelectedCategory("all");
    setSelectedSource("all");
    setSelectedDateRange("all");
    setSearchQuery("");
  };

  const hasActiveFilters = 
    selectedCountry !== "all" || 
    selectedCategory !== "all" || 
    selectedSource !== "all" || 
    selectedDateRange !== "all" || 
    searchQuery.trim().length > 0;

  // Filtered Archive
  const filteredArchive = useMemo(() => {
    const now = new Date().getTime();
    const sourceList = activeTab === "saved" ? savedArticles : articles;

    return sourceList.filter((item) => {
      // 1. Tab filter
      if (activeTab === "saved") {
        if (!savedIds.includes(item.id)) return false;
      } else if (activeTab === "personalized") {
        if (!item.isPersonalized) return false;
      } else {
        if (item.isPersonalized) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.title?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.source?.toLowerCase().includes(q) ||
          item.summary?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 3. Country / Edition filter (only if activeTab is not saved, or if user explicitly filtered in saved)
      if (selectedCountry !== "all") {
        const itemCountry = (item.country || "BD").toUpperCase();
        if (itemCountry !== selectedCountry.toUpperCase()) return false;
      }

      // 4. Category filter
      if (selectedCategory !== "all") {
        if (item.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // 5. Source filter
      if (selectedSource !== "all") {
        if (item.source?.toLowerCase() !== selectedSource.toLowerCase()) return false;
      }

      // 6. Date Range filter
      if (selectedDateRange !== "all" && item.rawDate) {
        const itemTime = new Date(item.rawDate).getTime();
        const diffHours = (now - itemTime) / (1000 * 60 * 60);

        if (selectedDateRange === "today") {
          if (diffHours > 24) return false;
        } else if (selectedDateRange === "week") {
          if (diffHours > 24 * 7) return false;
        } else if (selectedDateRange === "month") {
          if (diffHours > 24 * 30) return false;
        } else if (selectedDateRange === "older") {
          if (diffHours <= 24 * 30) return false;
        }
      }

      return true;
    });
  }, [articles, savedArticles, activeTab, savedIds, searchQuery, selectedCountry, selectedCategory, selectedSource, selectedDateRange]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.main
      className="max-w-[1240px] mx-auto px-3 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
        </Link>
      </motion.div>

      {/* Header & View Controls */}
      <motion.div variants={itemVariants} className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <ArchiveIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Archive Explorer</h1>
              <p className="text-muted-foreground text-xs sm:text-[13px]">
                {articles.length} total curated stories across Bangladesh, Global & Middle East
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-[600px] leading-relaxed">
            Filter articles by language, category, news agency, and date to easily locate past coverage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "general" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("personalized")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "personalized" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Personalized
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "saved" 
                  ? "bg-emerald-600 text-white shadow-sm font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" fill={activeTab === "saved" ? "currentColor" : "none"} />
              Saved ({savedArticles.length})
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4 Dedicated Dropdowns + Search Bar */}
      <motion.div variants={itemVariants} className="mb-6 p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border shadow-xs space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archive by headline, topic, or source..."
            className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 4 Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Country / Edition Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-primary" />
              Country / Edition
            </label>
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCountry(val);
                  if (typeof window !== "undefined" && val !== "all") {
                    localStorage.setItem("kahf_user_country", val);
                    window.dispatchEvent(new CustomEvent("kahf-country-changed", { detail: { country: val } }));
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-medium"
              >
                <option value="all">🌍 All Editions</option>
                <option value="BD">🇧🇩 বাংলাদেশ (BD)</option>
                <option value="GLOBAL">🌐 আন্তর্জাতিক (GLOBAL)</option>
                <option value="UK">🇬🇧 যুক্তরাজ্য (UK)</option>
                <option value="SA">🇸🇦 المملكة العربية السعودية (SA)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-primary" />
              Category / Topic
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-medium capitalize"
              >
                <option value="all">📁 All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 3. News Source Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-primary" />
              News Source
            </label>
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-medium"
              >
                <option value="all">📡 All Sources</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 4. Date Range Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-primary" />
              Date Published
            </label>
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-medium"
              >
                <option value="all">🗓️ All Time</option>
                <option value="today">⚡ Last 24 Hours</option>
                <option value="week">📅 Past 7 Days</option>
                <option value="month">📆 Past 30 Days</option>
                <option value="older">⌛ Older than 1 Month</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{filteredArchive.length}</span> of {activeTab === "saved" ? savedArticles.length : articles.length} articles
            {selectedCountry && (
              <span className="ml-2 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px]">
                {selectedCountry === 'BD' ? '🇧🇩 Bangladesh' : selectedCountry === 'GLOBAL' ? '🌍 Global' : selectedCountry === 'UK' ? '🇬🇧 UK' : '🇸🇦 Saudi Arabia'}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="ml-1.5 px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold text-[11px] capitalize">
                {selectedCategory}
              </span>
            )}
            {selectedSource !== 'all' && (
              <span className="ml-1.5 px-2 py-0.5 rounded-md bg-muted text-foreground font-semibold text-[11px]">
                {selectedSource}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </motion.div>

      {/* Archive List / Grid */}
      <motion.div variants={containerVariants} className="space-y-4 relative">
        {activeTab === "personalized" && !isPremium ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl py-20 border border-border/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-center text-sm">
              Upgrade to premium to access AI-curated personalized news matching your exact interests.
            </p>
            <Link href="/pricing" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity">
              Upgrade to Premium
            </Link>
          </div>
        ) : null}

        <div className={activeTab === "personalized" && !isPremium ? "opacity-30 pointer-events-none select-none blur-sm" : ""}>
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5" : "space-y-3 sm:space-y-3.5"}>
            {loading ? (
              <div className="py-20 text-center col-span-full text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Loading archive articles...
              </div>
            ) : filteredArchive.length > 0 ? (
              filteredArchive.map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <NewsCard 
                    news={item} 
                    isSaved={savedIds.includes(item.id)} 
                    onToggleSave={() => toggleSave(item.id)} 
                  />
                </motion.div>
              ))
            ) : (
              <motion.div variants={itemVariants} className="py-16 text-center col-span-full">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <ArchiveIcon className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold mb-1 text-sm">No stories match your criteria</p>
                <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
                  Try adjusting or clearing your filters (Language, Category, Source, or Date) to explore more archived stories.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Reset All Filters
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.main>
  );
}
