"use client";

import React from "react";
import Link from "next/link";
import {
  Cpu,
  Download,
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
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Halal Audio Filter</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 flex items-center justify-center gap-2.5 text-foreground">
            <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            KahfStudio{" "}
            <span className="text-primary">Music Remover Extension</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Eliminate background music across YouTube, news streams, and web media
            in real time while keeping human speech and narration crystal clear.
          </p>
        </div>

        {/* Extension Download & Access Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="bg-card border-border/80 shadow-md rounded-2xl sm:rounded-3xl overflow-hidden border">
            <CardHeader className="p-6 sm:p-8 pb-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Chrome className="w-6 h-6" />
                </div>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Premium Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    Premium Only
                  </span>
                )}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                Kahf Halal Mode Chrome Extension
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Real-time vocal isolation and musical instrument suppression for Google Chrome, Brave, and Edge browsers.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                  <VolumeX className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">Zero Background Music</span>
                    <span className="text-muted-foreground">Silences instruments without clipping human voices.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                  <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">Works Everywhere</span>
                    <span className="text-muted-foreground">Compatible with YouTube, Spotify Web, and news sites.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">Zero Latency</span>
                    <span className="text-muted-foreground">Fast in-browser audio filtering with no buffering.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">100% Private</span>
                    <span className="text-muted-foreground">Processes audio locally; no audio ever leaves your computer.</span>
                  </div>
                </div>
              </div>

              {/* Conditional Action: Premium vs Free */}
              <div className="pt-2">
                {isLoading ? (
                  <div className="h-12 w-full bg-muted/40 animate-pulse rounded-xl" />
                ) : isPremium ? (
                  <div className="space-y-3">
                    <Button
                      asChild
                      size="lg"
                      className="w-full h-12 text-sm sm:text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer"
                    >
                      <a
                        href="/downloads/kahf-halal-mode-extension.zip"
                        download="kahf-halal-mode-extension.zip"
                      >
                        <Download className="w-4 h-4" /> Download Chrome Extension (.zip)
                      </a>
                    </Button>
                    <div className="text-center">
                      <a
                        href="https://drive.google.com/file/d/1ByDT0MjRrhl4acrN6CNd9Y9iDULcHYOm/view?usp=sharing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                      >
                        Alternative Google Drive Mirror <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
                    <p className="text-xs sm:text-sm text-foreground/80 font-medium">
                      This extension is reserved exclusively for <strong className="text-amber-500">Premium Members</strong>.
                      Upgrade today to unlock the extension and premium news features.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                      {isAuthenticated ? (
                        <Button
                          asChild
                          size="lg"
                          className="font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                        >
                          <Link href="/pricing">
                            Upgrade to Premium <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      ) : (
                        <>
                          <Button
                            asChild
                            size="lg"
                            className="font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                          >
                            <Link href="/login?redirect=/models">
                              Sign In to Check Access <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="font-bold rounded-xl"
                          >
                            <Link href="/pricing">
                              View Pricing
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step Installation Guide */}
        <section className="max-w-2xl mx-auto mb-12">
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 flex items-center gap-2">
              <Chrome className="w-5 h-5 text-primary" />
              Easy 4-Step Setup Guide
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">
              Install the extension into Google Chrome, Brave, or Microsoft Edge in less than 60 seconds:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Download & Extract
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download the <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground font-mono">kahf-halal-mode-extension.zip</code> file and unzip it into a folder on your computer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Open Extensions Page
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In your browser address bar, navigate to <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground font-mono">chrome://extensions</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Enable Developer Mode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle the <strong>Developer mode</strong> switch at the top right of the extensions page.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Load Unpacked
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click <strong>Load unpacked</strong> at the top left, then select the extracted extension directory. Kahf Halal Mode is now ready!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture & Filter Flow */}
        <section className="max-w-2xl mx-auto">
          <div className="bg-muted/30 border border-border/60 rounded-2xl p-6 text-center">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Real-Time Audio Pipeline
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              How the extension maintains high audio fidelity without background musical clutter
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
              <div className="p-3 bg-card rounded-xl border border-border/80 w-full sm:w-auto">
                <span className="font-semibold text-foreground block">Browser Media</span>
                <span className="text-[11px] text-muted-foreground">Speech + Music</span>
              </div>
              <div className="text-muted-foreground hidden sm:block">→</div>
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary font-bold w-full sm:w-auto">
                <span className="block">Kahf Halal Filter</span>
                <span className="text-[11px] font-normal opacity-80">Suppression Matrix</span>
              </div>
              <div className="text-muted-foreground hidden sm:block">→</div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold w-full sm:w-auto">
                <span className="block">Halal Voice</span>
                <span className="text-[11px] text-muted-foreground">Pure Speech Output</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
