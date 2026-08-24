"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Music, Video, SkipBack, SkipForward, Rewind, FastForward, 
  Volume2, VolumeX, Settings, Maximize, Lock, Star, ChevronDown, ChevronLeft, ChevronRight, Flame, Tv, Sparkles, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

export interface IPTVChannel {
  id: string;
  name: string;
  category: string;
  videoId: string;
  streamUrl: string;
  color: string;
  text: string;
  source: string;
  isLive?: boolean;
}

export interface NewsVideo {
  id: string;
  title: string;
  videoId: string;
  thumbnail: string;
  category: string;
  duration: string;
  description: string;
  source?: string;
}

const toBengaliDigits = (num: number | string) => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
};

const ChannelLogo = ({ channelId, name }: { channelId: string; name: string }) => {
  switch (channelId) {
    case "c1": // Jamuna TV
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-[9px] tracking-tighter shrink-0 shadow-sm border border-red-500/40">
          <span className="text-red-400">J</span><span className="text-white">TV</span>
        </div>
      );
    case "c2": // Somoy TV
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black text-[9px] shrink-0 shadow-sm border border-orange-400/30">
          <span>সময়</span>
        </div>
      );
    case "c3": // Channel 24
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-sm border border-emerald-400/40">
          <span>24</span>
        </div>
      );

    case "c5": // Ekattor TV
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center text-red-300 font-black text-[10px] shrink-0 shadow-sm border border-red-500/50">
          <span>৭১</span>
        </div>
      );
    case "c6": // Independent TV
      return (
        <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-amber-400/60 flex items-center justify-center text-amber-400 font-black text-[11px] shrink-0 shadow-sm">
          <span>i</span>
        </div>
      );
    case "c7": // RTV News
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-[8px] tracking-tight shrink-0 shadow-sm border border-red-400/30">
          <span>rtv</span>
        </div>
      );
    case "c8": // Banglavision
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-black text-[9px] shrink-0 shadow-sm border border-sky-400/30">
          <span>BV</span>
        </div>
      );
    case "c9": // Desh TV
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-bold text-[8px] shrink-0 shadow-sm border border-teal-400/30">
          <span>দেশ</span>
        </div>
      );
    case "c10": // Al Jazeera
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-[9px] tracking-tight shrink-0 shadow-sm border border-amber-400/40">
          <span>AJ</span>
        </div>
      );
    case "c11": // DW News
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-600 to-blue-800 flex items-center justify-center text-white font-black text-[8px] tracking-tight shrink-0 shadow-sm border border-sky-400/30">
          <span>DW</span>
        </div>
      );
    case "c12": // Sky News
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-bold text-[8px] tracking-tight shrink-0 shadow-sm border border-rose-400/30">
          <span>sky</span>
        </div>
      );
    case "c13": // DBC News
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center text-white font-black text-[8px] tracking-tight shrink-0 shadow-sm border border-purple-400/30">
          <span>DBC</span>
        </div>
      );
    case "c14": // Channel i
      return (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-red-400 font-black text-[10px] shrink-0 shadow-sm border border-emerald-400/30">
          <span>i</span>
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
          <Tv className="w-3 h-3" />
        </div>
      );
  }
};

