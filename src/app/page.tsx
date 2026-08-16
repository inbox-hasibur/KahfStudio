"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import HeadlineSlider from "@/components/HeadlineSlider";
import MainFeed from "@/components/MainFeed";
import AudioPlayer from "@/components/AudioPlayer";
import BreakingNewsTicker from "@/components/BreakingNewsTicker";
import { useNews, useWeather } from "@/hooks/useNews";
import {
  Newspaper,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
  CloudSun,
  Play,
  FileText,
  Star,
  ChevronLeft,
  Settings,
  Headphones,
  MapPin,
  Globe,
  ChevronDown,
  Check,
  Bot,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

const COUNTRIES = [
  {
    code: "BD",
    name: "বাংলাদেশ",
    flag: "🇧🇩",
    regions: [
      "ঢাকা (Dhaka)",
      "চট্টগ্রাম (Chattogram)",
      "রাজশাহী (Rajshahi)",
      "সিলেট (Sylhet)",
      "খুলনা (Khulna)",
      "বরিশাল (Barishal)",
      "রংপুর (Rangpur)",
      "ময়মনসিংহ (Mymensingh)",
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    regions: ["New York", "California", "Texas", "Florida", "Washington"],
  },
  {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    regions: ["London", "Manchester", "Birmingham", "Edinburgh"],
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    regions: ["West Bengal (Kolkata)", "Delhi", "Mumbai", "Bangalore"],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    regions: ["Riyadh", "Jeddah", "Makkah", "Madinah"],
  },
  {
    code: "GLOBAL",
    name: "Global",
    flag: "🌐",
    regions: ["Worldwide / All Regions"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Country & Region state for location-based news widget
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedRegion, setSelectedRegion] = useState(COUNTRIES[0].regions[0]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const { news, loading: newsLoading } = useNews();
  const { weather } = useWeather();
  const { data: sessionData } = useSession();

  const isPremium =
    (sessionData?.user as any)?.tier === "premium" ||
    (sessionData?.user as any)?.role === "admin";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentDate(date);

    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Transform news for headlines
  const headlines = news.slice(0, 3).map((item: any) => ({
    id: item._id || item.id,
    title: item.title || item.headline,
    summary: item.summary || item.ai_summary,
    source: item.source || "KahfNews",
    category: item.category || "General",
    priority: "high" as const,
    publishedAt: item.published_at
      ? new Date(item.published_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now",
    imageUrl: item.image_url || item.imageUrl,
    originalUrl: item.original_url || item.originalUrl,
    audio_bn_summary: item.audio_bn_summary,
    audio_bn_full: item.audio_bn_full,
    audio_en_summary: item.audio_en_summary,
    audio_en_full: item.audio_en_full,
  }));

  // Feed items
  const feedItems = news.map((item: any) => ({
    id: item._id || item.id,
    title: item.title || item.headline,
    summary: item.summary || item.ai_summary,
    source: item.source || "KahfNews",
    category: item.category || "General",
    priority: (item.priority || "medium") as "high" | "medium" | "low",
    publishedAt: item.published_at
      ? new Date(item.published_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recent",
    imageUrl: item.image_url || item.imageUrl,
    originalUrl: item.original_url || item.originalUrl,
    audio_bn_summary: item.audio_bn_summary,
    audio_bn_full: item.audio_bn_full,
    audio_en_summary: item.audio_en_summary,
    audio_en_full: item.audio_en_full,
  }));

  const totalStories = news.length;

  const handlePlayFullAudio = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const allSummaries = headlines.map((h: any) => h.summary || h.ai_summary || h.title).filter(Boolean).join(". ");
    const firstHeadline = headlines[0];
    
    const event = new CustomEvent('play-audio', {
      detail: {
        id: "daily-podcast",
        title: `আজকের খবরের সম্পূর্ণ এআই পডকাস্ট - ${currentDate}`,
        summary: allSummaries || "আজকের শীর্ষ সংবাদ ও বিস্তারিত খবরের সারসংক্ষেপ।",
        imageUrl: firstHeadline?.imageUrl || firstHeadline?.image_url,
        source: "KahfNews AI Podcast",
        preferredLang: "BN",
        preferredType: "summary",
        audioUrls: {
          bn_full: firstHeadline?.audio_bn_full,
          bn_summary: firstHeadline?.audio_bn_summary,
          en_full: firstHeadline?.audio_en_full,
          en_summary: firstHeadline?.audio_en_summary,
        }
      }
    });
    window.dispatchEvent(event);
  };

  if (isLoading || newsLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm">আপনার কাস্টমাইজড খবর লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <motion.main
      className="max-w-[1400px] mx-auto px-2.5 sm:px-6 lg:px-8 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-28 md:pb-48 overflow-x-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 1. Contextual Smart Widgets Bar (Clean 2-Row Mobile Alignment, No Dot in Time) */}
      <motion.section variants={itemVariants} className="mb-2 sm:mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 bg-transparent p-0 border-none">
          {/* ROW 1 ON MOBILE (Left Cluster on Desktop): Date, Time, Weather */}
          <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2.5 text-[10px] sm:text-xs w-full sm:w-auto">
            {/* 1. Date */}
            <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-card/80 border border-border text-foreground font-semibold shadow-sm">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
              <span className="whitespace-nowrap truncate">{currentDate || "Friday, August 14, 2026"}</span>
            </div>

            {/* 2. Time (Clean Digital Clock - No Pinging Dot) */}
            <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-card/80 border border-border text-foreground font-mono font-bold shadow-sm">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
              <span className="whitespace-nowrap">
                {currentTime
                  ? currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : "--:--:--"}
              </span>
            </div>

            {/* 3. Weather Pill (Clean & Compact - SVG Trend Curve Removed for Plenty of Space) */}
            <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-card/80 border border-border rounded-lg sm:rounded-xl shadow-sm">
              <CloudSun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="font-bold text-foreground whitespace-nowrap">
                {weather?.temp || 29}°C
              </span>
              <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline truncate max-w-[80px]">
                {weather?.description || "Clear"}
              </span>
            </div>
          </div>

          {/* ROW 2 ON MOBILE (Right Cluster on Desktop): Upgrade Pill & Location/Region Selector */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs w-full sm:w-auto">
            {/* 1. Upgrade to Premium */}
            {!isPremium && (
              <Link href="/pricing" className="flex-1 sm:flex-initial group">
                <div className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-500/15 via-primary/20 to-emerald-500/15 hover:from-primary/30 hover:to-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg sm:rounded-xl shadow-sm transition-all cursor-pointer">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <span className="font-bold tracking-tight whitespace-nowrap">
                    Upgrade to Premium
                  </span>
                </div>
              </Link>
            )}

            {/* 2. Country & Region Selector Widget */}
            <div className="flex-1 sm:flex-initial relative">
              <button
                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-card/90 hover:bg-muted border border-border hover:border-primary/40 rounded-lg sm:rounded-xl font-semibold text-foreground transition-all cursor-pointer shadow-sm"
                title="Change Country & Region"
              >
                <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <span className="text-xs">{selectedCountry.flag}</span>
                  <span className="font-bold">{selectedCountry.name}</span>
                  <span className="text-border">|</span>
                  <span className="text-primary font-medium truncate max-w-[100px] sm:max-w-none">{selectedRegion}</span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1 ${
                    isLocationDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Location Dropdown Modal */}
              <AnimatePresence>
                {isLocationDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-popover/98 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-3 z-50 text-popover-foreground space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        <span>লোকেশন ও রিজিয়ন সিলেক্ট</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                        Regional Filter
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold mb-1.5 block">
                        দেশ (Country):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setSelectedCountry(c);
                              setSelectedRegion(c.regions[0]);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              selectedCountry.code === c.code
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            }`}
                          >
                            <span>{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold mb-1.5 block">
                        বিভাগ / এলাকা (Region):
                      </label>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {selectedCountry.regions.map((region) => (
                          <button
                            key={region}
                            onClick={() => {
                              setSelectedRegion(region);
                              setIsLocationDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              selectedRegion === region
                                ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                                : "bg-muted/60 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <span>{region}</span>
                            {selectedRegion === region && (
                              <Check className="w-3 h-3 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Breaking News Ticker */}
      <motion.section variants={itemVariants} className="mb-2.5 sm:mb-3.5">
        <BreakingNewsTicker items={headlines.map((h: any) => h.title)} />
      </motion.section>

      {/* 3. Merged Super Hero Card (Card Theme BG + Big Play Button ALWAYS on Right in Same Row) */}
      <motion.section variants={itemVariants} className="mb-3 sm:mb-4">
        <div className="relative bg-card border border-border p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl md:rounded-[32px] overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group">
          {/* Top Center Ambient Round Glow Orb (Exact requested Mindful Pause Card Style) */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 sm:w-[500px] h-40 bg-primary/10 dark:bg-primary/25 rounded-full blur-3xl group-hover:bg-primary/20 dark:group-hover:bg-primary/40 transition-all duration-700 pointer-events-none" />

          {/* 2-Column Responsive Proportional Layout (Left Content 67-75% / Right Action 25-33%) */}
          <div className="relative grid grid-cols-12 items-center gap-3 sm:gap-6 lg:gap-8">
            {/* Left Content Column */}
            <div className="col-span-8 md:col-span-8 lg:col-span-9 min-w-0 space-y-2.5 sm:space-y-4">
              {/* Top Badge Row: Left Tag Badge & Synced Duration Badge right beside it */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-primary/15 text-primary text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-full border border-primary/25">
                  <Zap className="w-3 h-3 fill-current" />
                  আজকের এআই সারসংক্ষেপ
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-muted/90 text-foreground border border-border text-[10px] sm:text-[11px] font-mono font-bold rounded-full shadow-sm whitespace-nowrap shrink-0">
                  <Clock className="w-3 h-3 text-primary shrink-0" />
                  <span>8 min</span>
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-sm sm:text-lg md:text-2xl lg:text-[2.25rem] font-sans font-bold text-foreground leading-[1.3] tracking-tight notranslate">
                আপনার দৈনিক সারসংক্ষেপ: <span className="text-primary">আজকের খবরের সম্পূর্ণ বিশ্লেষণ</span>
              </h1>

              {/* Subtitle / Summary Content */}
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed font-sans notranslate line-clamp-2 sm:line-clamp-none">
                আজকের শীর্ষ খবরগুলোতে থাকছে জাতীয় রাজনীতি, অর্থনীতি ও প্রযুক্তি খাতের সর্বশেষ আপডেট। এক ক্লিকেই সম্পূর্ণ খবরের অডিও ব্রিফিং শুনে নিন অথবা সারসংক্ষেপ পড়ুন।
              </p>

              {/* Action Buttons ("শুনুন" & "পড়ুন") directly after text */}
              <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                <Button
                  onClick={handlePlayFullAudio}
                  className="h-8 sm:h-9 md:h-10 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm gap-1.5 shadow-sm cursor-pointer hover:bg-primary/90 transition-all"
                >
                  <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>শুনুন</span>
                </Button>

                <Link href="/news/daily-summary">
                  <Button
                    variant="outline"
                    className="h-8 sm:h-9 md:h-10 px-4 sm:px-5 rounded-xl border-border hover:bg-muted text-foreground font-bold text-xs sm:text-sm gap-1.5 cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>পড়ুন</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Dedicated Action Column: Centered Play Button (Shifted Leftwards to Golden Center) */}
            <div className="col-span-4 md:col-span-4 lg:col-span-3 flex items-center justify-center my-auto">
              <button
                onClick={handlePlayFullAudio}
                className="relative group/play flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-22 lg:h-22 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                title="Play Full AI Daily Audio Briefing (8 Mins)"
              >
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                <Play className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 fill-current ml-0.5 sm:ml-1 transition-transform group-hover/play:scale-110" />
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Trial Banner */}
      {(sessionData?.user as any)?.trial_days_left !== undefined && (
        <motion.section variants={itemVariants} className="mb-4 sm:mb-6">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-primary">7-Day Free Trial</h3>
                <p className="text-sm text-muted-foreground">
                  You have <strong>{(sessionData?.user as any)?.trial_days_left} days</strong> left in your premium trial.
                </p>
              </div>
            </div>
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-white font-bold"
              >
                Upgrade Now
              </Button>
            </Link>
          </div>
        </motion.section>
      )}

      {/* 4. Featured Headlines Section */}
      <motion.section variants={itemVariants} className="mb-3.5 sm:mb-5">
        <HeadlineSlider headlines={headlines} />
      </motion.section>

      {/* 5. Main News Feed Section */}
      <motion.section variants={itemVariants}>
        <MainFeed newsItems={feedItems} />
      </motion.section>

      {/* Floating Audio Player Component */}
      <AudioPlayer newsItems={feedItems} />
    </motion.main>
  );
}
