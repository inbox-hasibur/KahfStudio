"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Database, Play, Square, Link as LinkIcon, Settings, Key, Search, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

export default function AdminScrapingPage() {
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
  
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [apiKeys, setApiKeys] = useState<string[]>([""]);
  const [isTriggeringRss, setIsTriggeringRss] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});

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

  const handleTriggerEmergencyScrape = async () => {
    setIsTriggeringRss(true);
    setScrapeLogs(["Connecting to scraping pipeline..."]);
    
    try {
      const response = await fetch("/api/ingest/trigger-rss");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) {
                setScrapeLogs((prev) => [...prev, data.message]);
              }
            } catch(e) {}
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setScrapeLogs((prev) => [...prev, `Error: ${e.message}`]);
    } finally {
      setIsTriggeringRss(false);
    }
  };



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
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => {
                    const val = !autoApprove;
                    setAutoApprove(val);
                    saveSetting("auto_approve_news", val.toString());
                  }}
                  className={`relative w-28 h-10 rounded-full p-1 cursor-pointer transition-colors duration-300 border ${autoApprove ? "bg-green-500 border-green-500" : "bg-[#0f172a] border-[#0f172a]"}`}
                >
                  <motion.div
                    className="w-12 h-8 bg-white rounded-full shadow-sm flex items-center justify-center"
                    initial={false}
                    animate={{ x: autoApprove ? 56 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <span className={`text-[11px] font-bold -mt-px ${autoApprove ? "text-green-600" : "text-[#0f172a]"}`}>
                      {autoApprove ? "ON" : "OFF"}
                    </span>
                  </motion.div>
                </div>
                <div>
                  <Label className="text-sm font-semibold block">Auto-Approve Scraped News</Label>
                  <p className="text-xs text-muted-foreground mt-1">If disabled, news will be saved as Draft and require manual review.</p>
                </div>
              </div>
            </div>
            
            {/* Scraping Schedule */}
            <div className="space-y-3 md:border-l border-border md:pl-6">
              <Label className="text-sm font-semibold">Scraping Schedule</Label>
              <div className="flex flex-wrap gap-2">
                <select 
                  className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={scrapFrequency} 
                  onChange={e => setScrapFrequency(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
                
                {scrapFrequency === "Daily" && (
                  <select 
                    className="flex h-9 min-w-[100px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={dailyTimesCount} 
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
                      onClick={() => setWeeklyDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {scrapTimes.map((t, i) => (
                  <Input 
                    key={i} 
                    type="time" 
                    className="w-[100px] h-9 text-xs" 
                    value={t} 
                    onChange={e => {
                      const newT = [...scrapTimes];
                      newT[i] = e.target.value;
                      setScrapTimes(newT);
                    }} 
                  />
                ))}
              </div>
            </div>

            {/* Summarization Delay */}
            <div className="space-y-3 md:border-l border-border md:pl-6">
              <Label className="text-sm font-semibold">Summarization Delay</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={summarizeAfter} 
                  onChange={e => {
                    setSummarizeAfter(e.target.value);
                    saveSetting("summarize_after_mins", e.target.value);
                  }}
                  className="w-[90px] h-9" 
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">Time to wait before AI summarizes content.</p>
            </div>
            
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

        {/* Pipeline Terminal View (Shows during scrape) */}
        {(isTriggeringRss || scrapeLogs.length > 0) && (
          <Card className="bg-black/90 backdrop-blur-sm border-border mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
                <Play className="w-4 h-4" /> Live Scraping Pipeline Output
                {isTriggeringRss && <span className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 p-2 bg-black rounded border border-slate-800">
                {scrapeLogs.map((log, i) => (
                  <div key={i}>
                    <span className="text-muted-foreground mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
                {isTriggeringRss && <div className="animate-pulse">_</div>}
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="flex gap-2">
              <Button size="sm" onClick={handleTriggerEmergencyScrape} disabled={isTriggeringRss} className="bg-white text-black hover:bg-slate-200 border border-slate-300">
                <Play className="w-4 h-4 mr-1" /> 
                {isTriggeringRss ? "Triggering..." : "Scrap Now (5 News)"}
              </Button>
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
    </motion.div>
  );
}
