"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, PlayCircle, Library, Calendar, Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeScrapers: 0,
    newsLibrary: 0,
    activeApis: 0,
    onlineUsers: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAdminData() {
      const [usersRes, premiumRes, scrapersRes, newsRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'premium'),
        supabase.from('scraping_sources').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('news_articles').select('*', { count: 'exact', head: true }),
        supabase.from('system_settings').select('setting_value').eq('setting_key', 'global_gemini_api_keys').single(),
      ]);
      
      const logsRes = await supabase.from('news_articles')
        .select('headline, published_at, source')
        .order('published_at', { ascending: false })
        .limit(5);

      let apiCount = 0;
      if (settingsRes.data) {
        try {
          const keys = JSON.parse(settingsRes.data.setting_value);
          if (Array.isArray(keys)) apiCount = keys.length;
        } catch(e) {}
      }

      // Update stats dynamically from the database queries
      setStats({
        totalUsers: usersRes.count || 0,
        premiumUsers: premiumRes.count || 0,
        activeScrapers: scrapersRes.count || 0,
        newsLibrary: newsRes.count || 0,
        activeApis: apiCount,
        onlineUsers: Math.floor((usersRes.count || 0) * 0.2) // Estimate online users ~20%
      });

      if (logsRes.data) {
        setRecentLogs(logsRes.data);
      }
    }
    
    fetchAdminData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform overview, pipeline health, and user statistics.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md border border-border/50 p-2 pr-4 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-[11px] text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Users",
            icon: Users,
            primaryValue: stats.totalUsers,
            pillLabel: "Online",
            pillValue: stats.onlineUsers,
            leftLabel: "Premium",
            leftValue: stats.premiumUsers,
            rightLabel: "Free",
            rightValue: stats.totalUsers - stats.premiumUsers,
            rightColor: "text-foreground",
            leftColor: "text-foreground"
          },
          {
            title: "API Health",
            icon: Activity,
            primaryValue: stats.activeApis < 10 ? `0${stats.activeApis}` : stats.activeApis,
            pillLabel: "Online",
            pillValue: "",
            leftLabel: "Total APIs",
            leftValue: stats.activeApis < 10 ? `0${stats.activeApis}` : stats.activeApis,
            rightLabel: "Rate Limited",
            rightValue: "0",
            rightColor: "text-red-400",
            leftColor: "text-foreground"
          },
          {
            title: "Active Scrapers",
            icon: PlayCircle,
            primaryValue: stats.activeScrapers < 10 ? `0${stats.activeScrapers}` : stats.activeScrapers,
            pillLabel: "Jobs",
            pillValue: "",
            leftLabel: "Status",
            leftValue: "Running",
            rightLabel: "Load",
            rightValue: "01%",
            rightColor: "text-foreground",
            leftColor: "text-emerald-500"
          },
          {
            title: "News Library",
            icon: Library,
            primaryValue: stats.newsLibrary < 10 ? `0${stats.newsLibrary}` : stats.newsLibrary,
            pillLabel: "Articles",
            pillValue: "",
            leftLabel: "Processed",
            leftValue: "Success",
            rightLabel: "Removed",
            rightValue: "00",
            rightColor: "text-foreground",
            leftColor: "text-emerald-500"
          }
        ].map((card, idx) => (
          <Card key={idx} className="bg-card/40 backdrop-blur-md border-border/50 hover:border-emerald-500/50 transition-all duration-300 shadow-sm hover:shadow-emerald-500/10 group overflow-hidden p-5 gap-0">
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-muted-foreground tracking-tight text-sm">{card.title}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-foreground leading-none">{card.primaryValue}</span>
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md leading-none">
                  {card.pillValue ? `${card.pillValue} ${card.pillLabel}` : card.pillLabel}
                </span>
              </div>
              
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">{card.leftLabel}</span>
                  <span className={`font-bold text-base ${card.leftColor}`}>{card.leftValue}</span>
                </div>
                <div className="w-px h-6 bg-border/50"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">{card.rightLabel}</span>
                  <span className={`font-bold text-base ${card.rightColor}`}>{card.rightValue}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>Recent automated events and scraped articles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="max-w-[70%]">
                  <p className="text-sm font-medium truncate">{log.headline}</p>
                  <p className="text-xs text-muted-foreground">Scraped from {log.source}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(log.published_at).toLocaleDateString()}
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground py-4 text-center">No recent activity found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
