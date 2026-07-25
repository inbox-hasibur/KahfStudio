"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Globe, Search, TrendingUp, Sparkles, ArrowRight,
  Hash, Newspaper, Play, Clock, Flame
} from "lucide-react";

const TRENDING_TOPICS = [
  { name: "Bangladesh Economy", count: "2.4K stories", trend: "+12%" },
  { name: "AI & Technology", count: "1.8K stories", trend: "+28%" },
  { name: "Cricket Updates", count: "956 stories", trend: "+5%" },
  { name: "Climate Change", count: "743 stories", trend: "+18%" },
  { name: "Education Reform", count: "512 stories", trend: "+9%" },
  { name: "Startup Ecosystem", count: "389 stories", trend: "+45%" },
];

const CATEGORIES = [
  {
    name: "National",
    description: "Government, policy & national affairs",
    icon: "🏛️",
    count: 156,
    color: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/20",
  },
  {
    name: "Technology",
    description: "AI, startups & digital innovation",
    icon: "💻",
    count: 124,
    color: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/20",
  },
  {
    name: "Sports",
    description: "Cricket, football & athletics",
    icon: "🏏",
    count: 98,
    color: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/20",
  },
  {
    name: "Economy",
    description: "Markets, GDP & business",
    icon: "📈",
    count: 87,
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/20",
  },
  {
    name: "Weather",
    description: "Forecasts, alerts & climate",
    icon: "🌧️",
    count: 45,
    color: "from-cyan-500/20 to-cyan-600/5",
    borderColor: "border-cyan-500/20",
  },
  {
    name: "Education",
    description: "Schools, universities & reform",
    icon: "🎓",
    count: 63,
    color: "from-rose-500/20 to-rose-600/5",
    borderColor: "border-rose-500/20",
  },
];

const FEATURED_STORIES = [
  {
    id: "1",
    title: "Bangladesh Economy Shows Strong Growth in Q3 2024",
    category: "Economy",
    source: "Financial Express",
    publishedAt: "2 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "New Tech Innovations Transforming Dhaka's Startup Scene",
    category: "Technology",
    source: "Tech Bangladesh",
    publishedAt: "3 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "National Cricket Team Prepares for International Series",
    category: "Sports",
    source: "Sports Daily",
    publishedAt: "4 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "4",
    title: "Government Announces New Infrastructure Projects for 2025",
    category: "National",
    source: "Daily Star",
    publishedAt: "2 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "5",
    title: "AI Revolution: How Local Businesses Are Adapting",
    category: "Technology",
    source: "Business Standard",
    publishedAt: "4 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "6",
    title: "Weather Alert: Heavy Rain Expected in Coastal Regions",
    category: "Weather",
    source: "Weather BD",
    publishedAt: "5 hours ago",
    imageUrl: "https://images.unsplash.com/photo-1525088553748-01d6e210e00b?q=80&w=600&auto=format&fit=crop",
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

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "trending" | "categories">("all");

  const filteredStories = FEATURED_STORIES.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.main
      className="max-w-[1200px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Discover</h1>
            <p className="text-muted-foreground text-[14px]">
              Explore the latest news and updates from across Bangladesh
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stories, topics, or categories..."
            className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:shadow-lg focus:shadow-primary/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-8">
        {[
          { key: "all" as const, label: "All", icon: Newspaper },
          { key: "trending" as const, label: "Trending", icon: Flame },
          { key: "categories" as const, label: "Categories", icon: Sparkles },
        ].map((tab) => (
          <motion.button
            key={tab.key}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ALL TAB */}
        {activeTab === "all" && (
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Featured Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredStories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                >
                  <Link href={`/news/${story.id}`}>
                    <div className="group cursor-pointer">
                      <div className="relative h-[200px] rounded-2xl overflow-hidden mb-4 border border-border">
                        <img
                          src={story.imageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                            {story.category}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {story.title}
                      </h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-[12px] font-medium">{story.source}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-[11px]">{story.publishedAt}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TRENDING TAB */}
        {activeTab === "trending" && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-3">
              {TRENDING_TOPICS.map((topic, index) => (
                <motion.div
                  key={topic.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="group"
                >
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-[14px] font-bold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-primary" />
                          <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors">
                            {topic.name}
                          </h3>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{topic.count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-semibold text-emerald-500">{topic.trend}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((cat, index) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                >
                  <Link href={`/categories`}>
                    <div className={`group p-6 rounded-2xl border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer ${cat.borderColor}`}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 text-2xl`}>
                        {cat.icon}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{cat.name}</h3>
                      <p className="text-[13px] text-muted-foreground mb-3">{cat.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-muted-foreground">{cat.count} stories</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
