"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, Play, Volume2, FileText, Clock,
  Calendar, Globe, Tag, ExternalLink, Headphones, Info, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNews } from "@/hooks/useNews";

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
    summary: n.ai_summary || n.summary || "",
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
      className="max-w-[860px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
      </Link>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
              ডেইলি ব্রিফিং
            </span>
            <span className="text-border">•</span>
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">{currentDate}</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.2] tracking-tight mb-6 font-serif notranslate">
            এআই পডকাস্ট: <span className="text-primary">আজকের খবরের সম্পূর্ণ বিশ্লেষণ</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            আপনার জন্য আজকের সবচেয়ে গুরুত্বপূর্ণ খবরগুলো বাছাই করে তৈরি করা হয়েছে এই সারসংক্ষেপ। পড়ুন অথবা শুনুন, মাত্র ৫ মিনিটে।
          </p>

          <div className="flex flex-wrap gap-4">
            <Button onClick={handlePlayAudio} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold px-8 py-6 text-lg gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-105">
              <Volume2 className="w-5 h-5" />
              শুনুন (Listen)
            </Button>
            <Button variant="outline" className="rounded-full font-bold px-8 py-6 text-lg gap-2 border-primary/20 hover:bg-primary/5">
              <FileText className="w-5 h-5" />
              পড়ুন (Read)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-bold font-serif mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              মূল আকর্ষণ
            </h2>
            <div className="space-y-6">
              {keyPoints.map((point: any, idx: number) => (
                <div key={idx} className="p-5 bg-card/50 border border-border rounded-2xl hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-foreground leading-snug pr-4">{point.title}</h3>
                    <Link href={`/news/${point.id}`} className="shrink-0 p-2 bg-muted hover:bg-primary/10 hover:text-primary rounded-full transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-3">{point.summary}</p>
                  <Link href={`/news/${point.id}`}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-bold hover:bg-primary hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      {point.category || "খবর"}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="p-5 bg-muted/50 rounded-2xl border border-border">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              সারসংক্ষেপ তথ্য
            </h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex justify-between">
                <span className="text-muted-foreground">মোট খবর:</span>
                <span>{news.length} টি</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">পড়ার সময়:</span>
                <span>৫ মিনিট</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">শোনার সময়:</span>
                <span>৬.৫ মিনিট</span>
              </li>
            </ul>
          </div>

          <div className="p-5 bg-muted/50 rounded-2xl border border-border">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              তথ্যসূত্র সমূহ
            </h3>
            <div className="flex flex-wrap gap-2">
              {sources.map((src: string) => (
                <span key={src} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-foreground">
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
