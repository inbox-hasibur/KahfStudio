"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Download,
  Database,
  Chrome,
  Monitor,
  Terminal,
  Layers,
  ArrowLeft,
  ArrowRight,
  Zap,
  Play,
  CheckCircle,
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
import Link from "next/link";

const WindowsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
);

const MacIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
  </svg>
);

const LinuxIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M11.97 22.036c-1.897 0-3.153-1.054-4.04-1.708-.475-.353-.615-.472-.615-.472s-.42.062-.835.347c-.896.61-2.158 1.47-3.376.602-1.396-.995.143-3.61.143-3.61s-2.008-1.547-2.03-3.882c-.015-1.57.945-2.585 1.614-3.179-.537-2.154-1.442-5.748 1.03-8.291 1.848-1.898 4.417-1.83 5.46-1.83 1.042 0 3.611-.067 5.46 1.83 2.472 2.543 1.566 6.137 1.03 8.29.667.595 1.628 1.61 1.613 3.18-.023 2.335-2.03 3.881-2.03 3.881s1.538 2.615.143 3.61c-1.218.868-2.48.008-3.376-.602-.415-.285-.835-.347-.835-.347s-.14.12-.615.472c-.887.654-2.143 1.708-4.04 1.708" />
  </svg>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function AIModelsPage() {
  return (
    <motion.main
      className="max-w-[1200px] mx-auto px-2.5 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28 font-sans"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-2.5 sm:mb-3.5 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
        </Link>
      </motion.div>

      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
              KahfNews <span className="text-primary">AI Models</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-[13px]">
              Open-source neural networks, datasets & local tools
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-[650px] leading-relaxed">
          Discover our state-of-the-art neural architecture. Download raw AI weights, access curated audio datasets, and integrate browser extensions for real-time speech separation.
        </p>
      </motion.div>

      {/* Visual Model Architecture Section */}
      <motion.section variants={itemVariants} className="mb-4 sm:mb-6">
        <div className="relative bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 overflow-hidden shadow-sm">
          {/* Subtle Top Center Ambient Radial Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary/10 dark:bg-primary/25 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6 sm:mb-8 relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 border border-primary/20">
              <Zap className="w-3 h-3 fill-current" />
              Architecture
            </span>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground">
              How Our AI Model Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mt-1">
              Real-time transformer network separating speech from background music with zero latency.
            </p>
          </div>

          {/* Architecture Visual Diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 relative z-10 py-2 sm:py-4">
            {/* Input Node */}
            <div className="flex flex-col items-center group text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted/70 border border-border rounded-xl flex items-center justify-center shadow-sm group-hover:border-primary/50 transition-colors z-10 relative">
                <Play className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-0.5" />
              </div>
              <span className="mt-2 font-bold text-xs sm:text-[13px] text-foreground">
                Raw News Audio
              </span>
              <span className="text-[10px] text-muted-foreground">
                Speech + Noise
              </span>
            </div>

            {/* Connecting Track (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-[80px] h-0.5 bg-border relative overflow-hidden rounded-full">
              <motion.div 
                className="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Neural Network Core */}
            <div className="relative group my-1 md:my-0">
              <motion.div 
                className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex flex-col items-center justify-center shadow-lg relative z-10 border border-primary/40 text-primary-foreground p-2 text-center"
                animate={{ boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0)", "0 0 0 8px rgba(16, 185, 129, 0.15)", "0 0 0 16px rgba(16, 185, 129, 0)"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              >
                <Layers className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
                <span className="font-bold text-[11px] sm:text-xs leading-tight">
                  KahfNews
                  <br />
                  Vocal Filter
                </span>
              </motion.div>
            </div>

            {/* Connecting Track (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-[80px] h-0.5 bg-border relative overflow-hidden rounded-full">
              <motion.div 
                className="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.75 }}
              />
            </div>

            {/* Output Nodes */}
            <div className="flex flex-col gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-primary/30 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-primary">
                    Clean Natural Voice
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Zero latency isolation
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 text-xs">
                  🎵
                </div>
                <div>
                  <div className="font-bold text-xs text-muted-foreground">
                    Music & Background Noise
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    Filtered & removed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section Header: Downloads & Tools */}
      <motion.div variants={itemVariants} className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          Downloads & Developer Extensions
        </h2>
      </motion.div>

      {/* Downloads Grid (2x2 Compact Cards) */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Raw Model */}
        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col justify-between p-4 sm:p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Raw AI Model Weights
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    ONNX & PyTorch vocal separation models
                  </CardDescription>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground my-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="font-mono text-foreground font-semibold">.onnx / .pt</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Size</span>
                  <span className="font-mono text-foreground font-semibold">1.2 GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Architecture</span>
                  <span className="font-mono text-foreground font-semibold">Conformer-V2</span>
                </div>
              </div>
            </div>

            <Button className="w-full gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs sm:text-sm h-9">
              <Download className="w-3.5 h-3.5" /> Request Weights Access
            </Button>
          </Card>
        </motion.div>

        {/* 2. Dataset */}
        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col justify-between p-4 sm:p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Bengali Speech Dataset
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Curated Bengali news audio dataset
                  </CardDescription>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground my-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="font-mono text-foreground font-semibold">.wav + JSON</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Size</span>
                  <span className="font-mono text-foreground font-semibold">45 GB (Uncompressed)</span>
                </div>
                <div className="flex justify-between">
                  <span>License</span>
                  <span className="font-mono text-foreground font-semibold">CC BY-NC 4.0</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs sm:text-sm font-semibold rounded-xl h-9 border-border hover:bg-muted"
              >
                Sample Data
              </Button>
              <Button className="flex-1 gap-1.5 text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-9">
                <Download className="w-3.5 h-3.5" /> Get Dataset
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* 3. Chrome Extension */}
        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col justify-between p-4 sm:p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Chrome className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Chrome Web Extension
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Local WebAssembly real-time sound cleaner
                  </CardDescription>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed my-3">
                Seamlessly integrates into Chrome, Edge, and Brave. Processes news audio directly on your device with 100% privacy and zero latency.
              </p>
            </div>

            <Button className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs sm:text-sm h-9">
              <Chrome className="w-3.5 h-3.5" /> Add to Browser (Free)
            </Button>
          </Card>
        </motion.div>

        {/* 4. Desktop App */}
        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col justify-between p-4 sm:p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Kahf Desktop App
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    GPU-accelerated bulk audio processor
                  </CardDescription>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed my-3">
                Native desktop tool for batch processing hours of news broadcasts using GPU acceleration.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="group flex items-center justify-center gap-1.5 h-9 border-border hover:bg-muted rounded-xl px-2"
              >
                <WindowsIcon />
                <span className="font-bold text-xs">Win</span>
              </Button>
              <Button
                variant="outline"
                className="group flex items-center justify-center gap-1.5 h-9 border-border hover:bg-muted rounded-xl px-2"
              >
                <MacIcon />
                <span className="font-bold text-xs">Mac</span>
              </Button>
              <Button
                variant="outline"
                className="group flex items-center justify-center gap-1.5 h-9 border-border hover:bg-muted rounded-xl px-2"
              >
                <LinuxIcon />
                <span className="font-bold text-xs">Linux</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
