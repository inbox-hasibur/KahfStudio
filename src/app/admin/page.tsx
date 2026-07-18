"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Activity, PlayCircle, Library, Database, 
  Play, Square, Cpu, Video, FileText, 
  Link as LinkIcon, Plus, Trash2, LayoutDashboard 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [mainTab, setMainTab] = useState("dashboard");
  const [libraryTab, setLibraryTab] = useState("news");
  const [isScrapingActive, setIsScrapingActive] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "User Management", icon: Users },
    { id: "scraping", label: "Scraping Pipeline", icon: Database },
    { id: "library", label: "News Library", icon: Library },
  ];

  const libraryTabs = [
    { id: "news", label: "News Articles", icon: FileText },
    { id: "video", label: "Video News", icon: Video },
    { id: "source_news", label: "News Sources", icon: LinkIcon },
    { id: "source_video", label: "Video Sources", icon: LinkIcon },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {navItems.map((item) => (
          <Button 
            key={item.id}
            variant={mainTab === item.id ? "default" : "outline"}
            onClick={() => setMainTab(item.id)}
            className="flex items-center gap-2"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Button>
        ))}
      </div>

      {mainTab === "dashboard" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Platform overview, pipeline health, and user statistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,245</div>
                <p className="text-xs text-muted-foreground">340 Premium Subscriptions</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">Online</div>
                <p className="text-xs text-muted-foreground">MDX-Net model & TTS active</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Scrapers</CardTitle>
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Running scheduled cron jobs</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">News Library</CardTitle>
                <Library className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8,432</div>
                <p className="text-xs text-muted-foreground">Generated TTS & Videos</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>System Activity Log</CardTitle>
              <CardDescription>Recent automated events and admin actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium">Scraping Pipeline Completed</p>
                    <p className="text-xs text-muted-foreground">Fetched 45 new articles from DuckDuckGo RSS</p>
                  </div>
                  <div className="text-xs text-muted-foreground">10 mins ago</div>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium">TTS Generation Batch #4092</p>
                    <p className="text-xs text-muted-foreground">Processed 12 news briefings successfully</p>
                  </div>
                  <div className="text-xs text-muted-foreground">45 mins ago</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Admin: Source URL Added</p>
                    <p className="text-xs text-muted-foreground">Added aljazeera.com/xml/rss/all.xml</p>
                  </div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "users" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">User & Subscription Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts, view subscription details, and handle tier upgrades.
            </p>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Users List
              </CardTitle>
              <CardDescription>View Basic and Premium users.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                User management table will be implemented here.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "scraping" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Scraping Pipeline & API</h1>
            <p className="text-muted-foreground mt-1">
              Monitor active scrapers, start/stop pipeline, and track API usage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Pipeline Status
                    <span className={`inline-block ml-2 w-3 h-3 rounded-full ${isScrapingActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isScrapingActive ? 'Active' : 'Inactive'} />
                  </CardTitle>
                  <CardDescription>Current status of automated cron jobs.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className={`border-green-500/20 hover:bg-green-500/10 ${isScrapingActive ? 'text-green-500 bg-green-500/10' : 'text-green-500'}`}
                    onClick={() => setIsScrapingActive(true)}
                  >
                    <Play className="w-4 h-4 mr-2" /> Start
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`border-red-500/20 hover:bg-red-500/10 ${!isScrapingActive ? 'text-red-500 bg-red-500/10' : 'text-red-500'}`}
                    onClick={() => setIsScrapingActive(false)}
                  >
                    <Square className="w-4 h-4 mr-2" /> Stop
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  {isScrapingActive ? "Pipeline is running..." : "Pipeline is stopped."}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  API Usage Status
                </CardTitle>
                <CardDescription>Monitor platform-wide API usage limits.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  API usage charts will be displayed here.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {mainTab === "library" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">News Library & Source Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage generated news articles, videos, and configure RSS/scraping sources.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {libraryTabs.map((tab) => (
              <Button 
                key={tab.id}
                variant={libraryTab === tab.id ? "default" : "outline"}
                onClick={() => setLibraryTab(tab.id)}
                className="flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {libraryTab === "news" && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    News Articles (CRUD)
                  </CardTitle>
                  <CardDescription>Create, Read, Update, and Delete textual news articles.</CardDescription>
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add News</Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p>News article list with Edit/Delete actions will appear here.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {libraryTab === "video" && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Video News Articles (CRUD)
                  </CardTitle>
                  <CardDescription>Manage AI generated video news content.</CardDescription>
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Video</Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p>Video news list with Edit/Delete actions will appear here.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {libraryTab === "source_news" && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    News Source URLs
                  </CardTitle>
                  <CardDescription>Manage RSS feeds and target domains for text scraping.</CardDescription>
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Source</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                    <span className="font-mono text-sm">https://example-news.com/rss</span>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {libraryTab === "source_video" && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    Video Source URLs
                  </CardTitle>
                  <CardDescription>Manage YouTube channels or video feeds for scraping.</CardDescription>
                </div>
                <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Source</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                    <span className="font-mono text-sm">https://youtube.com/c/news-channel</span>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
