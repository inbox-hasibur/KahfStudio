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

  useEffect(() => {
    async function fetchUserData() {
      if (!session?.user?.id) return;

      const [profileRes, podcastsRes] = await Promise.all([
        supabase.from('profiles').select('tier, gemini_api_key').eq('id', session.user.id).single(),
        supabase.from('podcast_archives').select('title, generated_at').eq('user_id', session.user.id).order('generated_at', { ascending: false }).limit(5)
      ]);

      setStats({
        audioCount: podcastsRes.data?.length || 0,
        videoCount: 0, // Mock for now until VOD tracking is implemented
        apiCalls: profileRes.data?.gemini_api_key ? 1 : 0, // Simplified mock for BYOK usage
        tier: profileRes.data?.tier || "Free"
      });

      if (podcastsRes.data) {
        setRecentActivities(podcastsRes.data);
      }
    }
    
    fetchUserData();
  }, [session?.user?.id]);

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
        <Link href="/pricing">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-105">
            <Star className="w-4 h-4 mr-2 fill-white" />
            Upgrade to Premium
          </Button>
        </Link>
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
