"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NewsCard from "./NewsCard";
import { Sparkles, Compass } from "lucide-react";

interface MainFeedProps {
  newsItems: any[];
}

const CATEGORIES = [
  { label: "সর্বশেষ", en: "Latest", keywords: [] },
  { label: "বাংলাদেশ", en: "Bangladesh", keywords: ["বাংলাদেশ", "ঢাকা", "চট্টগ্রাম", "রাজশাহী", "ঘাট", "সেতু", "জাতীয়", "bangladesh"] },
  { label: "রাজনীতি", en: "Politics", keywords: ["রাজনীতি", "প্রধানমন্ত্রী", "হাসিনা", "আওয়ামী", "বিএনপি", "পুলিশ", "আরাফাত", "politics"] },
  { label: "অর্থনীতি", en: "Economy", keywords: ["ব্যাংক", "চাকরি", "অর্থনীতি", "টাকা", "ডলার", "বাণিজ্য", "economy", "bank"] },
  { label: "আন্তর্জাতিক", en: "International", keywords: ["আন্তর্জাতিক", "ভারত", "হাইকমিশনার", "বিশ্ব", "যুক্তরাষ্ট্র", "international"] },
  { label: "খেলাধুলা", en: "Sports", keywords: ["খেলা", "ক্রিকেট", "ফুটবল", "বাফুফে", "কোচ", "রো", "sports", "cricket"] },
  { label: "শিক্ষা", en: "Education", keywords: ["এসএসসি", "বোর্ড", "পাস", "ফল", "পরীক্ষা", "শিক্ষা", "education", "result"] },
  { label: "বিনোদন", en: "Entertainment", keywords: ["শাবনূর", "সালমান", "সিনেমা", "চলচ্চিত্র", "বিনোদন", "তারকা", "entertainment", "movie"] },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function MainFeed({ newsItems }: MainFeedProps) {
  const [activeCategory, setActiveCategory] = useState("সর্বশেষ");

  // Smart Category Filtering
  const filteredNews = React.useMemo(() => {
    if (activeCategory === "সর্বশেষ") return newsItems;

    const catObj = CATEGORIES.find((c) => c.label === activeCategory);
    if (!catObj) return newsItems;

    const matched = newsItems.filter((item) => {
      // 1. Direct category match
      const itemCat = (item.category || "").toLowerCase();
      if (itemCat === catObj.label.toLowerCase() || itemCat === catObj.en.toLowerCase()) {
        return true;
      }
      // 2. Keyword match in title or summary
      const textToSearch = `${item.title || ""} ${item.headline || ""} ${item.summary || ""} ${item.ai_summary || ""}`.toLowerCase();
      return catObj.keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));
    });

    return matched.length > 0 ? matched : newsItems.slice(0, 4); // fallback graceful preview
  }, [activeCategory, newsItems]);

  return (
    <motion.div
      className="w-full space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Feed Header & Category Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 sm:pb-6 gap-3 sm:gap-6"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <div className="absolute inset-0 animate-pulse-glow">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary opacity-50" />
            </div>
          </div>
          <h2 className="text-sm sm:text-base md:text-xl font-serif font-bold text-foreground tracking-tight">সব খবর</h2>
        </div>

        {/* Category Navigation Tabs */}
        <nav className="flex gap-1.5 sm:gap-2 text-caption overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all duration-300 whitespace-nowrap text-[11px] sm:text-xs font-semibold select-none ${
                  isActive
                    ? "text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* News Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={containerVariants}
        >
          {filteredNews.length > 0 ? (
            filteredNews.map((item, index) => (
              <motion.div key={item.id} variants={itemVariants} custom={index}>
                <NewsCard news={item} />
              </motion.div>
            ))
          ) : (
            <motion.div
              variants={itemVariants}
              className="col-span-full py-16 text-center border border-dashed border-border rounded-3xl bg-muted/20"
            >
              <Compass className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-muted-foreground font-medium text-sm">
                এই ক্যাটাগরিতে খবর পাওয়া যায়নি।
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
