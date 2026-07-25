"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key } from "lucide-react";

export default function BYOKPage() {
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
