"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Database, Play, Square, Link as LinkIcon, Settings, Key, Search, Plus, Trash2, Eye, EyeOff, Maximize2, Minimize2, Radio, Globe, RefreshCw, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

function InfoTooltip({ text, align = "center" }: { text: string; align?: "center" | "right" | "left" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const popupPositionClass =
    align === "right"
      ? "right-0"
      : align === "left"
      ? "left-0"
      : "left-1/2 -translate-x-1/2";

  const arrowPositionClass =
    align === "right"
      ? "right-2"
      : align === "left"
      ? "left-2"
      : "left-1/2 -translate-x-1/2";

  return (
    <div 
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary text-[10px] cursor-pointer border border-border/70 transition-all focus:outline-none"
        aria-label="Details"
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {isOpen && (
        <div className={`absolute bottom-full mb-2 w-64 p-2.5 bg-popover/95 text-popover-foreground text-[11px] leading-relaxed rounded-lg shadow-xl border border-border z-50 animate-in fade-in-0 zoom-in-95 duration-150 backdrop-blur-md ${popupPositionClass}`}>
          {text}
          <div className={`absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-border ${arrowPositionClass}`} />
        </div>
      )}
    </div>
  );
}

export default function AdminScrapingPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "user";
  const userTier = (session?.user as any)?.tier || "free";
  
  const isLocked = userRole !== "admin" && userTier !== "premium";

  const [urlToIngest, setUrlToIngest] = useState("");
  const [ingestCategory, setIngestCategory] = useState("General");
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestKeyword, setIngestKeyword] = useState("");

  // Sources Management
  const [sources, setSources] = useState<any[]>([]);
  const [activeSourceTab, setActiveSourceTab] = useState<"ALL" | "BD" | "GLOBAL" | "UK" | "SA">("ALL");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceCat, setNewSourceCat] = useState("General");
  const [newSourceCountry, setNewSourceCountry] = useState<"BD" | "GLOBAL" | "UK" | "SA">("BD");
  const [isSeedingSources, setIsSeedingSources] = useState(false);

  // News Automation - Auto Approve
  const [autoApprove, setAutoApprove] = useState(true);

  // News Automation - Scraping Schedule (Default 2 times/day: 7:00 AM & 7:00 PM)
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [scrapFrequency, setScrapFrequency] = useState("Daily");
  const [dailyTimesCount, setDailyTimesCount] = useState("2");
  const [scrapTimes, setScrapTimes] = useState<string[]>(["07:00", "19:00"]);
  const [weeklyDays, setWeeklyDays] = useState<string[]>(["Mon", "Wed", "Fri"]);

  // News Automation - AI Podcast Scheduler (Default 2 times/day: 7:10 AM & 7:10 PM)
  const [isPodcastScheduleEnabled, setIsPodcastScheduleEnabled] = useState(true);
  const [podcastFrequency, setPodcastFrequency] = useState("Daily");
  const [podcastDailyTimesCount, setPodcastDailyTimesCount] = useState("2");
  const [podcastTimes, setPodcastTimes] = useState<string[]>(["07:10", "19:10"]);
  const [podcastWeeklyDays, setPodcastWeeklyDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // API Keys
  const [apiKeys, setApiKeys] = useState<string[]>([""]);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});

  // Manual Scraping & Podcast Control
  const [isTriggeringRss, setIsTriggeringRss] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isTerminalFullscreen, setIsTerminalFullscreen] = useState(false);

  // Manual Control Filters
  const [targetCount, setTargetCount] = useState("5");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [defaultsSavedSuccess, setDefaultsSavedSuccess] = useState(false);

  const CATEGORIES = ["জাতীয়", "রাজনীতি", "অর্থনীতি", "খেলাধুলা", "প্রযুক্তি", "আন্তর্জাতিক", "General"];

  // Load last persisted logs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kahf_scrape_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScrapeLogs(parsed);
        }
      }
    } catch (e) {}
  }, []);

  // Internal terminal container scroll (never scrolls the whole window)
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [scrapeLogs]);

  const toggleKeyVisibility = (index: number) => {
    setVisibleKeys(prev => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const resSources = await fetch("/api/sources");
      if (resSources.ok) {
        const { sources: sourcesData } = await resSources.json();
        if (sourcesData) setSources(sourcesData);
      }

      const resSettings = await fetch("/api/settings");
      if (resSettings.ok) {
        const { settings: settingsData } = await resSettings.json();
        if (settingsData) {
          // Auto Approve
          const autoSetting = settingsData.find((s: any) => s.setting_key === "auto_approve_news");
          if (autoSetting) setAutoApprove(autoSetting.setting_value === "true");

          // Scraping Schedule
          const scrEn = settingsData.find((s: any) => s.setting_key === "scraping_schedule_enabled");
          if (scrEn) setIsScheduleEnabled(scrEn.setting_value !== "false");

          const scrFreq = settingsData.find((s: any) => s.setting_key === "scraping_frequency");
          if (scrFreq?.setting_value) setScrapFrequency(scrFreq.setting_value);

          const scrCount = settingsData.find((s: any) => s.setting_key === "scraping_daily_count");
          if (scrCount?.setting_value) setDailyTimesCount(scrCount.setting_value);

          const scrTimes = settingsData.find((s: any) => s.setting_key === "scraping_times");
          if (scrTimes?.setting_value) {
            try {
              const parsed = JSON.parse(scrTimes.setting_value);
              if (Array.isArray(parsed) && parsed.length > 0) setScrapTimes(parsed);
            } catch (e) {}
          }

          const scrDays = settingsData.find((s: any) => s.setting_key === "scraping_weekly_days");
          if (scrDays?.setting_value) {
            try {
              const parsed = JSON.parse(scrDays.setting_value);
              if (Array.isArray(parsed)) setWeeklyDays(parsed);
            } catch (e) {}
          }

          // AI Podcast Scheduler
          const podEn = settingsData.find((s: any) => s.setting_key === "podcast_schedule_enabled");
          if (podEn) setIsPodcastScheduleEnabled(podEn.setting_value !== "false");

          const podFreq = settingsData.find((s: any) => s.setting_key === "podcast_frequency");
          if (podFreq?.setting_value) setPodcastFrequency(podFreq.setting_value);

          const podCount = settingsData.find((s: any) => s.setting_key === "podcast_daily_count");
          if (podCount?.setting_value) setPodcastDailyTimesCount(podCount.setting_value);

          const podTimes = settingsData.find((s: any) => s.setting_key === "podcast_times");
          if (podTimes?.setting_value) {
            try {
              const parsed = JSON.parse(podTimes.setting_value);
              if (Array.isArray(parsed) && parsed.length > 0) setPodcastTimes(parsed);
            } catch (e) {}
          }

          const podDays = settingsData.find((s: any) => s.setting_key === "podcast_weekly_days");
          if (podDays?.setting_value) {
            try {
              const parsed = JSON.parse(podDays.setting_value);
              if (Array.isArray(parsed)) setPodcastWeeklyDays(parsed);
            } catch (e) {}
          }

          // Defaults
          const catSetting = settingsData.find((s: any) => s.setting_key === "automation_default_category");
          if (catSetting?.setting_value) setSelectedCategory(catSetting.setting_value);

          const countSetting = settingsData.find((s: any) => s.setting_key === "automation_default_limit");
          if (countSetting?.setting_value) setTargetCount(countSetting.setting_value);

          const countrySetting = settingsData.find((s: any) => s.setting_key === "automation_default_country");
          if (countrySetting?.setting_value) setSelectedCountry(countrySetting.setting_value);

          // Gemini API Keys
          const keySetting = settingsData.find((s: any) => s.setting_key === "global_gemini_api_keys");
          if (keySetting) {
            try {
              const parsed = JSON.parse(keySetting.setting_value);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setApiKeys(parsed);
              } else {
                setApiKeys([""]);
              }
            } catch (e) {
              setApiKeys([""]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
    }
  };

  const handleSaveAutomationDefaults = async () => {
    setIsSavingDefaults(true);
    await saveSetting("automation_default_limit", targetCount);
    await saveSetting("automation_default_category", selectedCategory);
    await saveSetting("automation_default_country", selectedCountry);
    setIsSavingDefaults(false);
    setDefaultsSavedSuccess(true);
    setTimeout(() => setDefaultsSavedSuccess(false), 2500);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);

    // Save News Automation
    await saveSetting("auto_approve_news", autoApprove.toString());
    await saveSetting("scraping_schedule_enabled", isScheduleEnabled.toString());
    await saveSetting("scraping_frequency", scrapFrequency);
    await saveSetting("scraping_daily_count", dailyTimesCount);
    await saveSetting("scraping_times", JSON.stringify(scrapTimes));
    await saveSetting("scraping_weekly_days", JSON.stringify(weeklyDays));

    // Save AI Podcast Scheduler
    await saveSetting("podcast_schedule_enabled", isPodcastScheduleEnabled.toString());
    await saveSetting("podcast_frequency", podcastFrequency);
    await saveSetting("podcast_daily_count", podcastDailyTimesCount);
    await saveSetting("podcast_times", JSON.stringify(podcastTimes));
    await saveSetting("podcast_weekly_days", JSON.stringify(podcastWeeklyDays));

    // Defaults
    await saveSetting("automation_default_limit", targetCount);
    await saveSetting("automation_default_category", selectedCategory);
    await saveSetting("automation_default_country", selectedCountry);
    
    // Save API keys
    const validKeys = apiKeys.filter(k => k.trim() !== "");
    await saveSetting("global_gemini_api_keys", JSON.stringify(validKeys));
    if (validKeys.length === 0) setApiKeys([""]);
    else setApiKeys(validKeys);
    
    setIsSavingSettings(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Direct Ingestion
  const handleDirectIngest = async () => {
    if (!urlToIngest) return;
    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToIngest, category: ingestCategory }),
      });
      if (res.ok) {
        alert("Processing started for this URL!");
        setUrlToIngest("");
      } else {
        alert("Failed to start processing.");
      }
    } catch (e) {
      console.error(e);
    }
    setIsIngesting(false);
  };

  // Sources Actions
  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) return;
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD",
        payload: {
          name: newSourceName,
          url: newSourceUrl,
          category: newSourceCat,
          country: newSourceCountry,
        }
      })
    });
    if (res.ok) {
      setNewSourceName("");
      setNewSourceUrl("");
      fetchData();
    }
  };

  const handleDeleteSource = async (id: string) => {
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE", payload: { id } })
    });
    fetchData();
  };

  const handleToggleSource = async (id: string, current: boolean) => {
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE", payload: { id, is_active: !current } })
    });
    fetchData();
  };
  
  const handleLoadDefaultSources = async () => {
    setIsSeedingSources(true);
    const countryToSeed = activeSourceTab === "ALL" ? "ALL" : activeSourceTab;
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SEED", payload: { country: countryToSeed } })
    });
    await fetchData();
    setIsSeedingSources(false);
  };

  // Filtered Sources based on Country Filter
  const filteredSources = sources.filter((s) => {
    if (activeSourceTab === "ALL") return true;
    return (s.country || "BD").toUpperCase() === activeSourceTab;
  });

  const bdCount = sources.filter(s => (s.country || "BD").toUpperCase() === "BD").length;
  const globalCount = sources.filter(s => (s.country || "").toUpperCase() === "GLOBAL").length;
  const ukCount = sources.filter(s => (s.country || "").toUpperCase() === "UK").length;
  const saCount = sources.filter(s => (s.country || "").toUpperCase() === "SA").length;

  // Manual Scraping Trigger
  const handleTriggerEmergencyScrape = async () => {
    setIsTriggeringRss(true);
    const getNowTime = () => new Date().toLocaleTimeString('en-US', { hour12: true });
    
    const totalTarget = Math.max(1, parseInt(targetCount || "5", 10));
    const CHUNK_SIZE = 2; // 2 articles per chunk for guaranteed fast execution
    const totalBatches = Math.ceil(totalTarget / CHUNK_SIZE);

    let allLogs: string[] = [
      ...scrapeLogs,
      `\n[${getNowTime()}] 🚀 Initiating Ingestion Pipeline for ${totalTarget} article(s) (${totalBatches} batch(es)) [Country: "${selectedCountry}", Category: "${selectedCategory}"]...`,
    ];
    setScrapeLogs([...allLogs]);
    try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}

    try {
      for (let batch = 1; batch <= totalBatches; batch++) {
        const currentBatchLimit = Math.min(CHUNK_SIZE, totalTarget - (batch - 1) * CHUNK_SIZE);
        
        allLogs = [
          ...allLogs,
          `\n[${getNowTime()}] 📦 [Batch ${batch}/${totalBatches}] Processing ${currentBatchLimit} article(s)...`,
        ];
        setScrapeLogs([...allLogs]);
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}

        const response = await fetch(`/api/ingest/trigger-rss?limit=${currentBatchLimit}&category=${encodeURIComponent(selectedCategory)}&country=${encodeURIComponent(selectedCountry)}`);

        if (!response.ok) {
          let errBody = "";
          try { errBody = await response.text(); } catch (e) {}
          const errMsg = `[${getNowTime()}] ❌ [Batch ${batch} HTTP Error ${response.status}]: ${errBody || response.statusText || 'Unknown Server Error'}`;
          allLogs = [...allLogs, errMsg];
          setScrapeLogs([...allLogs]);
          try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}
          break;
        }

        if (!response.body) {
          throw new Error("Server returned 200 OK but response stream body is empty");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const line of parts) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.message) {
                  allLogs = [...allLogs, data.message];
                  setScrapeLogs([...allLogs]);
                  try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}
                }
              } catch (e) {}
            } else if (trimmed && !trimmed.startsWith(":") && !trimmed.startsWith("event:")) {
              allLogs = [...allLogs, trimmed];
              setScrapeLogs([...allLogs]);
              try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}
            }
          }
        }

        if (batch < totalBatches) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      allLogs = [...allLogs, `\n[${getNowTime()}] 🏁 Ingestion Pipeline Finished! All ${totalBatches} batch(es) completed.`];
      setScrapeLogs([...allLogs]);
      try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(allLogs)); } catch (e) {}
    } catch (e: any) {
      console.error(e);
      setScrapeLogs((prev) => {
        const updated = [...prev, `[${getNowTime()}] ❌ [Pipeline Exception]: ${e.message}`];
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(updated)); } catch (err) {}
        return updated;
      });
    } finally {
      setIsTriggeringRss(false);
    }
  };

  // Manual AI Podcast Generation Trigger (Supports Global, BD, UK, SA or All 1-by-1)
  const handleTriggerPodcast = async () => {
    setIsGeneratingPodcast(true);
    const getNowTime = () => new Date().toLocaleTimeString('en-US', { hour12: true });

    const countriesToGen = selectedCountry === "All"
      ? ["BD", "GLOBAL", "UK", "SA"]
      : [selectedCountry];

    let logs = [
      ...scrapeLogs,
      `\n[${getNowTime()}] 🎙️ [AI Podcast] Initiating podcast generation for ${countriesToGen.length} target(s): [${countriesToGen.join(", ")}]...`,
    ];
    setScrapeLogs(logs);
    try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(logs)); } catch (e) {}

    try {
      for (let i = 0; i < countriesToGen.length; i++) {
        const countryCode = countriesToGen[i];
        const countryDesc = countryCode === "BD"
          ? "🇧🇩 Bangladesh (Bengali)"
          : countryCode === "GLOBAL"
          ? "🌐 Global (English)"
          : countryCode === "UK"
          ? "🇬🇧 United Kingdom (English)"
          : "🇸🇦 Saudi Arabia (Arabic)";

        logs = [
          ...logs,
          `\n[${getNowTime()}] 🎙️ [Country ${i + 1}/${countriesToGen.length}]: Synthesizing bulletin for ${countryDesc}...`,
          `[${getNowTime()}] 📡 [Step 1] Fetching top published news & local weather forecast for ${countryCode}...`,
          `[${getNowTime()}] 🧠 [Step 2] Synthesizing comprehensive AI script with Gemini 3.6 Flash...`,
        ];
        setScrapeLogs([...logs]);
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(logs)); } catch (e) {}

        const res = await fetch("/api/podcast/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: countryCode }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || `Podcast generation failed for ${countryCode}`);
        }

        const pData = json.data || {};
        logs = [
          ...logs,
          `[${getNowTime()}] 🔊 [Step 3] Seamless Gemini TTS Audio synthesized successfully!`,
          `[${getNowTime()}] ☁️ [Step 4] Audio uploaded to Cloudinary: ${pData.audio_url || 'OK'}`,
          `[${getNowTime()}] 📁 [Step 5] Saved to Podcast Archives: "${pData.title}" (Duration: ~${pData.duration || 0}s, Stories: ${pData.topNewsCount || 0})`,
          `[${getNowTime()}] ✅ Finished bulletin for ${countryCode}!`,
        ];
        setScrapeLogs([...logs]);
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(logs)); } catch (e) {}

        if (i < countriesToGen.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      logs = [
        ...logs,
        `\n[${getNowTime()}] 🎉 AI Podcast Bulletin pipeline finished! All target podcasts are ready to broadcast.`,
      ];
      setScrapeLogs([...logs]);
      try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(logs)); } catch (e) {}
    } catch (err: any) {
      logs = [
        ...logs,
        `[${getNowTime()}] ❌ [Podcast Generation Error]: ${err.message}`,
      ];
      setScrapeLogs([...logs]);
      try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(logs)); } catch (e) {}
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Key className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Premium Feature Locked</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Personalized Scraping Control is a premium feature. Upgrade your account to manage your own news sources, API keys, and custom schedules.
        </p>
        <Link href="/pricing">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 rounded-full font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105">
            Upgrade to Premium
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Scraping Control</h1>
        <p className="text-muted-foreground mt-1">
          Manage automated scraping, direct URL ingestion, and system API settings.
        </p>
      </div>

      {/* 1. News Automation */}
      <Card className="bg-card/50 backdrop-blur-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            News Automation
          </CardTitle>
          <CardDescription>Configure auto-approval, automated scraping schedules, and AI podcast generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            
            {/* Auto Approve (Column 1 - perfectly symmetrical height) */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-3">
                  <SlidingToggle
                    id="switch-auto-approve"
                    checked={autoApprove}
                    onChange={(val: boolean) => {
                      setAutoApprove(val);
                      saveSetting("auto_approve_news", val.toString());
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="switch-auto-approve" className="text-sm font-semibold cursor-pointer">
                      Auto-Approve Scraped News
                    </Label>
                    <InfoTooltip text="Automatically publish scraped news without manual review. This bypasses the pending moderation queue." />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Automatically publish scraped news without manual review. This will bypass the pending queue.
                  </p>
                </div>
              </div>

              {/* Save Settings Action Button */}
              <div className="pt-2">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSavingSettings} 
                  className={`w-full h-9 transition-all font-semibold shadow-sm text-xs ${saveSuccess ? "!bg-emerald-600 !text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  {isSavingSettings ? "Saving..." : saveSuccess ? "✓ Settings Saved" : "Save Automation Settings"}
                </Button>
              </div>
            </div>

            {/* Scraping Schedule */}
            <div className={`space-y-3 md:border-l border-border md:pl-6 transition-opacity ${isScheduleEnabled ? "opacity-100" : "opacity-50"}`}>
              <div className="flex flex-col gap-3">
                <SlidingToggle
                  id="switch-scraping-schedule"
                  checked={isScheduleEnabled}
                  onChange={(val: boolean) => {
                    setIsScheduleEnabled(val);
                    saveSetting("scraping_schedule_enabled", val.toString());
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="switch-scraping-schedule" className="text-sm font-semibold cursor-pointer">
                    Scraping Schedule
                  </Label>
                  <InfoTooltip text="Automatically scrapes Bangladesh, Global, UK, and Saudi Arabia sources on configured schedule (Default: 7:00 AM & 7:00 PM)." />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <select 
                  className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  value={scrapFrequency} 
                  onChange={e => {
                    setScrapFrequency(e.target.value);
                    saveSetting("scraping_frequency", e.target.value);
                  }}
                  disabled={!isScheduleEnabled}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
                
                {scrapFrequency === "Daily" && (
                  <select 
                    className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    value={dailyTimesCount} 
                    disabled={!isScheduleEnabled}
                    onChange={e => {
                      const countVal = e.target.value;
                      setDailyTimesCount(countVal);
                      saveSetting("scraping_daily_count", countVal);
                      const count = parseInt(countVal, 10);
                      const defaults = ["07:00", "19:00", "13:00"];
                      const updated = Array(count).fill("07:00").map((_, i) => scrapTimes[i] || defaults[i] || "07:00");
                      setScrapTimes(updated);
                      saveSetting("scraping_times", JSON.stringify(updated));
                    }}
                  >
                    <option value="1">1 Time/Day</option>
                    <option value="2">2 Times/Day (7 AM, 7 PM)</option>
                    <option value="3">3 Times/Day</option>
                  </select>
                )}
              </div>
              
              {scrapFrequency === "Weekly" && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {DAYS.map(d => (
                    <Button 
                      key={d} 
                      size="sm" 
                      variant={weeklyDays.includes(d) ? "default" : "outline"}
                      className="h-7 text-[10px] px-2 rounded-full"
                      disabled={!isScheduleEnabled}
                      onClick={() => {
                        const updated = weeklyDays.includes(d) ? weeklyDays.filter(x => x !== d) : [...weeklyDays, d];
                        setWeeklyDays(updated);
                        saveSetting("scraping_weekly_days", JSON.stringify(updated));
                      }}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {scrapTimes.map((t, i) => {
                  const [h, m] = (t || "07:00").split(":");
                  const hour = parseInt(h || "7", 10);
                  const ampm = hour >= 12 ? "PM" : "AM";
                  const formattedHour = hour % 12 || 12;
                  const displayStr = `${formattedHour}:${(m || "00").padStart(2, "0")} ${ampm}`;

                  return (
                    <div key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-xl border border-border">
                      <Input 
                        type="time" 
                        className="w-[95px] h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 disabled:opacity-50 font-mono" 
                        value={t} 
                        disabled={!isScheduleEnabled}
                        onChange={e => {
                          const newT = [...scrapTimes];
                          newT[i] = e.target.value;
                          setScrapTimes(newT);
                          saveSetting("scraping_times", JSON.stringify(newT));
                        }} 
                      />
                      <span className="text-[10px] font-bold text-primary font-mono">{displayStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Podcast Scheduler */}
            <div className={`space-y-3 md:border-l border-border md:pl-6 transition-opacity ${isPodcastScheduleEnabled ? "opacity-100" : "opacity-50"}`}>
              <div className="flex flex-col gap-3">
                <SlidingToggle
                  id="switch-podcast-schedule"
                  checked={isPodcastScheduleEnabled}
                  onChange={(val: boolean) => {
                    setIsPodcastScheduleEnabled(val);
                    saveSetting("podcast_schedule_enabled", val.toString());
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="switch-podcast-schedule" className="text-sm font-semibold cursor-pointer">
                    AI Podcast Scheduler
                  </Label>
                  <InfoTooltip align="right" text="Automatically generates audio bulletin from fresh news with a 10m buffer after scheduled scraping completes (Default: 7:10 AM & 7:10 PM)." />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <select 
                  className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  value={podcastFrequency} 
                  onChange={e => {
                    setPodcastFrequency(e.target.value);
                    saveSetting("podcast_frequency", e.target.value);
                  }}
                  disabled={!isPodcastScheduleEnabled}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
                
                {podcastFrequency === "Daily" && (
                  <select 
                    className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    value={podcastDailyTimesCount} 
                    disabled={!isPodcastScheduleEnabled}
                    onChange={e => {
                      const countVal = e.target.value;
                      setPodcastDailyTimesCount(countVal);
                      saveSetting("podcast_daily_count", countVal);
                      const count = parseInt(countVal, 10);
                      const defaults = ["07:10", "19:10", "13:10"];
                      const updated = Array(count).fill("07:10").map((_, i) => podcastTimes[i] || defaults[i] || "07:10");
                      setPodcastTimes(updated);
                      saveSetting("podcast_times", JSON.stringify(updated));
                    }}
                  >
                    <option value="1">1 Time/Day</option>
                    <option value="2">2 Times/Day (7:10 AM, 7:10 PM)</option>
                    <option value="3">3 Times/Day</option>
                  </select>
                )}
              </div>
              
              {podcastFrequency === "Weekly" && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {DAYS.map(d => (
                    <Button 
                      key={d} 
                      size="sm" 
                      variant={podcastWeeklyDays.includes(d) ? "default" : "outline"}
                      className="h-7 text-[10px] px-2 rounded-full"
                      disabled={!isPodcastScheduleEnabled}
                      onClick={() => {
                        const updated = podcastWeeklyDays.includes(d) ? podcastWeeklyDays.filter(x => x !== d) : [...podcastWeeklyDays, d];
                        setPodcastWeeklyDays(updated);
                        saveSetting("podcast_weekly_days", JSON.stringify(updated));
                      }}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {podcastTimes.map((t, i) => {
                  const [h, m] = (t || "07:10").split(":");
                  const hour = parseInt(h || "7", 10);
                  const ampm = hour >= 12 ? "PM" : "AM";
                  const formattedHour = hour % 12 || 12;
                  const displayStr = `${formattedHour}:${(m || "10").padStart(2, "0")} ${ampm}`;

                  return (
                    <div key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-xl border border-border">
                      <Input 
                        type="time" 
                        className="w-[95px] h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 disabled:opacity-50 font-mono" 
                        value={t} 
                        disabled={!isPodcastScheduleEnabled}
                        onChange={e => {
                          const newT = [...podcastTimes];
                          newT[i] = e.target.value;
                          setPodcastTimes(newT);
                          saveSetting("podcast_times", JSON.stringify(newT));
                        }} 
                      />
                      <span className="text-[10px] font-bold text-emerald-500 font-mono">{displayStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* 2. Manual Scraping Control (Renamed from Live Scraping Status) */}
      <Card className={`bg-card/50 backdrop-blur-sm border-border mb-6 transition-all duration-300 ${isTerminalFullscreen ? "fixed bottom-4 left-4 right-4 top-24 z-50 overflow-hidden flex flex-col bg-black/95 shadow-2xl ring-1 ring-border" : ""}`}>
        <CardHeader className="space-y-4 border-b border-border pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Manual Scraping Control
              {(isTriggeringRss || isGeneratingPodcast) && (
                <span className="ml-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Manually trigger scraping or generate AI podcasts, and monitor real-time execution logs.
            </CardDescription>
          </div>
          
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-muted/20 dark:bg-black/40 p-3.5 sm:p-4 rounded-xl border border-border/80 dark:border-white/10">
            {/* 1st Column: Target Count & Save Defaults */}
            <div className="flex flex-col justify-between gap-3 bg-card/60 dark:bg-white/[0.03] p-3 rounded-lg border border-border/60 dark:border-white/5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="manual-target-input" className="text-xs font-semibold text-foreground whitespace-nowrap">
                  Target Count:
                </Label>
                <Input 
                  id="manual-target-input"
                  type="number" 
                  min="1" max="25" 
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  className="w-20 h-8 text-xs font-semibold text-center bg-background dark:bg-black/50 border-input dark:border-white/10 focus-visible:ring-1" 
                />
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSaveAutomationDefaults} 
                disabled={isSavingDefaults} 
                className={`h-8 text-xs font-medium w-full transition-all border-border/80 dark:border-white/15 hover:bg-muted dark:hover:bg-white/10 ${defaultsSavedSuccess ? "!text-emerald-500 !border-emerald-500/50 !bg-emerald-500/10" : ""}`}
                title="Save selected Category, Target Count, and Country as scheduler defaults"
              >
                {defaultsSavedSuccess ? "✓ Defaults Saved" : isSavingDefaults ? "Saving..." : "Save Defaults"}
              </Button>
            </div>

            {/* 2nd Column (Middle): Country & Category */}
            <div className="flex flex-col justify-between gap-3 bg-card/60 dark:bg-white/[0.03] p-3 rounded-lg border border-border/60 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="manual-country-select" className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[65px]">
                  Country:
                </Label>
                <select 
                  id="manual-country-select"
                  className="flex h-8 w-full bg-background dark:bg-black/50 rounded-md border border-input dark:border-white/10 text-xs px-2.5 text-foreground focus-visible:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="All">🌐 All Countries (1 by 1)</option>
                  <option value="BD">🇧🇩 Bangladesh</option>
                  <option value="GLOBAL">🌍 Global Only</option>
                  <option value="UK">🇬🇧 United Kingdom</option>
                  <option value="SA">🇸🇦 Saudi Arabia</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="manual-category-select" className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[65px]">
                  Category:
                </Label>
                <select 
                  id="manual-category-select"
                  className="flex h-8 w-full bg-background dark:bg-black/50 rounded-md border border-input dark:border-white/10 text-xs px-2.5 text-foreground focus-visible:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {/* 3rd Column (Last): Action Buttons */}
            <div className="flex flex-col justify-between gap-2.5 bg-card/60 dark:bg-white/[0.03] p-3 rounded-lg border border-border/60 dark:border-white/5">
              <Button 
                size="sm" 
                onClick={handleTriggerEmergencyScrape} 
                disabled={isTriggeringRss || isGeneratingPodcast} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-sm font-semibold w-full flex items-center justify-center gap-1.5 text-xs transition-transform active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> 
                {isTriggeringRss ? "Scraping..." : "Scrap Now"}
              </Button>

              <Button 
                size="sm" 
                onClick={handleTriggerPodcast} 
                disabled={isGeneratingPodcast || isTriggeringRss} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-sm font-semibold transition-all w-full flex items-center justify-center gap-1.5 text-xs active:scale-[0.98]"
              >
                <Radio className="w-3.5 h-3.5" />
                {isGeneratingPodcast ? "Generating Audio..." : "AI Podcast Summary"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`p-0 relative ${isTerminalFullscreen ? "flex-1 overflow-hidden" : ""}`}>
          {/* Maximize Terminal Button at top right of the black log window */}
          <div className="absolute top-2.5 right-3 z-10">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsTerminalFullscreen(!isTerminalFullscreen)} 
              className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-md border border-white/10 backdrop-blur-sm shadow-sm transition-all"
              title={isTerminalFullscreen ? "Exit Fullscreen" : "Maximize Terminal"}
            >
              {isTerminalFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div 
            ref={logsContainerRef}
            className={`overflow-y-auto font-mono text-xs text-green-400 space-y-1 p-4 bg-black ${isTerminalFullscreen ? "h-full" : "h-72"}`}
          >
            {scrapeLogs.length === 0 && !isTriggeringRss && !isGeneratingPodcast ? (
              <div className="text-slate-500 italic">No logs yet. Click 'Scrap Now' or 'AI Podcast Summary' to initiate manual execution...</div>
            ) : (
              <>
                {scrapeLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                {(isTriggeringRss || isGeneratingPodcast) && <div className="animate-pulse text-emerald-400">_</div>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Sources Management with Country Tabs */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Automated Scraping Sources (RSS / DDG)
              </CardTitle>
              <CardDescription>Manage active RSS feeds for Bangladesh, Global, UK & Saudi Arabia background news harvesting.</CardDescription>
            </div>

            {/* Country Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter Sources:</Label>
              <select
                value={activeSourceTab}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setActiveSourceTab(val);
                  if (val !== "ALL") setNewSourceCountry(val);
                }}
                className="h-9 px-3 text-xs bg-muted/60 hover:bg-muted border border-border rounded-xl font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm transition-colors cursor-pointer text-foreground"
              >
                <option value="ALL">🌐 All Sources ({sources.length})</option>
                <option value="BD">🇧🇩 Bangladesh ({bdCount})</option>
                <option value="GLOBAL">🌍 Global ({globalCount})</option>
                <option value="UK">🇬🇧 United Kingdom ({ukCount})</option>
                <option value="SA">🇸🇦 Saudi Arabia ({saCount})</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Source Input Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-muted/40 p-3 rounded-xl border border-border/50">
            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs font-medium">Source Name</Label>
              <Input 
                placeholder="e.g. BBC News (World)" 
                value={newSourceName} 
                onChange={e => setNewSourceName(e.target.value)} 
                className="h-9 text-xs"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-xs font-medium">Feed URL or RSS link</Label>
              <Input 
                placeholder="https://feeds.bbci.co.uk/.../rss.xml" 
                value={newSourceUrl} 
                onChange={e => setNewSourceUrl(e.target.value)} 
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Country</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                value={newSourceCountry}
                onChange={(e) => setNewSourceCountry(e.target.value as any)}
              >
                <option value="BD">🇧🇩 Bangladesh</option>
                <option value="GLOBAL">🌐 Global</option>
                <option value="UK">🇬🇧 UK</option>
                <option value="SA">🇸🇦 Saudi Arabia</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Category</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                value={newSourceCat}
                onChange={(e) => setNewSourceCat(e.target.value)}
              >
                <option value="General">General</option>
                <option value="World">World</option>
                {CATEGORIES.filter(c => c !== "General").map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <Button 
                onClick={handleAddSource} 
                disabled={!newSourceName || !newSourceUrl} 
                className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Sources Table */}
          <div className="border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-left border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-xl text-xs">Name</th>
                  <th className="px-4 py-3 font-medium text-xs">Feed URL</th>
                  <th className="px-4 py-3 font-medium text-xs">Country</th>
                  <th className="px-4 py-3 font-medium text-xs">Category</th>
                  <th className="px-4 py-3 font-medium rounded-tr-xl text-right text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No sources found for this tab. 
                      <Button 
                        variant="link" 
                        onClick={handleLoadDefaultSources} 
                        disabled={isSeedingSources}
                        className="text-primary p-0 h-auto ml-1 font-semibold"
                      >
                        {isSeedingSources ? "Loading..." : "Load Verified Defaults"}
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredSources.map((source) => (
                    <tr key={source.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{source.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs max-w-[280px] truncate text-muted-foreground" title={source.url}>
                        {source.url}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          source.country === "GLOBAL" 
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                            : source.country === "UK"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : source.country === "SA"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {source.country === "GLOBAL" ? "🌐 Global" : source.country === "UK" ? "🇬🇧 UK" : source.country === "SA" ? "🇸🇦 SA" : "🇧🇩 BD"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{source.category || "General"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSource(source.id, source.is_active)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${source.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}
                          >
                            {source.is_active ? "ACTIVE" : "PAUSED"}
                          </button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteSource(source.id)} 
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Showing {filteredSources.length} of {sources.length} total source(s)</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLoadDefaultSources} 
              disabled={isSeedingSources}
              className="text-xs h-8 border-border hover:bg-muted"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSeedingSources ? "animate-spin" : ""}`} />
              {isSeedingSources ? "Refreshing..." : "Reset to Verified Defaults"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Direct URL Ingestion */}
      <Card className="bg-card/50 backdrop-blur-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Direct URL Ingestion
          </CardTitle>
          <CardDescription>Manually trigger the scraper for a specific article URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Article URL</Label>
              <Input 
                placeholder="https://example.com/news/123" 
                value={urlToIngest}
                onChange={e => setUrlToIngest(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Search Keyword (Optional)</Label>
              <Input 
                placeholder="e.g. Bangladesh" 
                value={ingestKeyword}
                onChange={e => setIngestKeyword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex gap-2">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={CATEGORIES.includes(ingestCategory) ? ingestCategory : "Custom"}
                onChange={(e) => {
                  if (e.target.value !== "Custom") setIngestCategory(e.target.value);
                  else setIngestCategory("");
                }}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="Custom">Custom...</option>
              </select>
              {!CATEGORIES.includes(ingestCategory) && (
                <Input 
                  placeholder="Custom Category" 
                  value={ingestCategory}
                  onChange={e => setIngestCategory(e.target.value)}
                />
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDirectIngest} disabled={isIngesting || !urlToIngest} className="w-full bg-white text-black hover:bg-slate-200 font-semibold">
            {isIngesting ? "Starting..." : "Start Scraping"}
          </Button>
        </CardFooter>
      </Card>

      {/* 5. Global Settings (Gemini API Keys) */}
      <Card className="bg-card/50 backdrop-blur-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Global Gemini API Keys
          </CardTitle>
          <CardDescription>Configure global API keys for background scraping and podcast generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 pt-2">
            {apiKeys.map((key, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input 
                    type={visibleKeys[index] ? "text" : "password"}
                    placeholder="AIzaSy..." 
                    value={key}
                    autoComplete="new-password"
                    onChange={e => {
                      const newKeys = [...apiKeys];
                      newKeys[index] = e.target.value;
                      setApiKeys(newKeys);
                    }}
                    className="font-mono text-xs pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleKeyVisibility(index)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleKeys[index] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {apiKeys.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setApiKeys(apiKeys.filter((_, i) => i !== index))} 
                    className="text-red-500 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setApiKeys([...apiKeys, ""])} 
              className="border-dashed"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Another API Key
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings} size="sm" className={`bg-white text-black hover:bg-slate-200 transition-colors ${saveSuccess ? "!bg-emerald-600 !text-white" : ""}`}>
              {isSavingSettings ? "Saving..." : saveSuccess ? "✓ Saved Successfully" : "Save API Keys"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </motion.div>
  );
}
