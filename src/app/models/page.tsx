"use client";

import React from "react";
import Link from "next/link";
import {
  Cpu,
  Download,
  Database,
  Chrome,
  Zap,
  Shield,
  CheckCircle2,
  Lock,
  Sparkles,
  ExternalLink,
  VolumeX,
  Radio,
  ArrowRight,
  HardDrive,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export default function AIModelsPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const user = session?.user as any;
  const isPremium =
    user?.tier?.toLowerCase() === "premium" ||
    user?.role?.toLowerCase() === "admin";
  const isAuthenticated = !!session?.user;

  return (
    <main className="min-h-screen bg-background text-foreground pb-20 md:pb-28 pt-[72px] sm:pt-[84px] md:pt-[96px] font-sans">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Audio Research & Datasets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 flex items-center justify-center gap-2.5 text-foreground">
            <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            KahfStudio{" "}
            <span className="text-primary">AI Models & Datasets</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore our open-source audio datasets for deep learning research, understand our neural speech separation pipeline, and download the real-time Halal Mode browser extension.
          </p>
        </div>

        {/* Visual Presentation Section (Model Architecture) */}
        <section className="mb-10 sm:mb-14">
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 shadow-sm overflow-hidden relative">
            {/* Visual glow background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl max-h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="text-center mb-6 sm:mb-8 relative z-10">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1.5">
                How Our Model Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                A state-of-the-art neural architecture designed to isolate spoken vocals and filter background instrumental music in real time.
              </p>
            </div>

            {/* Architecture Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 relative z-10 py-3 sm:py-5">
              {/* Input Node */}
              <div className="bg-card/90 border border-border p-4 rounded-2xl shadow-sm text-center w-full md:w-52">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground">Raw Audio Feed</div>
                <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                  Mixed speech & background music
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-muted-foreground/60 hidden md:block text-lg">
                →
              </div>

              {/* Model Processing Core */}
              <div className="bg-primary/5 border border-primary/30 p-5 sm:p-6 rounded-2xl shadow-sm text-center w-full md:w-64 relative">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground">
                  Kahf Separation Core
                </div>
                <div className="text-[10px] sm:text-[11px] text-primary font-semibold mt-0.5">
                  Deep Transformer Filter
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-muted-foreground/60 hidden md:block text-lg">
                →
              </div>

              {/* Output Nodes */}
              <div className="flex flex-col gap-3 w-full md:w-56">
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      Natural Speech Voice
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Crystal clear human speech
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl opacity-70">
                  <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <VolumeX className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-muted-foreground">
                      Musical Instruments
                    </div>
                    <div className="text-[10px] text-muted-foreground/70">
                      Silenced in real-time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1.5">
            Datasets & Browser Extension
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Audio datasets are public and accessible to all researchers. The Music Remover Extension is exclusively available for Premium members.
          </p>
        </div>

        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10 mb-12">
          {/* Card 1: Natsep 20k Full Audio Dataset (Google Drive) */}
          <Card className="h-full bg-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-5">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                  Public Access
                </span>
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Natsep 20k Audio Dataset
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Full 20,000 paired multi-speaker audio recordings for training deep neural speech separation & vocal isolation models.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mb-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Storage Size</span>
                  <span className="font-mono text-foreground font-bold">1.5 TB</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Recordings</span>
                  <span className="font-mono text-foreground font-semibold">20,000 Samples</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Platform</span>
                  <span className="font-mono text-foreground font-semibold">Google Drive</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-2">
              <Button
                asChild
                className="w-full h-9 text-xs sm:text-sm gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm cursor-pointer"
              >
                <a
                  href="https://drive.google.com/drive/folders/19qlT89roXH9xwetM6vPH8kDxIwtqk97C"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-3.5 h-3.5" /> Access Drive (1.5 TB)
                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: Natsep Audio Dataset Part 01 (Kaggle) */}
          <Card className="h-full bg-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-5">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                  Public Access
                </span>
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Natsep Dataset (Part 01)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Curated benchmark subset published on Kaggle for quick evaluation, experimentation, and benchmarking.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mb-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Size on Kaggle</span>
                  <span className="font-mono text-foreground font-bold">18 GB</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Format</span>
                  <span className="font-mono text-foreground font-semibold">.wav + JSON</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>License</span>
                  <span className="font-mono text-foreground font-semibold">Open Source</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-2">
              <Button
                asChild
                className="w-full h-9 text-xs sm:text-sm gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm cursor-pointer"
              >
                <a
                  href="https://www.kaggle.com/datasets/inboxhasibur/natsep-audio-dataset-part-01"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Database className="w-3.5 h-3.5" /> Get Kaggle Dataset
                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Card 3: Halal Mode Chrome Extension (Premium Gated) */}
          <Card className={`h-full bg-card transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-5 border ${isPremium ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-amber-500/30"}`}>
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <Chrome className="w-5 h-5" />
                </div>
                {isPremium ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Premium Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Premium Only
                  </span>
                )}
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center justify-between">
                <span>Music Remover Extension</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Real-time vocal isolation and musical instrument suppression across YouTube, Spotify, and all websites.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 mb-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Type</span>
                  <span className="font-mono text-foreground font-semibold">Chrome Extension</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1.5">
                  <span>Compatibility</span>
                  <span className="font-mono text-foreground font-semibold">Chrome, Edge, Brave</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Latency</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">0ms Real-Time</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-0 pt-2 flex flex-col gap-2">
              {isLoading ? (
                <div className="h-9 w-full bg-muted/40 animate-pulse rounded-xl" />
              ) : isPremium ? (
                <>
                  <Button
                    asChild
                    className="w-full h-9 text-xs sm:text-sm gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    <a
                      href="/downloads/kahf-halal-mode-extension.zip"
                      download="kahf-halal-mode-extension.zip"
                    >
                      <Download className="w-3.5 h-3.5" /> Download (.zip)
                    </a>
                  </Button>
                  <a
                    href="https://drive.google.com/file/d/1ByDT0MjRrhl4acrN6CNd9Y9iDULcHYOm/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-center text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    Google Drive Mirror <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </>
              ) : isAuthenticated ? (
                <Button
                  asChild
                  className="w-full h-9 text-xs sm:text-sm gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
                >
                  <Link href="/pricing">
                    Upgrade to Premium <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full h-9 text-xs sm:text-sm gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
                >
                  <Link href="/login?redirect=/models">
                    Sign In to Access <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Step-by-Step Installation Guide */}
        <section className="max-w-3xl mx-auto mb-12">
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1.5 flex items-center gap-2">
              <Chrome className="w-5 h-5 text-primary" />
              Chrome Extension 4-Step Setup Guide
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">
              Install the extension into Google Chrome, Brave, or Microsoft Edge in less than 60 seconds:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Download & Extract
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground font-mono">kahf-halal-mode-extension.zip</code> and unzip it to any folder on your computer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Open Extensions Page
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In your browser URL bar, go to <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground font-mono">chrome://extensions</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Enable Developer Mode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turn on the <strong>Developer mode</strong> toggle button at the top-right corner.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Load Unpacked
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click <strong>Load unpacked</strong> and select the extracted extension folder. You're all set!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
              <VolumeX className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Zero Music Clutter</span>
                <span className="text-muted-foreground">Silences background musical instruments cleanly.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
              <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Universal Compatibility</span>
                <span className="text-muted-foreground">Runs on YouTube, news feeds & web players.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
              <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">100% Private</span>
                <span className="text-muted-foreground">Processes audio entirely on your device.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
