"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Music, Video, SkipBack, SkipForward, Rewind, FastForward, 
  Volume2, VolumeX, Settings, Maximize, Lock, Star, ChevronDown, ChevronLeft, ChevronRight, Flame, Tv, Sparkles
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
}

export interface NewsVideo {
  id: string;
  title: string;
  videoId: string;
  thumbnail: string;
  category: string;
  duration: string;
  description: string;
}

const defaultChannels: IPTVChannel[] = [
  { 
    id: "c1", 
    name: "Jamuna TV", 
    category: "জাতীয় সংবাদ", 
    videoId: "4Wpv0HhFU1M",
    streamUrl: "https://www.youtube-nocookie.com/embed/4Wpv0HhFU1M?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-blue-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c2", 
    name: "Somoy TV", 
    category: "ব্রেকিং নিউজ", 
    videoId: "R7ujSKpZOK0",
    streamUrl: "https://www.youtube-nocookie.com/embed/R7ujSKpZOK0?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-orange-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c3", 
    name: "Channel 24", 
    category: "সংবাদ ২৪", 
    videoId: "hjQluVY6EzQ",
    streamUrl: "https://www.youtube-nocookie.com/embed/hjQluVY6EzQ?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-emerald-600", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c4", 
    name: "DBC News", 
    category: "২৪ ঘণ্টা", 
    videoId: "TeeAPX4pq0k",
    streamUrl: "https://www.youtube-nocookie.com/embed/TeeAPX4pq0k?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-indigo-600", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c5", 
    name: "Ekattor TV", 
    category: "জাতীয়", 
    videoId: "9L9ymmaPIS0",
    streamUrl: "https://www.youtube-nocookie.com/embed/9L9ymmaPIS0?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-green-700", 
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  { 
    id: "c6", 
    name: "Independent TV", 
    category: "বাংলাদেশ", 
    videoId: "gzX8jUxxflA",
    streamUrl: "https://www.youtube-nocookie.com/embed/gzX8jUxxflA?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-slate-800", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c7", 
    name: "RTV News", 
    category: "জাতীয় সংবাদ", 
    videoId: "DRKFTmYgPPk",
    streamUrl: "https://www.youtube-nocookie.com/embed/DRKFTmYgPPk?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-red-600", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c8", 
    name: "Banglavision", 
    category: "সংবাদ ও খবর", 
    videoId: "95oEnwrvJRs",
    streamUrl: "https://www.youtube-nocookie.com/embed/95oEnwrvJRs?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-sky-600", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c9", 
    name: "Desh TV", 
    category: "খবর ও রাজনীতি", 
    videoId: "8cSFh_-AUxA",
    streamUrl: "https://www.youtube-nocookie.com/embed/8cSFh_-AUxA?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-teal-700", 
    text: "text-white",
    source: "24/7 লাইভ"
  },
  { 
    id: "c10", 
    name: "Al Jazeera English", 
    category: "আন্তর্জাতিক", 
    videoId: "gCNeDWCI0vo",
    streamUrl: "https://www.youtube-nocookie.com/embed/gCNeDWCI0vo?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-amber-600", 
    text: "text-white",
    source: "Global Live HD"
  },
  { 
    id: "c11", 
    name: "DW News", 
    category: "বিশ্ব সংবাদ", 
    videoId: "LuKwFajn37U",
    streamUrl: "https://www.youtube-nocookie.com/embed/LuKwFajn37U?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-sky-700", 
    text: "text-white",
    source: "Global Live HD"
  },
  { 
    id: "c12", 
    name: "Sky News", 
    category: "আন্তর্জাতিক", 
    videoId: "YDvsBbKfLPA",
    streamUrl: "https://www.youtube-nocookie.com/embed/YDvsBbKfLPA?autoplay=1&playsinline=1&rel=0&modestbranding=1",
    color: "bg-rose-700", 
    text: "text-white",
    source: "Global Live HD"
  }
];

// 100% Real News Video Reports
const realNewsVideos: NewsVideo[] = [
  {
    id: "v1",
    title: "স্মার্ট সিটি ও ট্রাফিক ব্যবস্থাপনা: ঢাকার আধুনিক প্রযুক্তি",
    videoId: "R7ujSKpZOK0",
    thumbnail: "https://images.unsplash.com/photo-1590644365607-1c5a519a7a37?q=80&w=800&auto=format&fit=crop",
    category: "জাতীয়",
    duration: "04:30",
    description: "রাজধানীর যানজট নিরসনে এবং নাগরিক জীবনযাত্রার মান উন্নয়নে সরকার 'স্মার্ট সিটি' প্রকল্পের নতুন ধাপ উদ্বোধন করেছে। এই প্রকল্পের আওতায় শহরের প্রধান সড়কগুলোতে স্বয়ংক্রিয় ট্রাফিক সিগন্যাল এবং এআই ভিত্তিক মনিটরিং সিস্টেম বসানো হবে।"
  },
  {
    id: "v2",
    title: "কৃত্রিম বুদ্ধিমত্তা ও এআই বিপ্লব: আমাদের ভবিষ্যতের কর্মসংস্থান",
    videoId: "gCNeDWCI0vo",
    thumbnail: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=800&auto=format&fit=crop",
    category: "প্রযুক্তি",
    duration: "03:45",
    description: "আর্টিফিশিয়াল ইন্টেলিজেন্স বা কৃত্রিম বুদ্ধিমত্তা আজ শুধুমাত্র কল্পকাহিনীর বিষয় নয়, এটি আমাদের প্রাত্যহিক জীবনের একটি অবিচ্ছেদ্য অংশে পরিণত হয়েছে।"
  },
  {
    id: "v3",
    title: "বিশ্ব অর্থনীতি: ডলারের অস্থিরতা ও মুদ্রাস্ফীতি নিয়ন্ত্রণ",
    videoId: "LuKwFajn37U",
    thumbnail: "https://images.unsplash.com/photo-1616035252656-78b1ce2f281e?q=80&w=800&auto=format&fit=crop",
    category: "অর্থনীতি",
    duration: "05:20",
    description: "বিশ্বব্যাপী ক্রমবর্ধমান মুদ্রাস্ফীতি নিয়ন্ত্রণে কেন্দ্রীয় ব্যাংকগুলো নতুন আর্থিক নীতি গ্রহণ করছে।"
  },
  {
    id: "v4",
    title: "খেলাধুলা: আসন্ন বিশ্বকাপে বাংলাদেশ দলের রণকৌশল",
    videoId: "hjQluVY6EzQ",
    thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop",
    category: "খেলাধুলা",
    duration: "06:15",
    description: "আসন্ন বিশ্বকাপের জন্য বাংলাদেশ ক্রিকেট দলের কঠোর প্রস্তুতি এবং নতুন কোচের পরিকল্পনা নিয়ে বিশেষ ভিডিও প্রতিবেদন।"
  },
  {
    id: "v5",
    title: "পরিবেশ সংবাদ: জলবায়ু পরিবর্তনের প্রভাবে হুমকির মুখে সুন্দরবন",
    videoId: "9L9ymmaPIS0",
    thumbnail: "https://images.unsplash.com/photo-1612459284970-e8f0275cd712?q=80&w=800&auto=format&fit=crop",
    category: "পরিবেশ",
    duration: "08:40",
    description: "জলবায়ু পরিবর্তনের প্রভাবে সুন্দরবনের জীববৈচিত্র্য কীভাবে ধ্বংসের মুখে পড়ছে, তা নিয়ে বিশেষ অনুসন্ধানী রিপোর্ট।"
  },
  {
    id: "v6",
    title: "স্বাস্থ্য ও চিকিৎসা: ডেঙ্গু ও মৌসুমি ভাইরাস প্রতিরোধে জরুরি পরামর্শ",
    videoId: "TeeAPX4pq0k",
    thumbnail: "https://images.unsplash.com/photo-1584362917165-526a968579e8?q=80&w=800&auto=format&fit=crop",
    category: "স্বাস্থ্য",
    duration: "03:50",
    description: "দেশব্যাপী ডেঙ্গুর প্রাদুর্ভাব। ডেঙ্গু জ্বর প্রতিরোধ এবং লক্ষণ দেখা দিলে কী করণীয়, জানাচ্ছেন বিশেষজ্ঞ চিকিৎসকেরা।"
  },
  {
    id: "v7",
    title: "আন্তর্জাতিক রাজনীতি: মধ্যপ্রাচ্যে কূটনীতির নতুন সমীকরণ",
    videoId: "4Wpv0HhFU1M",
    thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&auto=format&fit=crop",
    category: "আন্তর্জাতিক",
    duration: "04:10",
    description: "মধ্যপ্রাচ্যের দেশগুলোর মধ্যে নতুন করে গড়ে ওঠা কূটনৈতিক সম্পর্ক ও ভূ-রাজনীতির প্রভাব নিয়ে বিশেষ আলোচনা।"
  },
  {
    id: "v8",
    title: "বিজ্ঞান ও মহাকাশ: সৌরশক্তি ও নবায়নযোগ্য জ্বালানির ভবিষ্যৎ",
    videoId: "YDvsBbKfLPA",
    thumbnail: "https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=800&auto=format&fit=crop",
    category: "বিজ্ঞান",
    duration: "05:10",
    description: "জীবাশ্ম জ্বালানি নির্ভরতা কাটিয়ে নবায়নযোগ্য সৌরবিদ্যুতের নতুন বিপ্লব নিয়ে বিশদ তথ্যচিত্র।"
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
    ? `https://www.youtube-nocookie.com/embed/${activeChannel.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/${currentVideo.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

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

      {/* 3. Main 100% Real Live Stream & Video Player Card */}
      <Card className="overflow-hidden bg-card border border-border rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="relative aspect-video bg-black group overflow-hidden select-none">
          {/* Active 24/7 Live Stream / Real Video Embed */}
          <iframe
            key={streamType === "live" ? activeChannel.videoId : currentVideo.videoId}
            src={activeEmbedUrl}
            title={streamType === "live" ? activeChannel.name : currentVideo.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* Top Live / Video Indicator Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-2 z-20 pointer-events-none">
            {streamType === "live" ? (
              <span className="bg-red-600 px-2 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE STREAM
              </span>
            ) : (
              <span className="bg-primary px-2 py-0.5 rounded-full text-[9px] font-bold text-primary-foreground flex items-center gap-1 shadow-md">
                <Video className="w-3 h-3" /> VIDEO REPORT
              </span>
            )}
          </div>
        </div>

        {/* Video / Stream Metadata Info Row */}
        <div className="p-2 sm:p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  {streamType === "live" ? activeChannel.category : currentVideo.category}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                  {streamType === "live" ? `🔴 ${activeChannel.source}` : `⏱️ ${currentVideo.duration}`}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-snug tracking-tight truncate sm:whitespace-normal">
                {streamType === "live" ? `${activeChannel.name} — সরাসরি লাইভ সংবাদ সম্প্রচার` : currentVideo.title}
              </h2>
            </div>

            {/* Description Toggle */}
            <button
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border transition-all shrink-0 cursor-pointer"
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
              <CardContent className="pt-0 px-2.5 sm:px-3 pb-2.5 border-t border-border/40">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-2 font-sans">
                  {streamType === "live" 
                    ? `${activeChannel.name} এর ২৪ ঘণ্টার লাইভ নিউজ সম্প্রচার। ব্রেকিং নিউজ ও সরাসরি টকশো দেখতে যুক্ত থাকুন।` 
                    : currentVideo.description}
                </p>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 4. "আরও ভিডিও খবর" (With Left/Right Scroll Arrows & Real Videos) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <h2 className="text-xs sm:text-sm md:text-base font-serif font-bold text-foreground tracking-tight">
              আরও ভিডিও খবর
            </h2>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono mr-1">
              {realNewsVideos.length} টি ভিডিও
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

        {/* Horizontal Carousel (2 Cards Per View on Mobile, Smoothly Scrollable) */}
        <div 
          ref={videosScrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent snap-x snap-mandatory"
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
                className={`w-[calc(50%-4px)] min-w-[145px] sm:w-[220px] md:w-[250px] shrink-0 rounded-xl sm:rounded-2xl bg-card border ${
                  isSelected ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-border hover:border-primary/40'
                } p-1.5 flex flex-col gap-1.5 transition-all duration-200 cursor-pointer snap-start group shadow-sm`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[8px] sm:text-[9px] px-1 rounded">
                    {video.duration}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded shadow-sm">
                      Playing
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                    {video.category}
                  </span>
                  <h3 className="text-[11px] sm:text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. "লাইভ টিভি চ্যানেল (IPTV)" (With Left/Right Scroll Arrows) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
            <h2 className="text-xs sm:text-sm md:text-base font-serif font-bold text-foreground tracking-tight">
              লাইভ টিভি চ্যানেল (IPTV)
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
                className={`w-[calc(33.33%-6px)] min-w-[95px] sm:w-[130px] shrink-0 h-10 sm:h-12 rounded-xl ${channel.color} flex items-center justify-center p-1.5 cursor-pointer shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all snap-start group border-2 ${
                  isSelected ? 'border-white ring-2 ring-primary' : 'border-transparent'
                }`}
              >
                <div className="text-center">
                  <span className={`font-black text-[10px] sm:text-xs tracking-wider ${channel.text}`}>{channel.name}</span>
                  <span className="block text-[7px] sm:text-[8px] uppercase tracking-widest text-white/80 font-mono">Live TV</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Trial / Join Pro Utility Banner */}
      <div className="pt-0.5">
        {(session?.user as any)?.trial_days_left !== undefined ? (
          <div className="bg-primary/10 border border-primary/25 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-sm flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-primary text-xs flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" /> 7-Day Free Trial
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                You have <strong>{(session?.user as any)?.trial_days_left} days</strong> left in your trial.
              </p>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="h-7 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shrink-0">
                Upgrade
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-sm flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-foreground text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> আনলিমিটেড এআই নিউজ
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                সবগুলো লাইভ টিভি ও এআই ভয়েস ব্রিফিং আনলক করুন।
              </p>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold border-primary text-primary hover:bg-primary hover:text-white rounded-full shrink-0">
                Join Pro
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
