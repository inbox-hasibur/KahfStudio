"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Cpu,
  Download,
  Database,
  Chrome,
  Terminal,
  Zap,
  Shield,
  ExternalLink,
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
  const { data: session } = useSession();
  const isPremium =
    (session?.user as any)?.tier?.toLowerCase() === "premium" ||
    (session?.user as any)?.role?.toLowerCase() === "admin";

  return (
    <main className="min-h-screen bg-background text-foreground pb-20 md:pb-28 pt-[72px] sm:pt-[84px] md:pt-[96px] font-sans">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-2.5 text-foreground">
            <Cpu className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            KahfNews{" "}
            <span className="text-primary">
              AI Models
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Discover the inner workings of our advanced neural networks.
            Download our raw AI models, datasets, and browser extensions
            for music-free audio processing.
          </p>
        </div>

        {/* Visual Presentation Section (Model Architecture) */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm overflow-hidden relative">
            {/* Visual background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl max-h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="text-center mb-6 sm:mb-8 relative z-10">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1.5">
                How Our Model Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                A state-of-the-art transformer architecture designed to separate
                vocals and background instruments with zero latency and high fidelity.
              </p>
            </div>

            {/* Architecture Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 relative z-10 py-3 sm:py-5">
              {/* Input Node */}
              <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-sm text-center w-full md:w-48">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground">Raw Audio Feed</div>
                <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                  Mixed speech & music
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-muted-foreground/60 hidden md:block">
                →
              </div>

              {/* Model Processing Core */}
              <div className="bg-primary/5 border border-primary/25 p-4 sm:p-5 rounded-2xl shadow-sm text-center w-full md:w-64 relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground">
                  Kahf Separation Core
                </div>
                <div className="text-[10px] sm:text-[11px] text-primary font-semibold mt-0.5">
                  Deep Transformer Filter
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-muted-foreground/60 hidden md:block">
                →
              </div>

              {/* Output Nodes */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 group">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary/10 border border-primary/30 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm relative">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-primary">
                      Natural Speech Voice
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground">
                      Filtered & crystal clear
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 group opacity-60">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-card border border-border rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-base sm:text-lg">🎵</span>
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-muted-foreground">Music & Background Noise</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground/70">
                      Removed completely
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-center text-foreground">
          Downloads & Extensions
        </h2>

        {/* Downloads Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 relative z-10">
          {/* Raw Model */}
          <div>
            <Card className="h-full bg-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-4 sm:p-5">
              <CardHeader className="p-0 mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                  <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                  Raw Sound Remover Model
                </CardTitle>
                <CardDescription className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
                  Advanced neural network for separating vocals and background music.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 mb-4">
                <div className="space-y-2 text-xs sm:text-[13px] text-muted-foreground">
                  <div className="flex justify-between border-b border-border/60 pb-1.5">
                    <span>Format</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      .onnx / .pt
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-1.5">
                    <span>Size</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      1.2 GB
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>Architecture</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      Transformer based
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 pt-2">
                <Button 
                  asChild
                  className="w-full h-8 sm:h-9 text-xs sm:text-sm gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm cursor-pointer"
                >
                  <a
                    href="https://drive.google.com/drive/folders/1FPW1eXpQht-fWM3QsmvICc52d_TlU37W?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Weights
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Dataset */}
          <div>
            <Card className="h-full bg-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-4 sm:p-5">
              <CardHeader className="p-0 mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                  Training Dataset
                </CardTitle>
                <CardDescription className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
                  Open-source dataset used to train the KahfNews AI audio models.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 mb-4">
                <div className="space-y-2 text-xs sm:text-[13px] text-muted-foreground">
                  <div className="flex justify-between border-b border-border/60 pb-1.5">
                    <span>Format</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      .wav + JSON
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-1.5">
                    <span>Size</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      45 GB
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>License</span>{" "}
                    <span className="font-mono text-foreground font-semibold">
                      MIT Open Source
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 pt-2 flex gap-2">
                <Button
                  asChild
                  className="w-full h-8 sm:h-9 text-xs sm:text-sm gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm cursor-pointer"
                >
                  <a
                    href="https://www.kaggle.com/datasets/inboxhasibur/natsep-audio-dataset-part-01"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Database className="w-3.5 h-3.5" /> Get Kaggle Dataset
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Chrome Extension */}
          <div>
            <Card className="h-full bg-card border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl flex flex-col justify-between p-4 sm:p-5">
              <CardHeader className="p-0 mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                  <Chrome className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground flex items-center justify-between">
                  <span>Halal Mode Extension</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                    Chrome
                  </span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
                  Automatically filter background music across YouTube, Spotify & websites.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 mb-4">
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Direct browser integration. Uses our local WebAssembly engine to silence background musical instruments in real-time, providing a seamless Halal listening experience everywhere you browse.
                </p>
              </CardContent>
              <CardFooter className="p-0 pt-2">
                {isPremium ? (
                  <Button
                    asChild
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    <a href="/downloads/kahf-halal-mode-extension.zip" download>
                      <Download className="w-3.5 h-3.5" /> Download Halal Extension (.zip)
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    <Link href="/pricing">
                      <Chrome className="w-3.5 h-3.5" /> Add to Chrome (Premium)
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
