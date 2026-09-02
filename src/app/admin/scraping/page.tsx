"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Database, Play, Square, Link as LinkIcon, Settings, Key, Search, Plus, Trash2, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

export default function AdminScrapingPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "user";
  const userTier = (session?.user as any)?.tier || "free";
  
  const isLocked = userRole !== "admin" && userTier !== "premium";

  const [isActive, setIsActive] = useState(false);
  const [urlToIngest, setUrlToIngest] = useState("");
  const [ingestCategory, setIngestCategory] = useState("General");
  const [isIngesting, setIsIngesting] = useState(false);

  const [sources, setSources] = useState<any[]>([]);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceCat, setNewSourceCat] = useState("General");

  const [autoApprove, setAutoApprove] = useState(true);
  const [scrapFrequency, setScrapFrequency] = useState("Daily");
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [dailyTimesCount, setDailyTimesCount] = useState("1");
  const [scrapTimes, setScrapTimes] = useState<string[]>(["00:00"]);
  const [summarizeAfter, setSummarizeAfter] = useState("60");
  const [ingestKeyword, setIngestKeyword] = useState("");
  
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [isSummarizeEnabled, setIsSummarizeEnabled] = useState(true);
  
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [apiKeys, setApiKeys] = useState<string[]>([""]);
  const [isTriggeringRss, setIsTriggeringRss] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isTerminalFullscreen, setIsTerminalFullscreen] = useState(false);

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

  const supabase = createClient();

  const CATEGORIES = ["জাতীয়", "রাজনীতি", "অর্থনীতি", "খেলাধুলা", "প্রযুক্তি", "আন্তর্জাতিক", "General"];

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
          const autoSetting = settingsData.find((s: any) => s.setting_key === "auto_approve_news");
          if (autoSetting) setAutoApprove(autoSetting.setting_value === "true");

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

  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) return;
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ADD", payload: { name: newSourceName, url: newSourceUrl, category: newSourceCat } })
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
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SEED", payload: {} })
    });
    fetchData();
  };

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveSetting = async (key: string, value: string) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    await saveSetting("auto_approve_news", autoApprove.toString());
    
    // Save keys as JSON array
    const validKeys = apiKeys.filter(k => k.trim() !== "");
    await saveSetting("global_gemini_api_keys", JSON.stringify(validKeys));
    
    // Ensure at least one empty input stays if all were deleted/empty
    if (validKeys.length === 0) setApiKeys([""]);
    else setApiKeys(validKeys);
    
    setIsSavingSettings(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const [targetCount, setTargetCount] = useState("5");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const handleTriggerEmergencyScrape = async () => {
    setIsTriggeringRss(true);
    const getNowTime = () => new Date().toLocaleTimeString('en-US', { hour12: true });
    
    const startLogs = [
      `[${getNowTime()}] [Client Step 1] Initiating connection to scraping pipeline...`,
      `[${getNowTime()}] [Client Step 2] Sending GET /api/ingest/trigger-rss?limit=${targetCount}&category=${encodeURIComponent(selectedCategory)}...`,
    ];
    setScrapeLogs(startLogs);
    try {
      localStorage.setItem("kahf_scrape_logs", JSON.stringify(startLogs));
    } catch (e) {}
    
    try {
      const response = await fetch(`/api/ingest/trigger-rss?limit=${targetCount}&category=${encodeURIComponent(selectedCategory)}`);
      
      // Detailed check for non-200 HTTP responses
      if (!response.ok) {
        let errBody = "";
        try {
          errBody = await response.text();
        } catch (e) {}
        const errMsg = `[${getNowTime()}] ❌ [Server HTTP Error ${response.status}]: ${errBody || response.statusText || 'Unknown Server Error'}`;
        const updated = [...startLogs, errMsg];
        setScrapeLogs(updated);
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(updated)); } catch (e) {}
        return;
      }

      if (!response.body) {
        throw new Error("Server returned 200 OK but response stream body is empty");
      }

      let currentLogs = [
        ...startLogs,
        `[${getNowTime()}] [Client Step 3] HTTP 200 OK received (Content-Type: ${response.headers.get("content-type") || "unknown"}). Streaming pipeline logs...`,
      ];
      setScrapeLogs(currentLogs);

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
                currentLogs = [...currentLogs, data.message];
                setScrapeLogs([...currentLogs]);
                try {
                  localStorage.setItem("kahf_scrape_logs", JSON.stringify(currentLogs));
                } catch (e) {}
              }
            } catch(e) {}
          } else if (trimmed && !trimmed.startsWith(":") && !trimmed.startsWith("event:")) {
            // Raw text fallback from stream
            currentLogs = [...currentLogs, trimmed];
            setScrapeLogs([...currentLogs]);
            try {
              localStorage.setItem("kahf_scrape_logs", JSON.stringify(currentLogs));
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setScrapeLogs((prev) => {
        const updated = [...prev, `[${getNowTime()}] ❌ [Network / Client Exception]: ${e.message}`];
        try { localStorage.setItem("kahf_scrape_logs", JSON.stringify(updated)); } catch (err) {}
        return updated;
      });
    } finally {
      setIsTriggeringRss(false);
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
          <CardDescription>Configure auto-approval and scheduled tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Auto Approve */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => {
                    const val = !autoApprove;
                    setAutoApprove(val);
                    saveSetting("auto_approve_news", val.toString());
                  }}
                  className={`relative w-24 h-9 shrink-0 rounded-full p-1 cursor-pointer transition-colors duration-300 ${autoApprove ? "bg-green-500" : "bg-[#0f172a]"}`}
                >
                  <motion.div
                    className="w-11 h-7 bg-white rounded-full shadow-sm flex items-center justify-center"
                    initial={false}
                    animate={{ x: autoApprove ? 44 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <span className={`text-[11px] font-bold leading-none ${autoApprove ? "text-green-600" : "text-[#0f172a]"}`}>
                      {autoApprove ? "ON" : "OFF"}
                    </span>
                  </motion.div>
                </div>
                <Label className="text-sm font-semibold">Auto-Approve<br/>Scraped News</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">Automatically publish scraped news without manual review. This will bypass the pending queue.</p>
              </div>
            </div>

            {/* Scraping Schedule */}
            <div className={`space-y-3 md:border-l border-border md:pl-6 transition-opacity ${isScheduleEnabled ? "opacity-100" : "opacity-50"}`}>
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => setIsScheduleEnabled(!isScheduleEnabled)}
                  className={`relative w-14 h-7 shrink-0 rounded-full p-1 cursor-pointer transition-colors duration-300 ${isScheduleEnabled ? "bg-green-500" : "bg-[#0f172a]"}`}
                >
                  <motion.div
                    className="w-6 h-5 bg-white rounded-full shadow-sm flex items-center justify-center"
                    initial={false}
                    animate={{ x: isScheduleEnabled ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <span className={`text-[8px] font-bold leading-none ${isScheduleEnabled ? "text-green-600" : "text-[#0f172a]"}`}>
                      {isScheduleEnabled ? "ON" : "OFF"}
                    </span>
                  </motion.div>
                </div>
                <Label className="text-sm font-semibold">Scraping Schedule</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  value={scrapFrequency} 
                  onChange={e => setScrapFrequency(e.target.value)}
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
                      setDailyTimesCount(e.target.value);
                      const count = parseInt(e.target.value);
                      setScrapTimes(Array(count).fill("00:00").map((_, i) => scrapTimes[i] || "00:00"));
                    }}
                  >
                    <option value="1">1 Time/Day</option>
                    <option value="2">2 Times/Day</option>
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
                      onClick={() => setWeeklyDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {scrapTimes.map((t, i) => {
                  const [h, m] = (t || "00:00").split(":");
                  const hour = parseInt(h || "0", 10);
                  const ampm = hour >= 12 ? "PM" : "AM";
                  const formattedHour = hour % 12 || 12;
                  const displayStr = `${formattedHour}:${(m || "00").padStart(2, "0")} ${ampm}`;

                  return (
                    <div key={i} className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-xl border border-border">
                      <Input 
                        type="time" 
                        className="w-[95px] h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 disabled:opacity-50 font-mono" 
                        value={t} 
                        disabled={!isScheduleEnabled}
                        onChange={e => {
                          const newT = [...scrapTimes];
                          newT[i] = e.target.value;
                          setScrapTimes(newT);
                        }} 
                      />
                      <span className="text-[10px] font-bold text-primary font-mono">{displayStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summarization Delay */}
            <div className={`space-y-3 md:border-l border-border md:pl-6 transition-opacity ${isSummarizeEnabled ? "opacity-100" : "opacity-50"}`}>
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => setIsSummarizeEnabled(!isSummarizeEnabled)}
                  className={`relative w-14 h-7 shrink-0 rounded-full p-1 cursor-pointer transition-colors duration-300 ${isSummarizeEnabled ? "bg-green-500" : "bg-[#0f172a]"}`}
                >
                  <motion.div
                    className="w-6 h-5 bg-white rounded-full shadow-sm flex items-center justify-center"
                    initial={false}
                    animate={{ x: isSummarizeEnabled ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <span className={`text-[8px] font-bold leading-none ${isSummarizeEnabled ? "text-green-600" : "text-[#0f172a]"}`}>
                      {isSummarizeEnabled ? "ON" : "OFF"}
                    </span>
                  </motion.div>
                </div>
                <Label className="text-sm font-semibold">Podcast Summarization</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">Generate a daily audio summary including news, weather, and traffic.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={summarizeAfter}
                  disabled={!isSummarizeEnabled}
                  onChange={e => {
                    setSummarizeAfter(e.target.value);
                    saveSetting("summarize_after_mins", e.target.value);
                  }}
                  className="w-[90px] h-9 disabled:opacity-50" 
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* 3. Direct URL Ingestion */}
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
          <Button onClick={handleDirectIngest} disabled={isIngesting || !urlToIngest} className="w-full bg-white text-black hover:bg-slate-200">
            {isIngesting ? "Starting..." : "Start Scraping"}
          </Button>
        </CardFooter>
      </Card>

      {/* Live Scraping Status */}
      <Card className={`bg-card/50 backdrop-blur-sm border-border mb-6 transition-all duration-300 ${isTerminalFullscreen ? "fixed bottom-4 left-4 right-4 top-24 z-50 overflow-hidden flex flex-col bg-black/95 shadow-2xl ring-1 ring-border" : ""}`}>
        <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Live Scraping Status
              {isTriggeringRss && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </CardTitle>
            <CardDescription>Manually trigger scraping and view real-time logs.</CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 px-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Target Count:</Label>
              <Input 
                type="number" 
                min="1" max="20" 
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                className="w-16 h-8 text-xs bg-black/40 border-white/10 focus-visible:ring-1" 
              />
            </div>
            
            <div className="flex items-center gap-2 px-1 sm:border-l sm:border-white/10 sm:pl-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Category:</Label>
              <select 
                className="flex h-8 w-28 bg-black/40 rounded-md border border-white/10 text-xs focus-visible:outline-none px-2"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <Button size="sm" onClick={handleTriggerEmergencyScrape} disabled={isTriggeringRss} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 ml-1">
              <Play className="w-3.5 h-3.5 mr-1" /> 
              {isTriggeringRss ? "Scraping..." : "Scrap Now"}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => setIsTerminalFullscreen(!isTerminalFullscreen)} className="h-8 w-8 hidden md:flex hover:bg-white/10">
              {isTerminalFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`p-0 ${isTerminalFullscreen ? "flex-1 overflow-hidden" : ""}`}>
          <div 
            ref={logsContainerRef}
            className={`overflow-y-auto font-mono text-xs text-green-400 space-y-1 p-4 bg-black ${isTerminalFullscreen ? "h-full" : "h-72"}`}
          >
            {scrapeLogs.length === 0 && !isTriggeringRss ? (
              <div className="text-slate-500 italic">No logs yet. Click 'Scrap Now' to start...</div>
            ) : (
              <>
                {scrapeLogs.map((log, i) => (
                  <div key={i}>
                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
                {isTriggeringRss && <div className="animate-pulse">_</div>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sources Management */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Automated Scraping Sources (RSS / DDG)
              </CardTitle>
              <CardDescription>Manage sources for the hourly/daily background cron jobs.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Source Name</Label>
              <Input placeholder="e.g. Prothom Alo" value={newSourceName} onChange={e => setNewSourceName(e.target.value)} />
            </div>
            <div className="flex-[2] space-y-1">
              <Label className="text-xs">Feed URL or DDG Query</Label>
              <Input placeholder="https://.../feed" value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Category</Label>
              <div className="flex gap-2">
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={CATEGORIES.includes(newSourceCat) ? newSourceCat : "Custom"}
                  onChange={(e) => {
                    if (e.target.value !== "Custom") setNewSourceCat(e.target.value);
                    else setNewSourceCat("");
                  }}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="Custom">Custom...</option>
                </select>
                {!CATEGORIES.includes(newSourceCat) && (
                  <Input placeholder="Custom" value={newSourceCat} onChange={e => setNewSourceCat(e.target.value)} />
                )}
              </div>
            </div>
            <Button onClick={handleAddSource} disabled={!newSourceName || !newSourceUrl} className="bg-white text-black hover:bg-slate-200 border border-slate-300">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f172a] text-white text-left">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-xl">Name</th>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium rounded-tr-xl">Category</th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No sources found. 
                      <Button variant="link" onClick={handleLoadDefaultSources} className="text-primary p-0 h-auto ml-1">
                        Load Defaults
                      </Button>
                    </td>
                  </tr>
                )}
                {sources.map(source => (
                  <tr key={source.id} className="border-t border-border">
                    <td className="px-4 py-2">{source.name}</td>
                    <td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate" title={source.url}>{source.url}</td>
                    <td className="px-4 py-2 flex items-center justify-between">
                      {source.category}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSource(source.id)} className="h-6 w-6 text-red-500 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* 2. Global Settings (Gemini API Keys) */}
      <Card className="bg-card/50 backdrop-blur-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Global Gemini API Keys
          </CardTitle>
          <CardDescription>Configure global API keys for background scraping if user BYOK is not available.</CardDescription>
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
            <Button onClick={handleSaveSettings} disabled={isSavingSettings} size="sm" className={`bg-white text-black hover:bg-slate-200 transition-colors ${saveSuccess ? "!bg-green-500 !text-white" : ""}`}>
              {isSavingSettings ? "Saving..." : saveSuccess ? "Saved Successfully" : "Save API Keys"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </motion.div>
  );
}