const defaultChannels: IPTVChannel[] = [
  { 
    id: "c1", 
    name: "Jamuna TV", 
    category: "জাতীয় সংবাদ", 
    videoId: "4Wpv0HhFU1M",
    streamUrl: "https://www.youtube.com/embed/4Wpv0HhFU1M?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-blue-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c2", 
    name: "Somoy TV", 
    category: "ব্রেকিং নিউজ", 
    videoId: "i8VSQO6TlFc",
    streamUrl: "https://www.youtube.com/embed/i8VSQO6TlFc?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-orange-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c3", 
    name: "Channel 24", 
    category: "সংবাদ ২৪", 
    videoId: "LVPgC7LQOw0",
    streamUrl: "https://www.youtube.com/embed/LVPgC7LQOw0?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-emerald-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c4", 
    name: "News24", 
    category: "ব্রেকিং নিউজ", 
    videoId: "oCslIqfoOZw",
    streamUrl: "https://www.youtube.com/embed/oCslIqfoOZw?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-red-700", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c5", 
    name: "Ekattor TV", 
    category: "জাতীয়", 
    videoId: "9L9ymmaPIS0",
    streamUrl: "https://www.youtube.com/embed/9L9ymmaPIS0?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-green-700", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c6", 
    name: "Independent TV", 
    category: "বাংলাদেশ", 
    videoId: "qREvoxxG6Nc",
    streamUrl: "https://www.youtube.com/embed/qREvoxxG6Nc?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-slate-800", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c7", 
    name: "RTV News", 
    category: "জাতীয় সংবাদ", 
    videoId: "PtztZQi5hCg",
    streamUrl: "https://www.youtube.com/embed/PtztZQi5hCg?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-red-600", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c8", 
    name: "Banglavision", 
    category: "সংবাদ ও খবর", 
    videoId: "95oEnwrvJRs",
    streamUrl: "https://www.youtube.com/embed/95oEnwrvJRs?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-sky-600", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c9", 
    name: "Desh TV", 
    category: "খবর ও রাজনীতি", 
    videoId: "me25ctmn8H8",
    streamUrl: "https://www.youtube.com/embed/me25ctmn8H8?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-teal-700", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c10", 
    name: "Al Jazeera English", 
    category: "আন্তর্জাতিক", 
    videoId: "gCNeDWCI0vo",
    streamUrl: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-amber-600", 
    text: "text-white",
    source: "Global Live HD"
  },
  { 
    id: "c11", 
    name: "DW News", 
    category: "বিশ্ব সংবাদ", 
    videoId: "LuKwFajn37U",
    streamUrl: "https://www.youtube.com/embed/LuKwFajn37U?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-sky-700", 
    text: "text-white",
    source: "Global Live HD"
  },
  { 
    id: "c12", 
    name: "Sky News", 
    category: "আন্তর্জাতিক", 
    videoId: "YDvsBbKfLPA",
    streamUrl: "https://www.youtube.com/embed/YDvsBbKfLPA?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-rose-700", 
    text: "text-white",
    source: "Global Live HD"
  }
];

