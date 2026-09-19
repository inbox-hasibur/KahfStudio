"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, CheckCircle, Trash2, Edit3, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/lib/auth-client";
import { Key } from "lucide-react";
import Link from "next/link";

const COUNTRIES = [
  { code: "ALL", label: "All Regions", flag: "🌐" },
  { code: "BD", label: "Bangladesh", flag: "🇧🇩" },
  { code: "SA", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
  { code: "GLOBAL", label: "Global News", flag: "🌍" },
];

export default function ProfileLibraryPage() {
  const { data: session, status } = useSession();
  const isPending = status === "loading";
  const userRole = (session?.user as any)?.role || (isPending ? "loading" : "user");
  const userTier = (session?.user as any)?.tier || (isPending ? "loading" : "free");
  
  const isLocked = !isPending && userRole !== "admin" && userTier !== "premium";
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedCountry, setSelectedCountry] = useState("BD");

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

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoApprove, setAutoApprove] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("kahf_auto_approve");
      if (cached !== null) return cached === "true";
    }
    return false;
  });
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editForm, setEditForm] = useState({ headline: "", ai_summary: "", raw_content: "" });
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchArticles = async () => {
    if (userRole === "loading") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/articles?role=${userRole}`, {
        cache: 'no-store',
      });
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
    if (!isPending) {
      fetchArticles();
      fetchSettings();
    }
  }, [userRole, isPending]);

  // Listen for deletions from other components
  useEffect(() => {
    const handleArticleDeleted = (e: CustomEvent) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setArticles((prev) => prev.filter((a) => a.id !== deletedId));
      }
    };
    window.addEventListener("article-deleted", handleArticleDeleted as EventListener);
    return () => {
      window.removeEventListener("article-deleted", handleArticleDeleted as EventListener);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { cache: 'no-store' });
      if (res.ok) {
        const { settings } = await res.json();
        const autoSetting = settings?.find((s: any) => s.setting_key === "auto_approve_news");
        if (autoSetting) {
          const isAuto = autoSetting.setting_value === "true";
          setAutoApprove(isAuto);
          if (typeof window !== "undefined") {
            localStorage.setItem("kahf_auto_approve", isAuto.toString());
          }
        }
      }
    } catch(e) {}
  };

  const handleToggleAutoApprove = async () => {
    const newVal = !autoApprove;
    setAutoApprove(newVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("kahf_auto_approve", newVal.toString());
    }
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "auto_approve_news", value: newVal.toString() })
    });
  };

  const countryFilteredArticles = useMemo(() => {
    if (selectedCountry === "ALL") return articles;
    return articles.filter((a) => {
      const c = (a.country || "BD").toUpperCase();
      return c === selectedCountry.toUpperCase();
    });
  }, [articles, selectedCountry]);

  const pendingArticles = countryFilteredArticles.filter(a => a.status !== "published");
  const publishedArticles = countryFilteredArticles.filter(a => a.status === "published");

  const handleApprove = async (id: string) => {
    // Optimistic UI update: immediately move to published
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "published" } : a))
    );
    try {
      await fetch("/api/admin/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "published" }),
      });
    } catch (e) {
      console.error("Failed to approve article:", e);
      fetchArticles();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    // Optimistic UI update: immediately remove card so it disappears
    setArticles((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await fetch("/api/admin/articles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Delete failed");
      }
      // Also notify news feed components to remove it
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("article-deleted", { detail: { id } }));
      }
    } catch (e) {
      console.error("Failed to delete article:", e);
      fetchArticles();
    }
  };

  const handleEditClick = (article: any) => {
    setEditingArticle(article);
    setEditForm({
      headline: article.headline || "",
      ai_summary: article.ai_summary || "",
      raw_content: article.raw_content || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingArticle) return;
    const targetId = editingArticle.id;
    setArticles((prev) =>
      prev.map((a) =>
        a.id === targetId
          ? { ...a, headline: editForm.headline, ai_summary: editForm.ai_summary, raw_content: editForm.raw_content }
          : a
      )
    );
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: targetId,
        headline: editForm.headline,
        ai_summary: editForm.ai_summary,
        raw_content: editForm.raw_content,
      }),
    });
    setEditingArticle(null);
  };

  const tabs = [
    { id: "pending", label: "Pending Review", count: pendingArticles.length, icon: FileText },
    { id: "published", label: "Published", count: publishedArticles.length, icon: CheckCircle },
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
              className={`flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold ${activeTab === tab.id ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span className="notranslate ml-1 px-2 py-0.5 rounded-full bg-muted/70 text-xs font-mono font-bold" translate="no">
                ({tab.count})
              </span>
            </Button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Country Selection Filter Dropdown */}
          <div className="flex items-center gap-2 bg-card/60 px-3 py-1.5 rounded-xl border border-border/60">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-popover text-foreground">
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 bg-card/60 px-3 py-1.5 rounded-xl border border-border/60">
            <SlidingToggle
              id="switch-auto-approve-lib"
              checked={autoApprove}
              onChange={handleToggleAutoApprove}
            />
            <Label htmlFor="switch-auto-approve-lib" className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Auto-Approve Scraped News
            </Label>
          </div>
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
                  No {activeTab} articles found for {selectedCountry === "ALL" ? "any region" : selectedCountry}.
                </div>
              ) : (
                (activeTab === "pending" ? pendingArticles : publishedArticles).map(article => (
                  <div key={article.id} className="p-4 border border-border rounded-xl bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{article.headline}</h3>
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {article.country === "SA" ? "🇸🇦 Saudi Arabia" : article.country === "UK" ? "🇬🇧 UK" : article.country === "GLOBAL" ? "🌐 Global" : "🇧🇩 Bangladesh"}
                          </span>
                          <span className="bg-muted px-2 py-0.5 rounded-full">{article.source || "Unknown Source"}</span>
                          <span className="bg-muted/60 px-2 py-0.5 rounded-full">{article.category || "General"}</span>
                          <span>{new Date(article.created_at).toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {article.ai_summary || "No AI summary available."}
                        </p>
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedArticleId(expandedArticleId === article.id ? null : article.id)}
                            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {expandedArticleId === article.id ? "▲ Hide Full News Story" : `▼ Read Full News Story (${article.raw_content?.length || 0} chars)`}
                          </button>
                          {expandedArticleId === article.id && (
                            <div className="mt-2 p-3 bg-muted/40 rounded-xl border border-border/50 text-xs leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap font-normal text-foreground/90">
                              {article.raw_content || "No full content recorded."}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {activeTab === "pending" && (
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm" onClick={() => handleApprove(article.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(article)} title="Edit summary and full story">
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

      {/* Edit Modal (2 Versions: AI Summary + Full Article Body) */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card w-full max-w-3xl rounded-2xl p-6 shadow-2xl border border-border my-6 max-h-[90vh] flex flex-col text-foreground"
          >
            <div className="flex justify-between items-center pb-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-xl font-bold">Edit Article</h2>
                <p className="text-xs text-muted-foreground">Review and edit both the AI Summary (Quick Digest) and the Full Article Story</p>
              </div>
              <button onClick={() => setEditingArticle(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto py-4 pr-1 flex-1">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Headline (শিরোনাম)</Label>
                <input 
                  type="text" 
                  value={editForm.headline}
                  onChange={(e) => setEditForm({...editForm, headline: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold">1. AI Summary (সারসংক্ষেপ - News Feed & Audio)</Label>
                  <span className="text-[11px] text-muted-foreground font-mono">{editForm.ai_summary.length} chars</span>
                </div>
                <textarea 
                  rows={4}
                  value={editForm.ai_summary}
                  onChange={(e) => setEditForm({...editForm, ai_summary: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-foreground"
                  placeholder="Short narrative summary used for the main card and audio player..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold">2. Full Article Body (সম্পূর্ণ সংবাদ / মূল প্রতিবেদন)</Label>
                  <span className="text-[11px] text-muted-foreground font-mono">{editForm.raw_content.length} chars</span>
                </div>
                <textarea 
                  rows={9}
                  value={editForm.raw_content}
                  onChange={(e) => setEditForm({...editForm, raw_content: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-foreground leading-relaxed"
                  placeholder="Complete, unabridged article body shown on the full news details page..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-border shrink-0">
              <Button variant="outline" onClick={() => setEditingArticle(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
