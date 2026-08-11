"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, CheckCircle, Trash2, Edit3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/lib/auth-client";
import { Key } from "lucide-react";
import Link from "next/link";

export default function AdminLibraryPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "user";
  const userTier = (session?.user as any)?.tier || "free";
  
  const isLocked = userRole !== "admin" && userTier !== "premium";
  const [activeTab, setActiveTab] = useState("pending");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editForm, setEditForm] = useState({ headline: "", ai_summary: "" });

  const supabase = createClient();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/articles");
      if (res.ok) {
        const { data } = await res.json();
        if (data) setArticles(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const { settings } = await res.json();
        const autoSetting = settings?.find((s: any) => s.setting_key === "auto_approve_news");
        if (autoSetting) setAutoApprove(autoSetting.setting_value === "true");
      }
    } catch(e) {}
  };

  const handleToggleAutoApprove = async () => {
    const newVal = !autoApprove;
    setAutoApprove(newVal);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "auto_approve_news", value: newVal.toString() })
    });
  };

  const pendingArticles = articles.filter(a => a.status !== "published");
  const publishedArticles = articles.filter(a => a.status === "published");

  const handleApprove = async (id: string) => {
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "published" }),
    });
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await fetch("/api/admin/articles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchArticles();
  };

  const handleEditClick = (article: any) => {
    setEditingArticle(article);
    setEditForm({ headline: article.headline, ai_summary: article.ai_summary || "" });
  };

  const handleSaveEdit = async () => {
    if (!editingArticle) return;
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingArticle.id, headline: editForm.headline, ai_summary: editForm.ai_summary }),
    });
    setEditingArticle(null);
    fetchArticles();
  };

  const tabs = [
    { id: "pending", label: `Pending Review (${pendingArticles.length})`, icon: FileText },
    { id: "published", label: `Published (${publishedArticles.length})`, icon: CheckCircle },
  ];

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Key className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Premium Feature Locked</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Personalized News Approval is a premium feature. Upgrade your account to review and curate your own news library before it gets added to your feed.
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">News Library & Review</h1>
          <p className="text-muted-foreground mt-1">
            Review scraped articles, approve them for the main feed, or manage published content.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-border pb-2">
        <div className="flex flex-wrap gap-2">
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
        
        <div className="flex flex-col items-end gap-1">
          <div 
            onClick={handleToggleAutoApprove}
            className={`relative w-20 h-8 shrink-0 rounded-full p-1 cursor-pointer transition-colors duration-300 ${autoApprove ? "bg-green-500" : "bg-[#0f172a]"}`}
          >
            <motion.div
              className="w-9 h-6 bg-white rounded-full shadow-sm flex items-center justify-center"
              initial={false}
              animate={{ x: autoApprove ? 36 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <span className={`text-[10px] font-bold leading-none ${autoApprove ? "text-green-600" : "text-[#0f172a]"}`}>
                {autoApprove ? "ON" : "OFF"}
              </span>
            </motion.div>
          </div>
          <Label className="text-[10px] text-muted-foreground cursor-pointer" onClick={handleToggleAutoApprove}>Auto-Approve Scraped News</Label>
        </div>
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
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(article)}>
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

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-border"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Article</h2>
              <button onClick={() => setEditingArticle(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-1 block">Headline</Label>
                <input 
                  type="text" 
                  value={editForm.headline}
                  onChange={(e) => setEditForm({...editForm, headline: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1 block">AI Summary (Body)</Label>
                <textarea 
                  rows={8}
                  value={editForm.ai_summary}
                  onChange={(e) => setEditForm({...editForm, ai_summary: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingArticle(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