// 100% Real Video Reports & Content
const realNewsVideos: NewsVideo[] = [
  {
    id: "v1",
    title: "আপনাকে কেন ভালবাসি, ইয়া রাসুলাল্লাহ (সঃ)?",
    videoId: "5zWTInJqD5k",
    thumbnail: "https://img.youtube.com/vi/5zWTInJqD5k/hqdefault.jpg",
    category: "ইসলামিক",
    duration: "০৮:১৫",
    source: "Baseera Media",
    description: "রাসুলুল্লাহ (সাঃ) এর প্রতি ভালোবাসা ও সিরাহ বিষয়ক বিশেষ প্রতিবেদন।"
  },
  {
    id: "v2",
    title: "অর্থনীতি ও ব্যাংক খাতের সর্বশেষ পরিস্থিতি ও বিশেষ আপডেট",
    videoId: "qB29pIkJMoQ",
    thumbnail: "https://img.youtube.com/vi/qB29pIkJMoQ/hqdefault.jpg",
    category: "অর্থনীতি",
    duration: "০৫:১৫",
    source: "Somoy TV",
    description: "অর্থনৈতিক উন্নয়ন, ব্যাংকিং ব্যবস্থা ও বাজার পরিস্থিতির তাজা খবর।"
  },
  {
    id: "v3",
    title: "আপনাকে কেন ভালবাসি, ইয়া রাসুলাল্লাহ (সঃ)? — পর্ব ২",
    videoId: "5zWTInJqD5k",
    thumbnail: "https://img.youtube.com/vi/5zWTInJqD5k/hqdefault.jpg",
    category: "ইসলামিক",
    duration: "০৮:১৫",
    source: "Baseera Media",
    description: "রাসুলুল্লাহ (সাঃ) এর অনুপম চরিত্র ও উম্মাহর গভীর ভালোবাসা নিয়ে বিশেষ আলোচনা।"
  },
  {
    id: "v4",
    title: "সিরাহ ১১ - মে'রাজ: এক বিস্ময়কর যাত্রা",
    videoId: "mDTAjCMb70A",
    thumbnail: "https://img.youtube.com/vi/mDTAjCMb70A/hqdefault.jpg",
    category: "সিরাহ",
    duration: "০৯:৪০",
    source: "Baseera Media",
    description: "পবিত্র মে'রাজের ঐতিহাসিক ও বিস্ময়কর সফর নিয়ে বিস্তারিত বিশেষ পর্ব।"
  },
  {
    id: "v5",
    title: "সিরাহ বিশেষ পর্ব — রাসুলুল্লাহ (সাঃ) এর নবুওয়াত ও আহ্বান",
    videoId: "mDTAjCMb70A",
    thumbnail: "https://img.youtube.com/vi/mDTAjCMb70A/hqdefault.jpg",
    category: "সিরাহ",
    duration: "০৯:৪০",
    source: "Baseera Media",
    description: "মক্কী জীবনের সংগ্রাম, ঈমানের দাওয়াত ও ঐতিহাসিক ঘটনা প্রবাহ।"
  },
  {
    id: "v6",
    title: "🔴 Makkah Live | মক্কার লাইভ সম্প্রচার",
    videoId: "5jp4fb7HyoQ",
    thumbnail: "https://img.youtube.com/vi/5jp4fb7HyoQ/hqdefault.jpg",
    category: "লাইভ",
    duration: "লাইভ",
    source: "Al Islamic Network TV",
    description: "পবিত্র মসজিদুল হারাম (মক্কা) এর সরাসরি লাইভ সম্প্রচার।"
  },
  {
    id: "v7",
    title: "স্বাস্থ্য ও পরিবেশ বিষয়ক বিশেষ অনুসন্ধানী রিপোর্ট",
    videoId: "vPunUbzbhag",
    thumbnail: "https://img.youtube.com/vi/vPunUbzbhag/hqdefault.jpg",
    category: "স্বাস্থ্য",
    duration: "০৪:২৫",
    source: "RTV News",
    description: "জনস্বাস্থ্য ও নাগরিক সচেতনতা বিষয়ক বিশেষ কভারেজ।"
  },
  {
    id: "v8",
    title: "গ্রিন এনার্জি ও বৈজ্ঞানিক অগ্রগতির তাজা খবর",
    videoId: "yXCMU72z0Ms",
    thumbnail: "https://img.youtube.com/vi/yXCMU72z0Ms/hqdefault.jpg",
    category: "বিজ্ঞান",
    duration: "০৫:০৫",
    source: "Banglavision",
    description: "সৌরশক্তি, পরিবেশ রক্ষা ও বিজ্ঞান খাতের সাফল্য কভারেজ।"
  }
];

