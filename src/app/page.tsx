"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import HeadlineSlider from "@/components/HeadlineSlider";
import MainFeed from "@/components/MainFeed";
import NewsCard from "@/components/NewsCard";
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
  Sliders,
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
    defaultLang: "BN",
    city: "Dhaka",
    countryCode: "BD",
  },
  {
    code: "GLOBAL",
    name: "আন্তর্জাতিক (Global)",
    flag: "🌐",
    defaultLang: "EN",
    city: "London",
    countryCode: "GB",
  },
  {
    code: "UK",
    name: "যুক্তরাজ্য (UK)",
    flag: "🇬🇧",
    defaultLang: "EN",
    city: "London",
    countryCode: "GB",
  },
  {
    code: "SA",
    name: "المملكة العربية السعودية (SA)",
    flag: "🇸🇦",
    defaultLang: "AR",
    city: "Riyadh",
    countryCode: "SA",
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
  const [isStickyExpanded, setIsStickyExpanded] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Country state for location-based news (BD, GLOBAL, UK, SA)
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCode = localStorage.getItem("kahf_user_country");
        if (savedCode) {
          const found = COUNTRIES.find((c) => c.code === savedCode);
          if (found) return found;
        }
        const hasArCookie = document.cookie.includes("googtrans=/bn/ar");
        const hasArLang = localStorage.getItem("kahf-language") === "AR";
        if (hasArCookie || hasArLang) {
          return COUNTRIES[3]; // SA
        }
        const hasEnCookie = document.cookie.includes("googtrans=/bn/en");
        const hasEnLang = localStorage.getItem("kahf-language") === "EN";
        if (hasEnCookie || hasEnLang) {
          return COUNTRIES[1]; // GLOBAL
        }
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (userTz === "Asia/Riyadh" || userTz.toLowerCase().includes("riyadh") || userTz.toLowerCase().includes("saudi")) {
          return COUNTRIES[3]; // SA
        }
        if (userTz === "Europe/London" || userTz.toLowerCase().includes("london")) {
          return COUNTRIES[2]; // UK
        }
        const isBangladesh = userTz === "Asia/Dhaka" || userTz.toLowerCase().includes("dhaka");
        if (!isBangladesh && userTz) {
          return COUNTRIES[1]; // GLOBAL
        }
      } catch (e) {}
    }
    return COUNTRIES[0];
  });
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const isArabic = selectedCountry.code === "SA";
  const isGlobal = selectedCountry.code === "GLOBAL" || selectedCountry.code === "UK" || selectedCountry.code === "SA";

  const { news, loading: newsLoading } = useNews({
    country: selectedCountry.code,
    sort: 'smart',
  });
  const { weather } = useWeather(
    selectedCountry.code === 'BD' ? 'Dhaka' : selectedCountry.code === 'SA' ? 'Riyadh' : 'London',
    selectedCountry.code === 'BD' ? 'BD' : selectedCountry.code === 'SA' ? 'SA' : 'GB'
  );
  const { data: sessionData } = useSession();

  const isPremium =
    (sessionData?.user as any)?.tier === "premium" ||
    (sessionData?.user as any)?.role === "admin";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    // Auto-detect Edition & Language based on location / timezone
    try {
      const savedCode = localStorage.getItem("kahf_user_country");
      if (savedCode) {
        const found = COUNTRIES.find((c) => c.code === savedCode);
        if (found && found.code !== selectedCountry.code) {
          setSelectedCountry(found);
        }
      } else {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const isRiyadh = userTz === "Asia/Riyadh" || userTz.toLowerCase().includes("riyadh") || userTz.toLowerCase().includes("saudi");
        const isLondon = userTz === "Europe/London" || userTz.toLowerCase().includes("london");
        const isBangladesh = userTz === "Asia/Dhaka" || userTz.toLowerCase().includes("dhaka");

        if (isRiyadh) {
          if (selectedCountry.code !== "SA") setSelectedCountry(COUNTRIES[3]);
          localStorage.setItem("kahf_user_country", "SA");
          if (localStorage.getItem("kahf_manual_lang") !== "true") {
            localStorage.setItem("kahf-language", "AR");
            document.cookie = `googtrans=/bn/ar; path=/`;
          }
        } else if (isLondon) {
          if (selectedCountry.code !== "UK") setSelectedCountry(COUNTRIES[2]);
          localStorage.setItem("kahf_user_country", "UK");
          if (localStorage.getItem("kahf_manual_lang") !== "true") {
            localStorage.setItem("kahf-language", "EN");
            document.cookie = `googtrans=/bn/en; path=/`;
          }
        } else if (!isBangladesh && userTz) {
          if (selectedCountry.code !== "GLOBAL") setSelectedCountry(COUNTRIES[1]);
          localStorage.setItem("kahf_user_country", "GLOBAL");
          if (localStorage.getItem("kahf_manual_lang") !== "true") {
            localStorage.setItem("kahf-language", "EN");
            document.cookie = `googtrans=/bn/en; path=/`;
          }
        } else {
          if (selectedCountry.code !== "BD") setSelectedCountry(COUNTRIES[0]);
          localStorage.setItem("kahf_user_country", "BD");
          if (localStorage.getItem("kahf_manual_lang") !== "true") {
            localStorage.setItem("kahf-language", "BN");
          }
        }
      }
    } catch (e) {}

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
    timeout = setTimeout(() => setIsStickyExpanded(false), 3000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [lastScrollY]);

  // Helper to map news objects into standardized view props
  const mapNewsItem = (item: any, defaultPriority: "high" | "medium" | "low" = "medium") => ({
    id: item._id || item.id,
    title: item.title || item.headline,
    summary: item.summary || item.ai_summary,
    source: item.source || "KahfNews",
    category: item.category || "General",
    priority: (item.priority || defaultPriority) as "high" | "medium" | "low",
    publishedAt: item.published_at
      ? new Date(item.published_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      : defaultPriority === "high" ? "Just now" : "Recent",
    imageUrl: item.image_url || item.imageUrl,
    originalUrl: item.original_url || item.originalUrl,
    isPersonalized: item.is_personalized || item.type === "personalized" || false,
    audio_bn_summary: item.audio_bn_summary,
    audio_bn_full: item.audio_bn_full,
    audio_en_summary: item.audio_en_summary,
    audio_en_full: item.audio_en_full,
  });

  // Transform news for headlines, feed items, and personalized feed
  const headlines = news.slice(0, 3).map((item: any) => mapNewsItem(item, "high"));
  const feedItems = news.map((item: any) => mapNewsItem(item, "medium"));
  const personalizedItems = feedItems.filter((item: any) => item.isPersonalized);
  const displayPersonalized = personalizedItems.length > 0 ? personalizedItems : feedItems.slice(0, 3);

  const totalStories = news.length;

  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [podcastDuration, setPodcastDuration] = useState<number | null>(null);

  useEffect(() => {
    async function loadExistingPodcast() {
      try {
        const res = await fetch(`/api/podcast/generate?country=${selectedCountry.code}`);
        const json = await res.json();
        if (json.success && json.podcast) {
          if (json.podcast.audio_url) setPodcastAudioUrl(json.podcast.audio_url);
          if (json.podcast.duration) setPodcastDuration(json.podcast.duration);
        }
      } catch (e) {}
    }
    loadExistingPodcast();
  }, [selectedCountry.code]);

  const temp = weather?.temp || (selectedCountry.code === 'SA' ? 34 : selectedCountry.code === 'BD' ? 29 : 18);
  const desc = weather?.description || (isArabic ? "سماء صافية" : isGlobal ? "Clear sky" : "পরিষ্কার আকাশ");
  const umbrellaAdvice = (desc.includes("rain") || desc.includes("cloud") || desc.includes("বৃষ্টি"))
    ? "আজ বাইরে বের হওয়ার আগে ছাতা সঙ্গে রাখা জরুরি, বৃষ্টির সম্ভাবনা রয়েছে।"
    : "আজ আকাশ পরিষ্কার থাকবে, তবে তীব্র রোদ এড়াতে প্রয়োজনে ছাতা ব্যবহার করতে পারেন।";

  const newsSummaryList = headlines
    .slice(0, 5)
    .map((h: any, i: number) => {
      if (isArabic) return `الخبر ${i + 1}: ${h.title}. ${h.summary || ""}`;
      if (isGlobal) return `Story ${i + 1}: ${h.title}. ${h.summary || ""}`;
      return `খবর ${i + 1}: ${h.title}. ${h.summary || ""}`;
    })
    .filter(Boolean)
    .join(". ");

  const dailyPodcastScript = isArabic
    ? `أهلاً بكم في بودكاست كهف الإخباري بالذكاء الاصطناعي! اليوم هو ${currentDate || "اليوم"}. حالة الطقس في الرياض: درجة الحرارة حوالي ${temp} مئوية، والجو ${desc}. إليكم أهم الأخبار اليوم: ${newsSummaryList}. شكراً لاستماعكم لبودكاست كهف ونتمنى لكم يوماً رائعاً!`
    : isGlobal
    ? `Welcome to KahfNews Special AI Podcast! Today is ${currentDate || "today"}. Local weather: around ${temp}°C, ${desc}. Here are today's top stories: ${newsSummaryList}. Thank you for listening to KahfNews!`
    : `শুভ সকাল! আজ ${currentDate || "আজকের দিন"}। কহাফ নিউজের স্পেশাল এআই পডকাস্টে আপনাকে স্বাগতম। আজকের আবহাওয়া: তাপমাত্রা প্রায় ${temp} ডিগ্রি সেলসিয়াস, আবহাওয়া ${desc}। ${umbrellaAdvice} রাস্তাঘাটের যানজট পরিস্থিতি: প্রধান সড়ক ও মোড়গুলোতে সকালের দিকে কিছুটা স্বাভাবিক চাপ থাকতে পারে, সময় হাতে নিয়ে বের হোন। এবার দেখে নেওয়া যাক আজকের প্রধান খবরগুলো: ${newsSummaryList}। কহাফ নিউজের সাথে থাকার জন্য ধন্যবাদ। দিনটি আপনার শুভ হোক!`;

  // Calculate dynamic duration in seconds (13 chars/sec for narration)
  const calculatedDurationSec = Math.max(30, Math.round(dailyPodcastScript.replace(/[*_#`[\]()]/g, "").trim().length / 13));
  const dynamicDurationSec = podcastDuration || calculatedDurationSec;

  const formatDurationString = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} sec`;
    return `${mins}:${secs < 10 ? "0" : ""}${secs} min`;
  };

  const podcastDurationStr = formatDurationString(dynamicDurationSec);

  const handlePlayFullAudio = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const firstHeadline = headlines[0];
    const preferredLang = isArabic ? "AR" : isGlobal ? "EN" : "BN";
    const audioLangParam = isArabic ? "ar" : isGlobal ? "en" : "bn";
    const podcastAudio = podcastAudioUrl || `/api/audio/tts?text=${encodeURIComponent(dailyPodcastScript.slice(0, 800))}&lang=${audioLangParam}`;

    const podcastTitle = isArabic
      ? `بودكاست كهف اليومي - ${currentDate}`
      : isGlobal
      ? `Today's AI Podcast - ${currentDate}`
      : `আজকের এআই পডকাস্ট - ${currentDate}`;

    const event = new CustomEvent('play-audio', {
      detail: {
        id: "daily-podcast",
        title: podcastTitle,
        summary: dailyPodcastScript,
        imageUrl: firstHeadline?.imageUrl,
        source: "KahfNews AI Podcast",
        preferredLang: preferredLang,
        preferredType: "summary",
        audioUrls: {
          bn_summary: !isGlobal ? podcastAudio : undefined,
          bn_full: !isGlobal ? (firstHeadline?.audio_bn_full || podcastAudio) : undefined,
          en_summary: (!isArabic && isGlobal) ? podcastAudio : firstHeadline?.audio_en_summary,
          en_full: (!isArabic && isGlobal) ? podcastAudio : firstHeadline?.audio_en_full,
          ar_summary: isArabic ? podcastAudio : undefined,
          ar_full: isArabic ? podcastAudio : undefined,
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
        <p className="text-muted-foreground text-sm">
          {isArabic ? "جاري تحميل الأخبار المخصصة لك..." : isGlobal ? "Loading your customized news..." : "আপনার কাস্টমাইজড খবর লোড হচ্ছে..."}
        </p>
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
          <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2.5 text-[11px] sm:text-xs w-full sm:w-auto">
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
                {weather?.temp || (selectedCountry.code === 'SA' ? 34 : selectedCountry.code === 'BD' ? 29 : 18)}°C
              </span>
              <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline truncate max-w-[80px]">
                {weather?.description || (isArabic ? "Clear" : isGlobal ? "Clear" : "Clear")}
              </span>
            </div>
          </div>

          {/* ROW 2 ON MOBILE (Right Cluster on Desktop): Upgrade Pill & Location/Region Selector */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 text-xs sm:text-xs w-full sm:w-auto">
            {/* 1. Upgrade to Premium */}
            {!isPremium && (
              <Link href="/pricing" className="flex-1 sm:flex-initial group">
                <div className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-1.5 bg-gradient-to-r from-emerald-500/15 via-primary/20 to-emerald-500/15 hover:from-primary/30 hover:to-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg sm:rounded-xl shadow-sm transition-all cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <span className="font-bold tracking-tight whitespace-nowrap">
                    Upgrade to Premium
                  </span>
                </div>
              </Link>
            )}

            {/* 2. Country Selector Widget (BD, GLOBAL, UK, SA) */}
            <div className="flex-1 sm:flex-initial relative">
              <button
                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1.5 bg-card/90 hover:bg-muted border border-border hover:border-primary/40 rounded-lg sm:rounded-xl font-semibold text-foreground transition-all cursor-pointer shadow-sm"
                title="Change Country / Edition"
              >
                <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <span className="text-xs">{selectedCountry.flag}</span>
                  <span className="font-bold">{selectedCountry.name}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1 ${isLocationDropdownOpen ? "rotate-180" : ""
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
                    className="absolute right-0 mt-2 w-64 bg-popover/98 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-3 z-50 text-popover-foreground space-y-2.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        <span>{isArabic ? "اختر الدولة / النسخة" : isGlobal ? "Select Country / Edition" : "সংস্করণ / দেশ নির্বাচন"}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                        Edition
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setSelectedCountry(c);
                            try {
                              localStorage.setItem("kahf_user_country", c.code);
                              if (c.code === "SA") {
                                document.cookie = `googtrans=/bn/ar; path=/`;
                                document.cookie = `googtrans=/bn/ar; path=/; domain=${window.location.hostname}`;
                                localStorage.setItem("kahf-language", "AR");
                              } else if (c.code === "GLOBAL" || c.code === "UK") {
                                document.cookie = `googtrans=/bn/en; path=/`;
                                document.cookie = `googtrans=/bn/en; path=/; domain=${window.location.hostname}`;
                                localStorage.setItem("kahf-language", "EN");
                              } else {
                                document.cookie = `googtrans=/bn/bn; path=/`;
                                document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                                document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
                                localStorage.setItem("kahf-language", "BN");
                              }
                            } catch (e) {}
                            setIsLocationDropdownOpen(false);
                            window.location.reload();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectedCountry.code === c.code
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "bg-muted/60 hover:bg-muted text-foreground"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{c.flag}</span>
                            <span>{c.name}</span>
                          </div>
                          {selectedCountry.code === c.code && (
                            <Check className="w-3.5 h-3.5 text-primary-foreground" />
                          )}
                        </button>
                      ))}
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
          {/* Top Center Ambient Round Glow Orb */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 sm:w-[500px] h-40 bg-primary/10 dark:bg-primary/25 rounded-full blur-3xl group-hover:bg-primary/20 dark:group-hover:bg-primary/40 transition-all duration-700 pointer-events-none" />

          {/* 2-Column Responsive Proportional Layout */}
          <div className="relative grid grid-cols-12 items-center gap-3 sm:gap-6 lg:gap-8">
            {/* Left Content Column */}
            <Link href="/news/daily-summary" className="col-span-8 md:col-span-8 lg:col-span-9 min-w-0 space-y-2.5 sm:space-y-4 group/left block cursor-pointer">
              {/* Top Badge Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-primary/15 text-primary text-xs sm:text-[11px] font-black uppercase tracking-wider rounded-full border border-primary/25">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  {isArabic ? "ملخص الذكاء الاصطناعي اليوم" : isGlobal ? "TODAY'S AI SUMMARY" : "আজকের এআই সারসংক্ষেপ"}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-muted/90 text-foreground border border-border text-xs sm:text-[11px] font-mono font-bold rounded-full shadow-sm whitespace-nowrap shrink-0">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{podcastDurationStr}</span>
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-base sm:text-lg md:text-2xl lg:text-[2.25rem] font-sans font-bold text-foreground leading-[1.3] tracking-tight group-hover/left:text-primary transition-colors">
                {isArabic ? (
                  <>موجزك اليومي: <span className="text-primary">تحليل شامل لأخبار اليوم</span></>
                ) : isGlobal ? (
                  <>Your Daily Briefing: <span className="text-primary">Full Analysis of Today&apos;s News</span></>
                ) : (
                  <>আপনার দৈনিক সারসংক্ষেপ: <span className="text-primary">আজকের খবরের সম্পূর্ণ বিশ্লেষণ</span></>
                )}
              </h1>

              {/* Subtitle / Summary Content */}
              <p className="text-xs sm:text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed font-sans line-clamp-2 sm:line-clamp-none">
                {isArabic
                  ? "تتضمن أهم أخبار اليوم آخر المستجدات في السياسة والاقتصاد والتكنولوجيا. استمع إلى الموجز الصوتي الكامل أو اقرأ الملخص بنقرة واحدة."
                  : isGlobal
                  ? "Today's top stories feature the latest updates in politics, economy, and technology. Listen to the full audio briefing or read the summary in one click."
                  : "আজকের শীর্ষ খবরগুলোতে থাকছে জাতীয় রাজনীতি, অর্থনীতি ও প্রযুক্তি খাতের সর্বশেষ আপডেট। এক ক্লিকেই সম্পূর্ণ খবরের অডিও ব্রিফিং শুনে নিন অথবা সারসংক্ষেপ পড়ুন।"}
              </p>

              {/* Action Buttons ("Listen" & "Read") */}
              <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                <Button
                  onClick={handlePlayFullAudio}
                  className="h-8.5 sm:h-9 md:h-10 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm gap-1.5 shadow-sm cursor-pointer hover:bg-primary/90 transition-all"
                >
                  <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{isArabic ? "استمع" : isGlobal ? "Listen" : "শুনুন"}</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-8.5 sm:h-9 md:h-10 px-4 sm:px-5 rounded-xl border-border hover:bg-muted text-foreground font-bold text-xs sm:text-sm gap-1.5 cursor-pointer transition-all"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{isArabic ? "اقرأ" : isGlobal ? "Read" : "পড়ুন"}</span>
                </Button>
              </div>
            </Link>

            {/* Right Action: Centered Play Button */}
            <div className="col-span-4 md:col-span-4 lg:col-span-3 flex items-center justify-center my-auto">
              <button
                onClick={handlePlayFullAudio}
                className="relative group/play flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-22 lg:h-22 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                title={`Play Full AI Daily Audio Briefing (${podcastDurationStr})`}
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
        <HeadlineSlider headlines={headlines} isGlobal={isGlobal} isArabic={isArabic} />
      </motion.section>

      {/* 4.5 Personalized AI News Section for Premium Users */}
      {isPremium && (
        <motion.section variants={itemVariants} className="mb-5 sm:mb-7">
          <div className="flex items-center justify-between border-b border-border/80 pb-2.5 mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-sans font-bold text-foreground flex items-center gap-2">
                  {isArabic ? "أخبار مخصصة لك" : isGlobal ? "News customized for you" : "আপনার জন্য কাস্টমাইজড খবর"}
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/25">
                    PERSONALIZED
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {isArabic ? "أخبار مختارة بالذكاء الاصطناعي بناءً على اهتماماتك وتفضيلاتك" : isGlobal ? "AI-curated news based on your preferences and tastes" : "আপনার পছন্দ ও রুচির ওপর ভিত্তি করে এআই দিয়ে বাছাইকৃত খবর"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {displayPersonalized.slice(0, 3).map((item: any) => (
              <NewsCard key={`personalized-${item.id}`} news={item} />
            ))}
          </div>
        </motion.section>
      )}

      {/* 5. Main News Feed Section */}
      <motion.section variants={itemVariants}>
        <MainFeed newsItems={feedItems} isGlobal={isGlobal} isArabic={isArabic} />
      </motion.section>

      {/* Floating Audio Player Component */}
      <AudioPlayer newsItems={feedItems} />

      {/* Sticky Bottom Actions Bar (Minimize Toggle Moved to Right of Settings) */}
      <div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300"
        onMouseEnter={() => setIsStickyExpanded(true)}
      >
        <div className="flex items-center gap-1.5 p-1.5 bg-card/90 border border-border/80 backdrop-blur-2xl rounded-full shadow-2xl">
          {/* Expandable Options */}
          <AnimatePresence>
            {isStickyExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                {/* 1. Listen Daily Podcast / Open Player */}
                <button
                  onClick={handlePlayFullAudio}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-xs font-bold transition-all shadow-md shadow-primary/20 whitespace-nowrap cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Listen AI Podcast</span>
                </button>

                {/* 2. Toggle Audio Player View */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("toggle-audio-player"));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-full text-xs font-semibold transition-all border border-border whitespace-nowrap cursor-pointer"
                  title="Show / Hide Mini Player"
                >
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Player</span>
                </button>

                {/* 3. Settings Button (Synced Sliders Icon) */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-audio-settings"));
                  }}
                  className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border border-border cursor-pointer"
                  title="TTS & Voice Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimize Toggle Button (Positioned on Right Beside Settings) */}
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
        </div>
      </div>
    </motion.main>
  );
}
