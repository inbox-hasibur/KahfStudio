"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Edit3, Video, FileText, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLibraryPage() {
  const [activeTab, setActiveTab] = useState("news");

  const tabs = [
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
      <div>
        <h1 className="text-3xl font-bold">News Library & Source Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage generated news articles, videos, and configure RSS/scraping sources.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <Button 
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "news" && (
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

      {activeTab === "video" && (
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

      {activeTab === "source_news" && (
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

      {activeTab === "source_video" && (
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
    </motion.div>
  );
}
