"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Lock, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function BYOKPage() {
<<<<<<< Updated upstream
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTier() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
        if (data && data.tier) {
          setTier(data.tier);
        }
      }
      setLoading(false);
    }
    checkTier();
  }, []);

  if (loading) {
=======
  const { data: session, status } = useSession();
  const isPremium = (session?.user as any)?.tier === "premium" || (session?.user as any)?.role === "admin";

  if (status === 'loading') {
>>>>>>> Stashed changes
    return <div className="text-center py-12 text-muted-foreground">Checking access...</div>;
  }

  if (tier !== 'premium') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">BYOK & API Management <Lock className="w-5 h-5 text-muted-foreground" /></h1>
          <p className="text-muted-foreground mt-1">
            Bring Your Own Key - configure your personal API keys for third-party AI services.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border relative overflow-hidden flex flex-col items-center justify-center text-center p-12 py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#020817] to-[#1e1b4b] opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">Premium Feature</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unlock "Bring Your Own Key" support to use your own API keys for limitless summarization, completely bypassing standard usage limits.
              </p>
            </div>
            
            <Link href="/pricing" className="inline-block mt-4">
              <Button className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 rounded-full h-11 shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95">
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">BYOK & API Management</h1>
        <p className="text-muted-foreground mt-1">
          Bring Your Own Key - configure your personal API keys for third-party AI services.
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Gemini API Key
          </CardTitle>
          <CardDescription>
            Enter your Google Gemini API key to unlock advanced summarization and translation features without rate limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input type="password" placeholder="AIzaSy..." className="font-mono text-sm bg-background" />
            <p className="text-xs text-muted-foreground">
              Your key is stored securely in your browser's local storage and is never sent to our servers.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6">Save Configuration</Button>
        </CardFooter>
      </Card>
      
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-green-500" />
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            Optional: Add an OpenAI key for fallback processing or specific model requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input type="password" placeholder="sk-..." className="font-mono text-sm bg-background" />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6">Save Configuration</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
