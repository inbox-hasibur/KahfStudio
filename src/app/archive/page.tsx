"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive as ArchiveIcon, ArrowLeft, Clock, Search, Calendar, Filter, Sparkles, Lock, LayoutGrid, List } from "lucide-react";
import NewsCard from "@/components/NewsCard";

const MOCK_ARCHIVE = [
  {
    id: "4",
    title: "Government Announces New Infrastructure Projects for 2025",
    summary: "Major development initiatives including highway expansion and bridge construction are set to begin early next year.",
    source: "Daily Star",
    category: "National",
    priority: "high" as const,
    publishedAt: "Apr 22, 2026",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "5",
    title: "AI Revolution: How Local Businesses Are Adapting",
    summary: "Small and medium enterprises across Bangladesh are increasingly adopting artificial intelligence tools.",
    source: "Business Standard",
    category: "Technology",
    priority: "medium" as const,
    publishedAt: "Apr 21, 2026",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "6",
    title: "Weather Alert: Heavy Rain Expected in Coastal Regions",
    summary: "Meteorological Department forecasts significant rainfall in the southern districts over the next 48 hours.",
    source: "Weather BD",
    category: "Weather",
    priority: "medium" as const,
    publishedAt: "Apr 20, 2026",
    imageUrl: "https://images.unsplash.com/photo-1525088553748-01d6e210e00b?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "7",
    title: "Education Ministry Reforms Curriculum for Digital Age",
    summary: "New educational framework emphasizes coding, digital literacy, and critical thinking skills.",
    source: "Education Today",
    category: "Education",
    priority: "low" as const,
    publishedAt: "Apr 19, 2026",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "1",
    title: "Bangladesh Economy Shows Strong Growth in Q3 2024",
    summary: "GDP growth reaching 7.2%, surpassing earlier projections. Manufacturing sector led the charge.",
    source: "Financial Express",
    category: "Economy",
    priority: "high" as const,
    publishedAt: "Apr 18, 2026",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "National Cricket Team Prepares for International Series",
    summary: "Bangladesh cricket team announces squad for upcoming bilateral series against Sri Lanka.",
    source: "Sports Daily",
    category: "Sports",
    priority: "medium" as const,
    publishedAt: "Apr 17, 2026",
    imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2070&auto=format&fit=crop",
  },
];

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
  const isPremium = session?.user?.tier === "premium" || session?.user?.role === "admin";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "personalized">("general");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/register"); // Or /login if it exists
    }
  }, [status, router]);

  const toggleSave = (id: string) => {
    setSavedIds(prev => 
      prev.includes(id) ? prev.filter(savedId => savedId !== id) : [...prev, id]
    );
  };

  const filteredArchive = MOCK_ARCHIVE.filter(
    (item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      // Just simulate filtering for personalized vs general for demo purposes
      const matchesTab = activeTab === "general" || (activeTab === "personalized" && item.priority === "high");
      return matchesSearch && matchesTab;
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
      className="max-w-[1200px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
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

      {/* Header & Controls */}
      <motion.div variants={itemVariants} className="mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
              <ArchiveIcon className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Archive</h1>
              <p className="text-muted-foreground text-[14px]">
                {MOCK_ARCHIVE.length} stories saved
              </p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-[500px]">
            Browse through our history of news coverage. Every story we've curated, saved for your reference.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "general" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("personalized")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "personalized" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Sparkles className="w-4 h-4" />
              Personalized
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archive..."
            className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Archive List */}
      <motion.div variants={containerVariants} className="space-y-6 relative">
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
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
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
              <motion.div variants={itemVariants} className="py-20 text-center col-span-full">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <ArchiveIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold mb-1">No stories found</p>
                <p className="text-muted-foreground text-[14px]">
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
