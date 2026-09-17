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
  const [selectedCountry, setSelectedCountry] = useState("BD");
  const [currentDate, setCurrentDate] = useState("");
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [podcastDuration, setPodcastDuration] = useState<number | null>(null);
  const [podcastStoredScript, setPodcastStoredScript] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kahf_user_country");
    if (saved) setSelectedCountry(saved.toUpperCase());

    const handleCountryChange = (e: any) => {
      const c = e.detail?.country || localStorage.getItem("kahf_user_country");
      if (c) setSelectedCountry(c.toUpperCase());
    };

    window.addEventListener("kahf-country-changed", handleCountryChange);
    return () => window.removeEventListener("kahf-country-changed", handleCountryChange);
  }, []);

  const isArabic = selectedCountry === "SA";
  const isGlobal = selectedCountry === "GLOBAL" || selectedCountry === "UK";

  const { news, loading } = useNews({ country: selectedCountry });

  useEffect(() => {
    const locale = isArabic ? "ar-SA" : isGlobal ? "en-US" : "bn-BD";
    setCurrentDate(
      new Date().toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );

    async function loadExistingPodcast() {
      try {
        const res = await fetch(`/api/podcast/generate?country=${selectedCountry}`);
        const json = await res.json();
        if (json.success && json.podcast) {
          if (json.podcast.audio_url) setPodcastAudioUrl(json.podcast.audio_url);
          if (json.podcast.duration) setPodcastDuration(json.podcast.duration);
          if (json.podcast.script) setPodcastStoredScript(json.podcast.script);
        } else {
          setPodcastAudioUrl(null);
          setPodcastDuration(null);
          setPodcastStoredScript(null);
        }
      } catch (e) {
        setPodcastAudioUrl(null);
        setPodcastDuration(null);
        setPodcastStoredScript(null);
      }
    }
    loadExistingPodcast();
  }, [selectedCountry, isArabic, isGlobal]);

  if (loading) {
    return (
      <main className="max-w-[800px] mx-auto px-4 pt-32 pb-32 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    );
  }

  // Aggregate summary points
  const keyPoints = news.slice(0, 5).map((n: any) => ({
    id: n.id || n._id,
    title: n.headline || n.title,
    summary: cleanMarkdown(n.ai_summary || n.summary || ""),
    category: n.category,
    audio_bn_summary: n.audio_bn_summary,
    audio_bn_full: n.audio_bn_full,
    audio_en_summary: n.audio_en_summary,
    audio_en_full: n.audio_en_full,
  }));

  const newsSummaryList = keyPoints
    .map((p, i) => {
      if (isArabic) return `الخبر ${i + 1}: ${p.title}. ${p.summary}`;
      if (isGlobal) return `Story ${i + 1}: ${p.title}. ${p.summary}`;
      return `খবর ${i + 1}: ${p.title}। ${p.summary}`;
    })
    .join('. ');

  const fallbackPodcastScript = isArabic
    ? `أهلاً بكم في بودكاست كهف الإخباري بالذكاء الاصطناعي! اليوم هو ${currentDate || "اليوم"}. حالة الطقس في الرياض: درجة الحرارة حوالي 34 مئوية، والجو سماء صافية. إليكم تفاصيل أهم الأخبار اليوم: ${newsSummaryList || "نوافيكم بآخر المستجدات الإخبارية"}. شكراً لاستماعكم لبودكاست كهف ونتمنى لكم يوماً رائعاً!`
    : isGlobal
    ? `Welcome to KahfNews Special AI Podcast! Today is ${currentDate || "today"}. Local weather: around 18°C, Clear sky. Here are today's top stories: ${newsSummaryList || "We are tracking the latest stories across the globe"}. Thank you for listening to KahfNews!`
    : `শুভ সকাল! আজ ${currentDate || "আজকের দিন"}। কহাফ নিউজের স্পেশাল এআই পডকাস্টে আপনাকে স্বাগতম। আজকের আবহাওয়া: তাপমাত্রা প্রায় ২৯ ডিগ্রি সেলসিয়াস, আবহাওয়া পরিষ্কার। এবার দেখে নেওয়া যাক আজকের প্রধান খবরগুলো: ${newsSummaryList || "তাজা সংবাদের বিস্তারিত আপডেট নিয়ে আসছি"}। কহাফ নিউজের সাথে থাকার জন্য ধন্যবাদ। দিনটি আপনার শুভ হোক!`;

  const activeScript = podcastStoredScript || fallbackPodcastScript;
  const calculatedDurationSec = Math.max(30, Math.round(activeScript.replace(/[*_#`[\]()]/g, "").trim().length / 13));
  const dynamicDurationSec = podcastDuration || calculatedDurationSec;

  const formatDurationString = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} sec`;
    return `${mins}:${secs < 10 ? "0" : ""}${secs} min`;
  };

  const podcastDurationStr = formatDurationString(dynamicDurationSec);

  const handlePlayAudio = () => {
    const preferredLang = isArabic ? 'AR' : isGlobal ? 'EN' : 'BN';
    const audioLangParam = isArabic ? 'ar' : isGlobal ? 'en' : 'bn';
    const generatedAudio = podcastAudioUrl || `/api/audio/tts?text=${encodeURIComponent(activeScript.slice(0, 800))}&lang=${audioLangParam}`;

    const podcastTitle = isArabic
      ? `بودكاست كهف اليومي - ${currentDate}`
      : isGlobal
      ? `Today's AI Podcast - ${currentDate}`
      : `আজকের এআই পডকাস্ট - ${currentDate}`;

    const event = new CustomEvent('play-audio', {
      detail: {
        id: 'daily-podcast',
        title: podcastTitle,
        summary: activeScript,
        preferredType: 'summary',
        preferredLang: preferredLang,
        audioUrls: {
          bn_summary: !isGlobal ? generatedAudio : undefined,
          en_summary: isGlobal ? generatedAudio : undefined,
        },
      },
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
        <span className="text-[12px] font-bold uppercase tracking-wider">
          {isArabic ? "العودة للأخبار" : isGlobal ? "Back to Feed" : "ফিডে ফিরে যান"}
        </span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
              {isArabic ? "موجز إخباري يومي" : isGlobal ? "DAILY BRIEFING" : "ডেইলি ব্রিফিং"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-muted/90 text-foreground border border-border text-[10px] font-mono font-bold rounded-full shadow-sm whitespace-nowrap">
              <Clock className="w-3 h-3 text-primary shrink-0" />
              <span>{podcastDurationStr}</span>
            </span>
            <span className="text-border">•</span>
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">{currentDate}</span>
          </div>

          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug tracking-tight notranslate">
            {isArabic ? (
              <>بودكاست كهف بالذكاء الاصطناعي: <span className="text-primary">التحليل الشامل لأخبار اليوم</span></>
            ) : isGlobal ? (
              <>AI Podcast: <span className="text-primary">Comprehensive Analysis of Today's News</span></>
            ) : (
              <>এআই পডকাস্ট: <span className="text-primary">আজকের খবরের সম্পূর্ণ বিশ্লেষণ</span></>
            )}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isArabic ? (
              `أهم الأخبار اليومية المختارة بعناية للمنطقة والعالم. استمع أو اقرأ في ${podcastDurationStr} فقط.`
            ) : isGlobal ? (
              `Curated analysis of today's most important headlines across the world. Read or listen in just ${podcastDurationStr}.`
            ) : (
              `আপনার জন্য আজকের সবচেয়ে গুরুত্বপূর্ণ খবরগুলো বাছাই করে তৈরি করা হয়েছে এই সারসংক্ষেপ। পড়ুন অথবা শুনুন, মাত্র ${podcastDurationStr}-এ।`
            )}
          </p>
        </div>

        {/* Top Right Listen Action Button */}
        <div className="shrink-0 pt-1 sm:pt-0">
          <Button
            onClick={handlePlayAudio}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-xs sm:text-sm gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>
              {isArabic ? "استمع الآن (Listen)" : isGlobal ? "Listen Now" : "শুনুন (Listen)"}
            </span>
          </Button>
        </div>
      </div>

      {/* Everyday Morning Briefing: Weather & Guide Card */}
      <div className="mb-6 p-4 sm:p-5 bg-card border border-primary/20 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-card">
        <h3 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {isArabic ? "حالة الطقس والتنقل اليوم" : isGlobal ? "Today's Weather & Daily Overview" : "আজকের আবহাওয়া, রোদ-বৃষ্টি ও ট্রাফিক গাইডলাইন"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
          <div className="p-3 bg-muted/40 rounded-xl border border-border">
            <span className="font-bold text-foreground block mb-1">
              {isArabic ? "🌤️ الطقس:" : isGlobal ? "🌤️ Local Weather:" : "🌤️ আবহাওয়া ও ছাতা টিপস:"}
            </span>
            {isArabic 
              ? "درجة الحرارة حوالي 34°C، سماء صافية ومشمسة. يوم موفق!" 
              : isGlobal 
              ? "Expected around 18°C with clear skies. Have a productive day ahead!" 
              : "তাপমাত্রা প্রায় ২৯°C, পরিষ্কার আকাশ। তীব্র রোদ এড়াতে প্রয়োজনে ছাতা বা সানগ্লাস সঙ্গে নিয়ে বের হোন।"}
          </div>
          <div className="p-3 bg-muted/40 rounded-xl border border-border">
            <span className="font-bold text-foreground block mb-1">
              {isArabic ? "🚗 حركة المرور:" : isGlobal ? "🚗 Transit & Mobility:" : "🚗 ট্রাফিক ও সড়ক পরিস্থিতি:"}
            </span>
            {isArabic 
              ? "حركة السير اعتيادية على المحاور الرئيسية مع بعض الضغط في ساعات الصباح الأولى." 
              : isGlobal 
              ? "Moderate morning movement across key city avenues. Allow ample transit time." 
              : "শহরের প্রধান মোড়গুলোতে সকালের স্বাভাবিক গাড়ি চলাচলের চাপ রয়েছে। গন্তব্যে বের হওয়ার আগে অতিরিক্ত সময় হাতে রাখুন।"}
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
              {isArabic ? "ملخص الأخبار اليومية" : isGlobal ? "Today's Briefing & Analysis" : "আজকের সারসংক্ষেপ"}
            </h2>
            <div className="text-sm md:text-base leading-relaxed text-foreground/90 font-normal space-y-4">
              {keyPoints.length === 0 ? (
                <p className="text-muted-foreground italic text-sm">
                  {isArabic ? "جاري تحميل الأخبار..." : isGlobal ? "Loading latest global briefing..." : "সংবাদের সারসংক্ষেপ প্রস্তুত করা হচ্ছে..."}
                </p>
              ) : (
                keyPoints.map((p, idx) => (
                  <p key={idx} className="leading-relaxed">{p.summary}</p>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="p-4 bg-muted/40 rounded-2xl border border-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {isArabic ? "معلومات الموجز" : isGlobal ? "Briefing Details" : "সারসংক্ষেপ তথ্য"}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "عدد الأخبار:" : isGlobal ? "Total Stories:" : "মোট খবর:"}</span>
                <span className="text-foreground font-bold">{news.length} {isArabic ? "خبر" : isGlobal ? "stories" : "টি"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "وقت القراءة:" : isGlobal ? "Reading Time:" : "পড়ার সময়:"}</span>
                <span className="text-foreground font-bold">5 {isArabic ? "دقائق" : "min"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "مدة الاستماع:" : isGlobal ? "Listening Time:" : "শোনার সময়:"}</span>
                <span className="text-foreground font-bold">{podcastDurationStr}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl border border-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              {isArabic ? "أهم الأخبار" : isGlobal ? "Featured Stories" : "সংবাদের উৎস"}
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
                      {point.category || "News"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <AudioPlayer newsItems={keyPoints} />
    </motion.main>
  );
}
