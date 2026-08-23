"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Headphones, Play, Star, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function ProfileDashboard() {
  const { data: session } = useSession();
  const supabase = createClient();
  
  const [stats, setStats] = useState({
    audioCount: 0,
    videoCount: 0,
    apiCalls: 0,
    tier: "Free"
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!session?.user?.id) return;

      const [profileRes, podcastsRes, subRes] = await Promise.all([
        supabase.from('profiles').select('tier, gemini_api_key').eq('id', session.user.id).single(),
        supabase.from('podcast_archives').select('title, generated_at').eq('user_id', session.user.id).order('generated_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1)
      ]);

      setStats({
        audioCount: podcastsRes.data?.length || 0,
        videoCount: 0,
        apiCalls: profileRes.data?.gemini_api_key ? 1 : 0,
        tier: profileRes.data?.tier || "Free"
      });

      if (podcastsRes.data) {
        setRecentActivities(podcastsRes.data);
      }

      if (subRes.data && subRes.data.length > 0) {
        setSubscription(subRes.data[0]);
      }
    }
    
    fetchUserData();
  }, [session?.user?.id]);

  const handleCancelAutoRenew = async () => {
    if (!session?.user?.id) return;
    setIsSubLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSubscription((prev: any) => ({ ...prev, status: 'cancelled', auto_renew: false }));
        setActionMessage(data.message);
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (e) {
      alert('Failed to connect to server.');
    } finally {
      setIsSubLoading(false);
    }
  };

  const handleReactivateAutoRenew = async () => {
    if (!session?.user?.id) return;
    setIsSubLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSubscription((prev: any) => ({ ...prev, status: 'active', auto_renew: true }));
        setActionMessage(data.message);
      } else {
        alert(data.error || 'Failed to reactivate subscription');
      }
    } catch (e) {
      alert('Failed to connect to server.');
    } finally {
      setIsSubLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name || "User"}. Here's an overview of your activity.
          </p>
        </div>
        {stats.tier.toLowerCase() !== 'premium' && (
          <Link href="/pricing">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-105">
              <Star className="w-4 h-4 mr-2 fill-white" />
              Upgrade to Premium
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audio Listened</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.audioCount}</div>
            <p className="text-xs text-muted-foreground">Generated podcasts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.videoCount}</div>
            <p className="text-xs text-muted-foreground">Halal Mode VODs</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Key Set</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiCalls > 0 ? "Yes" : "No"}</div>
            <p className="text-xs text-muted-foreground">BYOK configuration</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary capitalize">{stats.tier}</div>
            <p className="text-xs text-muted-foreground">Current tier</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription & Recurring Management Card */}
      <Card className="bg-card/60 backdrop-blur-sm border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Subscription & Recurring Billing Management
              </CardTitle>
              <CardDescription className="mt-1">
                Manage your plan status, recurring payment cycle, and auto-renewal settings.
              </CardDescription>
            </div>

            {stats.tier.toLowerCase() === 'premium' ? (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Premium Plan Active
              </span>
            ) : (
              <span className="px-3 py-1 bg-muted text-muted-foreground border border-border rounded-full text-xs font-semibold">
                Free Tier
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {actionMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold rounded-xl">
              {actionMessage}
            </div>
          )}

          {stats.tier.toLowerCase() === 'premium' ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-muted/30 rounded-2xl border border-border gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground capitalize">
                    {subscription?.plan_type ? subscription.plan_type.replace('_', ' ') : 'Premium Plan'}
                  </span>
                  {subscription?.status === 'cancelled' || subscription?.auto_renew === false ? (
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold rounded-full">
                      Auto-Renew OFF (Canceling at end of cycle)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-500/15 text-green-500 border border-green-500/30 text-[10px] font-bold rounded-full">
                      Recurring Auto-Renew Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valid until: <strong className="text-foreground">{subscription?.valid_until ? new Date(subscription.valid_until).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "Active"}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {subscription?.status === 'cancelled' || subscription?.auto_renew === false ? (
                  <Button
                    onClick={handleReactivateAutoRenew}
                    disabled={isSubLoading}
                    className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold py-2"
                  >
                    {isSubLoading ? "Reactivating..." : "Re-enable Auto-Renew"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCancelAutoRenew}
                    disabled={isSubLoading}
                    variant="outline"
                    className="w-full md:w-auto border-red-500/40 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold py-2 cursor-pointer"
                  >
                    {isSubLoading ? "Cancelling..." : "Cancel Recurring Subscription"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border gap-3">
              <p className="text-xs text-muted-foreground">
                You are currently on the Free plan. Upgrade to unlock AI podcasts, unlimited voice summary, and ad-free experience.
              </p>
              <Link href="/pricing" className="shrink-0 w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest interactions with KahfNews.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">Listened to '{activity.title}'</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Headphones className="w-3 h-3" /> Audio News Podcast
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(activity.generated_at).toLocaleDateString()}
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground py-4 text-center">No recent activity found. Generate some podcasts!</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
