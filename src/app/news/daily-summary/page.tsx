"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, Play, Volume2, FileText, Clock,
  Calendar, Globe, Tag, ExternalLink, Headphones, Info, Star, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNews } from "@/hooks/useNews";
import AudioPlayer from "@/components/AudioPlayer";

// Helper to remove raw markdown syntax like **bold**
const cleanMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
};

export default function DailySummaryPage() {
  const { news, loading } = useNews();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('bn-BD', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));
  }, []);

  if (loading) {
    return (
      <main className="max-w-[800px] mx-auto px-4 pt-32 pb-32 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    );
  }

  // Extract unique sources and topics from today's news
  const sources = Array.from(new Set(news.map((n: any) => n.source).filter(Boolean)));
  const topics = Array.from(new Set(news.map((n: any) => n.category).filter(Boolean)));
  
  // Aggregate summary points
  const keyPoints = news.slice(0, 5).map((n: any) => ({
    id: n.id || n._id,
    title: n.headline || n.title,
    summary: cleanMarkdown(n.ai_summary || n.summary || ""),
    category: n.category
  }));

  const handlePlayAudio = () => {
    const event = new CustomEvent('play-audio', {
      detail: {
        title: `আজকের খবরের সারসংক্ষেপ - ${currentDate}`,
        summary: keyPoints.map(p => p.summary).join(". ")
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.main
      className="max-w-[860px] mx-auto px-3 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28 font-sans"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3.5 sm:mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[12px] font-bold uppercase tracking-wider">Back to Feed</span>
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-3 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
              ডেইলি ব্রিফিং
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-muted/90 text-foreground border border-border text-[10px] font-mono font-bold rounded-full shadow-sm whitespace-nowrap">
              <Clock className="w-3 h-3 text-primary shrink-0" />
              <span>8 min</span>
            </span>
            <span className="text-border">•</span>
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">{currentDate}</span>
          </div>

          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug tracking-tight mb-2.5 notranslate">
            এআই পডকাস্ট: <span className="text-primary">আজকের খবরের সম্পূর্ণ বিশ্লেষণ</span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
            আপনার জন্য আজকের সবচেয়ে গুরুত্বপূর্ণ খবরগুলো বাছাই করে তৈরি করা হয়েছে এই সারসংক্ষেপ। পড়ুন অথবা শুনুন, মাত্র ৮ মিনিটে।
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <Button onClick={handlePlayAudio} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold py-2.5 text-xs sm:text-sm gap-2 shadow-sm transition-all">
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>শুনুন (Listen)</span>
            </Button>
            <Button variant="outline" className="w-full rounded-xl font-bold py-2.5 text-xs sm:text-sm gap-2 border-border hover:bg-muted text-foreground">
              <FileText className="w-4 h-4 shrink-0" />
              <span>পড়ুন (Read)</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Overall Summary Section */}
          <section className="bg-card border border-border p-5 md:p-7 rounded-2xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              আজকের সারসংক্ষেপ
            </h2>
            <div className="text-sm md:text-base leading-relaxed text-foreground/90 font-normal space-y-4">
              {keyPoints.map((p, idx) => (
                <p key={idx} className="leading-relaxed">{p.summary}</p>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="p-4 bg-muted/40 rounded-2xl border border-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              সারসংক্ষেপ তথ্য
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li className="flex justify-between">
                <span className="text-muted-foreground">মোট খবর:</span>
                <span className="text-foreground font-bold">{news.length} টি</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">পড়ার সময়:</span>
                <span className="text-foreground font-bold">৫ মিনিট</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">শোনার সময়:</span>
                <span className="text-foreground font-bold">৬.৫ মিনিট</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl border border-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              সংবাদের উৎস
            </h3>
            <div className="space-y-3">
              {keyPoints.map((point: any, idx: number) => (
                <div key={idx} className="p-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h4 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">{point.title}</h4>
                    <Link href={`/news/${point.id}`} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase tracking-wider">
                      {point.category || "খবর"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <AudioPlayer />
    </motion.main>
  );
}
