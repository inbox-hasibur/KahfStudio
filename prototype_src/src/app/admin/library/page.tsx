"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, CheckCircle, Trash2, Edit3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function AdminLibraryPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchArticles = async () => {
    setLoading(true);
    const { data } = await supabase.from("news_articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const pendingArticles = articles.filter(a => a.status !== "published");
  const publishedArticles = articles.filter(a => a.status === "published");

  const handleApprove = async (id: string) => {
    await supabase.from("news_articles").update({ status: "published" }).eq("id", id);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await supabase.from("news_articles").delete().eq("id", id);
    fetchArticles();
  };

  const tabs = [
    { id: "pending", label: `Pending Review (${pendingArticles.length})`, icon: FileText },
    { id: "published", label: `Published (${publishedArticles.length})`, icon: CheckCircle },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">News Library & Review</h1>
        <p className="text-muted-foreground mt-1">
          Review scraped articles, approve them for the main feed, or manage published content.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Button 
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 ${activeTab === tab.id ? "bg-white text-black hover:bg-slate-200" : ""}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>
            {activeTab === "pending" ? "Articles Pending Approval" : "Published Articles"}
          </CardTitle>
          <CardDescription>
            {activeTab === "pending" 
              ? "These articles were scraped with Auto-Approve OFF. Review them before publishing." 
              : "These articles are currently live on the main feed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading articles...</div>
          ) : (
            <div className="space-y-4">
              {(activeTab === "pending" ? pendingArticles : publishedArticles).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl text-muted-foreground">
                  No {activeTab} articles found.
                </div>
              ) : (
                (activeTab === "pending" ? pendingArticles : publishedArticles).map(article => (
                  <div key={article.id} className="p-4 border border-border rounded-xl bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{article.headline}</h3>
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                          <span className="bg-muted px-2 py-0.5 rounded-full">{article.source || "Unknown Source"}</span>
                          <span>{new Date(article.created_at).toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {article.ai_summary || "No AI summary available."}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {activeTab === "pending" && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(article.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(article.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
