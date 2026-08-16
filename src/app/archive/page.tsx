"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive as ArchiveIcon, ArrowLeft, Clock, Search, Calendar, Filter, Sparkles, Lock, LayoutGrid, List, Bookmark } from "lucide-react";
import NewsCard from "@/components/NewsCard";

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

export default function ArchivePage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const isPremium = (session?.user as any)?.tier === "premium" || (session?.user as any)?.role === "admin";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "personalized" | "saved">("general");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetchArchive() {
      try {
        const res = await fetch("/api/news?limit=100");
        const data = await res.json();
        if (data.success && data.data) {
          const mapped = data.data.map((item: any) => ({
            id: item.id,
            title: item.headline,
            summary: item.ai_summary || item.raw_content,
            category: item.category || "General",
            source: item.source || "KahfNews",
            priority: "medium",
            publishedAt: new Date(item.published_at || item.created_at).toLocaleDateString(),
            imageUrl: item.image_url || getPlaceholderImage(item.category),
            rawDate: new Date(item.published_at || item.created_at),
            isPersonalized: item.is_personalized || item.type === 'personalized' || false,
            audio_bn_full: item.audio_bn_full,
            audio_bn_summary: item.audio_bn_summary,
            audio_en_full: item.audio_en_full,
            audio_en_summary: item.audio_en_summary,
          }));
          setArticles(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch archive:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchArchive();
  }, []);

  React.useEffect(() => {
    async function fetchSavedBookmarks() {
      if (!userId) return;
      try {
        const res = await fetch(`/api/bookmarks?userId=${userId}`);
        const data = await res.json();
        if (data.success && data.savedIds) {
          setSavedIds(data.savedIds);
        }
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
      }
    }
    fetchSavedBookmarks();
  }, [userId]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/register"); // Or /login if it exists
    }
  }, [status, router]);

  const toggleSave = async (id: string) => {
    const isCurrentlySaved = savedIds.includes(id);
    setSavedIds(prev => 
      isCurrentlySaved ? prev.filter(savedId => savedId !== id) : [...prev, id]
    );

    if (!userId) return;

    try {
      if (!isCurrentlySaved) {
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
      console.error("Failed to toggle bookmark in DB:", e);
    }
  };

  const filteredArchive = articles.filter(
    (item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "saved") {
        return savedIds.includes(item.id);
      } else if (activeTab === "personalized") {
        return !!item.isPersonalized;
      } else {
        return !item.isPersonalized;
      }
    }
  );

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.main
      className="max-w-[1200px] mx-auto px-2.5 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-2.5 sm:mb-3.5 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
        </Link>
      </motion.div>

      {/* Header & Controls */}
      <motion.div variants={itemVariants} className="mb-3 sm:mb-4 flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <ArchiveIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Archive</h1>
              <p className="text-muted-foreground text-xs sm:text-[13px]">
                {articles.length} stories saved
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-[500px] leading-relaxed">
            Browse through our history of news coverage. Every story we've curated, saved for your reference.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Tabs */}
          <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === "general" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("personalized")}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "personalized" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Personalized
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "saved" ? "bg-amber-500 text-white shadow-sm font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Bookmark className="w-3.5 h-3.5" fill={activeTab === "saved" ? "currentColor" : "none"} />
              Saved ({savedIds.length})
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="mb-3 sm:mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archive..."
            className="w-full bg-card border border-border rounded-xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Archive List / Grid (Synced Tight Spacing) */}
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
            {filteredArchive.length > 0 ? (
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
                <p className="text-foreground font-semibold mb-1 text-sm">No stories found</p>
                <p className="text-muted-foreground text-xs">
                  Try adjusting your search to find what you're looking for.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.main>
  );
}
