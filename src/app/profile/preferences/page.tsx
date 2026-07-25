"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { createClient } from "@/utils/supabase/client";

export default function PreferencesPage() {
  const { data: session } = useSession();
  const supabase = createClient();
  const categories = ["Technology", "Politics", "Sports", "Entertainment", "Science", "Business", "Health", "World"];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "");
      setName(session.user.name || "");
      
      if (session.user.id) {
        supabase.from('profiles').select('full_name, interests').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              if (data.full_name) setName(data.full_name);
              if (data.interests) setInterests(data.interests);
            }
            setLoading(false);
          });
      }
    }
  }, [session, supabase]);

  const toggleInterest = (category: string) => {
    setInterests(prev => 
      prev.includes(category) 
        ? prev.filter(i => i !== category)
        : [...prev, category]
    );
  };

  const saveProfile = async () => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', session.user.id);
    if (!error) alert("Profile updated!");
    else alert("Failed to update profile");
  };

  const saveInterests = async () => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('profiles').update({ interests }).eq('id', session.user.id);
    if (!error) alert("Interests saved!");
    else alert("Failed to save interests");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading preferences...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Preferences</h1>
        <p className="text-muted-foreground mt-1">
          Customize your experience, manage your profile, and UI settings.
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Update your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-white/5 dark:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2 px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <input 
              type="email" 
              value={email}
              disabled
              className="w-full bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[14px] text-muted-foreground opacity-70"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveProfile} className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6">Save Changes</Button>
        </CardFooter>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Content Interests</CardTitle>
          <CardDescription>
            Select the topics you want to see more of in your Discover feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button 
                key={category} 
                variant="outline" 
                onClick={() => toggleInterest(category)}
                className={`rounded-full transition-all ${
                  interests.includes(category)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-transparent text-foreground"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveInterests} className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6">Save Interests</Button>
        </CardFooter>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Manage what alerts and updates you receive via email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-medium">Daily Briefing</p>
              <p className="text-sm text-muted-foreground">Receive your personalized daily AI summary via email.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-medium">Breaking News Alerts</p>
              <p className="text-sm text-muted-foreground">Instant notifications for major global events.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-medium">Marketing & Promotions</p>
              <p className="text-sm text-muted-foreground">Updates about new features and offers.</p>
            </div>
            <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Halal Mode Default</p>
              <p className="text-sm text-muted-foreground">Automatically enable Halal Mode (Music Remover) for videos.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-destructive/20 mt-8">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
            </div>
            <Button variant="destructive" className="whitespace-nowrap">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
