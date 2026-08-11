"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import HeadlineSlider from "@/components/HeadlineSlider";
import MainFeed from "@/components/MainFeed";
import AudioPlayer from "@/components/AudioPlayer";
import BreakingNewsTicker from "@/components/BreakingNewsTicker";
import { useNews, useWeather } from "@/hooks/useNews";
import { Newspaper, Loader2, Calendar, Sparkles, CloudSun, Play, FileText, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const { news, loading: newsLoading } = useNews();
  const { weather } = useWeather();
  const { data: sessionData } = useSession();
  
  const isPremium = (sessionData?.user as any)?.tier === "premium" || (sessionData?.user as any)?.role === "admin";

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Set current date
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    setCurrentDate(date);

    return () => clearTimeout(timer);
  }, []);

  // Transform news for headlines (top 3 with images)
  const headlines = news.slice(0, 3).map((item: any) => ({
    id: item._id || item.id,
    title: item.headline || item.title,
    category: item.category,
    imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1590644365607-1c5a519a7a37?q=80&w=2070&auto=format&fit=crop",
    source: item.source,
  }));

  // Transform news for main feed
  const feedItems = news.map((item: any, index: number) => ({
    id: item._id || item.id || `news-${index}`,
    title: item.headline || item.title,
    summary: item.ai_summary || item.summary || "সংক্ষিপ্ত বিবরণ পাওয়া যায়নি।",
    source: item.source || "KahfNews",
    category: item.category || "General",
    priority: item.priority || "medium",
    publishedAt: item.published_at || item.publishedAt 
      ? new Date(item.published_at || item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : "Today",
    imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1590644365607-1c5a519a7a37?q=80&w=2070&auto=format&fit=crop",
  }));

  const totalStories = news.length || 0;

  if (isLoading || newsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm">আপনার কাস্টমাইজড খবর লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <motion.main 
      className="max-w-[1400px] mx-auto px-3 md:px-6 lg:px-8 pt-24 md:pt-36 pb-32 md:pb-48"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome Header - Visual Hierarchy */}
      <motion.section variants={itemVariants} className="mb-10 md:mb-14">
        <BreakingNewsTicker items={headlines.map((h: any) => h.title)} />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-[13px] font-medium">{currentDate}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] text-foreground font-serif leading-tight notranslate">
              আপনার <span className="text-primary">দৈনিক সারসংক্ষেপ</span>
            </h1>
            <p className="text-body text-muted-foreground mt-2 max-w-lg notranslate">
              এআই দ্বারা বাছাইকৃত খবরের সাথে আপডেট থাকুন। আজ 
              <span className="text-foreground font-medium"> {totalStories}টি খবর</span> রয়েছে।
            </p>
          </div>
          
          {/* Quick Stats & Weather */}
          <div className="flex flex-col items-end gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              {/* Premium CTA */}
              {!isPremium && (
                <Link href="/pricing" className="group hidden sm:block">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 rounded-full border border-zinc-200 shadow-sm transition-all cursor-pointer">
                    <Sparkles className="w-4 h-4 text-zinc-900" />
                    <span className="text-[12px] font-bold text-zinc-900 transition-colors">
                      Upgrade to premium for personalized news
                    </span>
                  </div>
                </Link>
              )}
              
              {/* Weather widget */}
              {weather && (
                <div className="flex items-center gap-3 px-4 py-2 glass rounded-full shadow-sm">
                  <CloudSun className="w-6 h-6 text-primary" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-foreground leading-none">{weather.temp}°C</span>
                    <span className="text-sm font-medium text-muted-foreground capitalize">{weather.description}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* Trial Banner */}
      {(sessionData?.user as any)?.trial_days_left !== undefined && (
        <motion.section variants={itemVariants} className="mb-10 md:mb-14">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-primary">7-Day Free Trial</h3>
                <p className="text-sm text-muted-foreground">You have <strong>{(sessionData?.user as any)?.trial_days_left} days</strong> left in your premium trial.</p>
              </div>
            </div>
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button size="sm" variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white font-bold">
                Upgrade Now
              </Button>
            </Link>
          </div>
        </motion.section>
      )}

      {/* AI Daily Briefing / Video Podcast Section */}
      <motion.section variants={itemVariants} className="mb-10 md:mb-16">
        <Link href="/news/daily-summary" className="block relative bg-card border border-border p-6 md:p-8 rounded-[32px] overflow-hidden group hover:border-primary/30 transition-colors shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10">
            <div className="flex items-start md:items-center gap-5 md:gap-6">
              {/* Play Button Icon - Visual interest */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500">
                <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
                    আজকের সারসংক্ষেপ
                  </span>
                  <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-2 leading-tight notranslate">
                  এআই পডকাস্ট: আজকের খবরের সম্পূর্ণ বিশ্লেষণ
                </h2>
                <p className="text-muted-foreground text-sm max-w-2xl notranslate">
                  আজকের প্রধান খবরগুলোতে থাকছে স্মার্ট সিটি প্রকল্পের নতুন উদ্যোগ, বিশ্ব অর্থনীতিতে মুদ্রাস্ফীতির প্রভাব এবং প্রযুক্তিতে এআই এর নতুন দিগন্ত।
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 z-10 mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const audioPlayerTrigger = document.getElementById("global-audio-trigger");
                  if (audioPlayerTrigger) audioPlayerTrigger.click();
                }}
                className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span className="notranslate">শুনুন</span>
              </button>
              <div className="h-12 px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 border border-border cursor-pointer">
                <FileText className="w-4 h-4" />
                <span className="notranslate">পড়ুন</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.section>

      {/* 1. HERO SECTION */}
      <div className="mb-10 md:mb-16">
        <motion.section variants={itemVariants} className="w-full">
          <HeadlineSlider headlines={headlines} />
        </motion.section>
      </div>

      {/* 2. MAIN CONTENT: ALL NEWS GRID */}
      <motion.div variants={itemVariants} className="w-full">
        <MainFeed newsItems={feedItems} />
      </motion.div>

      {/* 3. FLOATING AUDIO PLAYER */}
      <AudioPlayer storiesCount={totalStories || 7} newsItems={feedItems} />
    </motion.main>
  );
}