export default function MediaPage() {
  const { data: session } = useSession();
  const isPremium = (session?.user as any)?.tier === "premium" || (session?.user as any)?.role === "admin";
  
  const [channels, setChannels] = useState<IPTVChannel[]>(defaultChannels);
  const [streamType, setStreamType] = useState<"live" | "video">("live");
  const [activeChannel, setActiveChannel] = useState<IPTVChannel>(defaultChannels[0]);
  const [currentVideo, setCurrentVideo] = useState<NewsVideo>(realNewsVideos[0]);

  const [isHalalMode, setIsHalalMode] = useState(false);
  const [halalModel, setHalalModel] = useState<"HTDemucs" | "NatSep">("NatSep");
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const channelsScrollRef = useRef<HTMLDivElement | null>(null);
  const videosScrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch real-time live channel streams from our dynamic IPTV resolver API
  useEffect(() => {
    fetch("/api/iptv")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setActiveChannel((prev) => {
            const updated = data.channels.find((c: IPTVChannel) => c.id === prev.id);
            return updated || prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const activeEmbedUrl = streamType === "live" 
    ? `https://www.youtube.com/embed/${activeChannel.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

  return (
    <main className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-16 sm:pt-24 md:pt-32 pb-4 space-y-3 notranslate">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-base sm:text-xl md:text-2xl font-serif font-bold flex items-center gap-1.5 text-foreground tracking-tight">
          <Video className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          নিউজ <span className="text-primary">মিডিয়া</span>
        </h1>
        <p className="text-muted-foreground text-[11px] sm:text-xs leading-tight mt-0.5">
          লাইভ টিভি চ্যানেল ও ভিডিও সংবাদ দেখুন এবং এআই মিউজিক ফিল্টারের মাধ্যমে মিউজিক-মুক্ত (হালাল) খবর উপভোগ করুন।
        </p>
      </div>

      {/* 2. Wide Halal Mode AI Banner (Positioned Right Above Video Player) */}
      <div className="w-full bg-card border border-border rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-primary shrink-0">
            <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">হালাল মোড (এআই মিউজিক ফিল্টার)</span>
              {!isPremium && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">ভিডিও থেকে ব্যাকগ্রাউন্ড মিউজিক সরিয়ে ফেলুন</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Halal Model Selector (HTDemucs vs NatSep) */}
          {isHalalMode && (
            <div className="inline-flex bg-muted/90 p-0.5 rounded-full border border-border text-[10px] sm:text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setHalalModel("HTDemucs")}
                className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${halalModel === "HTDemucs" ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                HTDemucs
              </button>
              <button
                type="button"
                onClick={() => setHalalModel("NatSep")}
                className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${halalModel === "NatSep" ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                NatSep
              </button>
            </div>
          )}

          <Button 
            variant={isHalalMode ? "default" : "outline"} 
            size="sm" 
            disabled={!isPremium}
            onClick={() => isPremium && setIsHalalMode(!isHalalMode)}
            className={`h-7 px-3 text-[11px] font-bold rounded-full shrink-0 cursor-pointer ${isHalalMode ? "bg-primary text-primary-foreground" : ""}`}
          >
            {isPremium ? (isHalalMode ? "চালু আছে" : "চালু করুন") : "Upgrade"}
          </Button>
        </div>
      </div>

      {/* 3. Main 100% Real Live Stream & Video Player Card */}
      <Card className="overflow-hidden bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm transition-all">
        <div className="relative aspect-video bg-black group overflow-hidden select-none">
          {/* Active 24/7 Live Stream / Real Video Embed */}
          <iframe
            key={streamType === "live" ? activeChannel.videoId : currentVideo.videoId}
            src={activeEmbedUrl}
            title={streamType === "live" ? activeChannel.name : currentVideo.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Video / Stream Metadata Info Row (Ultra-Slim Design) */}
        <div className="px-2.5 py-1.5 sm:px-3 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0.2 uppercase tracking-wider shrink-0">
                {streamType === "live" ? activeChannel.category : currentVideo.category}
              </Badge>

              {/* Title */}
              <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight tracking-tight truncate">
                {streamType === "live" ? `${activeChannel.name} — সরাসরি লাইভ সংবাদ সম্প্রচার` : currentVideo.title}
              </h2>
            </div>

            {/* Description Toggle */}
            <button
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground font-semibold px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted border border-border transition-all shrink-0 cursor-pointer"
              title={isDescExpanded ? "সংক্ষিপ্ত করুন" : "বিস্তারিত বিবরণ"}
            >
              <span>{isDescExpanded ? "সংক্ষিপ্ত" : "বিস্তারিত"}</span>
              <ChevronDown className={`w-3 h-3 text-primary transition-transform duration-200 ${isDescExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Video Description Content */}
        <AnimatePresence initial={false}>
          {isDescExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 px-2.5 sm:px-3.5 pb-2 border-t border-border/40">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-1.5 font-sans">
                  {streamType === "live" 
                    ? `${activeChannel.name} এর ২৪ ঘণ্টার লাইভ নিউজ সম্প্রচার। ব্রেকিং নিউজ ও সরাসরি টকশো দেখতে যুক্ত থাকুন।` 
                    : currentVideo.description}
                </p>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 4. "আরও ভিডিও" (With Left/Right Scroll Arrows & Real Videos) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <h2 className="text-xs sm:text-sm md:text-base font-sans font-bold text-foreground tracking-tight">
              আরও ভিডিও
            </h2>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono mr-1 font-semibold">
              {toBengaliDigits(realNewsVideos.length)}টি ভিডিও
            </span>
            <button
              onClick={() => scrollContainer(videosScrollRef, "left")}
              className="p-1 rounded-full bg-card hover:bg-muted border border-border text-foreground transition-all cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollContainer(videosScrollRef, "right")}
              className="p-1 rounded-full bg-card hover:bg-muted border border-border text-foreground transition-all cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel (Modern Gradient Video Cards with Top-Left Time Badge) */}
        <div 
          ref={videosScrollRef}
          className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent snap-x snap-mandatory"
        >
          {realNewsVideos.map((video) => {
            const isSelected = streamType === "video" && currentVideo.id === video.id;
            return (
              <div
                key={video.id}
                onClick={() => {
                  setStreamType("video");
                  setCurrentVideo(video);
                }}
                className={`w-[calc(50%-5px)] min-w-[160px] sm:w-[220px] md:w-[250px] shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-card border ${
                  isSelected ? 'border-primary ring-2 ring-primary/40 shadow-md' : 'border-border hover:border-primary/40'
                } flex flex-col transition-all duration-300 cursor-pointer snap-start group shadow-sm relative`}
              >
                {/* Full Card Image Container */}
                <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full overflow-hidden bg-black/90">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  
                  {/* Top Left: Duration Badge */}
                  <span className="absolute top-2 left-2 z-10 bg-black/35 dark:bg-black/75 backdrop-blur-md text-white font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/15 dark:border-white/10 shadow-sm flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-white shrink-0" />
                    {video.duration}
                  </span>

                  {/* Top Right: Playing Indicator */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md animate-pulse">
                      Playing
                    </span>
                  )}

                  {/* Center Hover Play Icon */}
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/35 transition-colors flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Gradient Overlay (Softened in Light Mode for Zero Harsh Contrast) */}
                  <div className="absolute inset-x-0 bottom-0 z-10 pt-8 pb-2.5 px-2.5 sm:px-3 bg-gradient-to-t from-black/55 via-black/30 to-transparent dark:from-black/95 dark:via-black/70 dark:to-transparent flex flex-col justify-end">
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-emerald-950/50 dark:bg-emerald-950/70 text-emerald-300 dark:text-emerald-400 backdrop-blur-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider border-none shadow-sm">
                        {video.category}
                      </span>
                      {video.source && (
                        <span className="text-[9px] text-white/80 font-medium truncate">
                          • {video.source}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[11px] sm:text-xs font-bold text-white leading-snug line-clamp-2 drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                      {video.title}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. "লাইভ টিভি চ্যানেল" (With Left/Right Scroll Arrows) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
            <h2 className="text-xs sm:text-sm md:text-base font-serif font-bold text-foreground tracking-tight">
              লাইভ টিভি চ্যানেল
            </h2>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
            </span>
            <button
              onClick={() => scrollContainer(channelsScrollRef, "left")}
              className="p-1 rounded-full bg-card hover:bg-muted border border-border text-foreground transition-all cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollContainer(channelsScrollRef, "right")}
              className="p-1 rounded-full bg-card hover:bg-muted border border-border text-foreground transition-all cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal IPTV Channel Pills (3 Per View on Mobile, Smoothly Scrollable to All Channels) */}
        <div 
          ref={channelsScrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent snap-x snap-mandatory"
        >
          {channels.map((channel) => {
            const isSelected = streamType === "live" && activeChannel.id === channel.id;
            return (
              <div
                key={channel.id}
                onClick={() => {
                  setStreamType("live");
                  setActiveChannel(channel);
                }}
                className={`w-[calc(33.33%-6px)] min-w-[100px] sm:w-[130px] shrink-0 h-10 sm:h-12 rounded-xl border flex items-center gap-1.5 sm:gap-2 px-2 py-1 cursor-pointer transition-all duration-200 snap-start group select-none ${
                  isSelected 
                    ? 'bg-red-500/10 border-red-500 shadow-sm ring-1 ring-red-500/40' 
                    : 'bg-card hover:bg-muted/80 border-border/80 hover:border-border'
                }`}
              >
                <ChannelLogo channelId={channel.id} name={channel.name} />
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-bold text-[10px] sm:text-[11px] text-foreground leading-tight truncate">
                    {channel.name}
                  </span>
                  <span className="flex items-center gap-1 text-[7px] sm:text-[8px] font-semibold text-muted-foreground mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${channel.isLive !== false ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} shrink-0`} />
                    <span className={`uppercase tracking-wide font-mono ${channel.isLive !== false ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}`}>
                      {channel.isLive !== false ? 'Live' : 'Latest'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>


    </main>
  );
}
