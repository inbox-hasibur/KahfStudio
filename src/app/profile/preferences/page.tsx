"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export default function PreferencesPage() {
  const { data: session } = useSession();
  const categories = ["Technology", "Politics", "Sports", "Entertainment", "Science", "Business", "Health", "World"];

  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
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
              className="w-full bg-muted/50 border border-border rounded-xl py-2 px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-muted/50 border border-border rounded-xl py-2 px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="default">Save Changes</Button>
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
            {categories.map((category, index) => (
              <Button 
                key={category} 
                variant={index % 3 === 0 ? "default" : "outline"} 
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary">Save Interests</Button>
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
    </motion.div>
  );
}
