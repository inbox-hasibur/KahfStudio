"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Zap, Shield, Headphones, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PricingPage() {
  const { status } = useSession();

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-4 md:px-6 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div className="text-center max-w-3xl mx-auto mb-10 z-10" {...fadeIn}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Choose Your Plan
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-medium">
            Join the personalized news ecosystem. Automate your daily briefings and enjoy an ad-free, halal audio experience.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-center items-stretch w-full max-w-5xl mx-auto z-10 gap-8">
          {/* Free Plan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full md:w-1/2 relative"
          >
            <Card className="bg-slate-950/80 border border-slate-800 h-full flex flex-col rounded-[24px] overflow-hidden relative p-2 backdrop-blur-md">
              <CardHeader className="pb-6 pt-6 px-8 relative overflow-hidden">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                  Free
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-2 font-medium max-w-[85%] relative z-10 leading-relaxed">
                  Basic access to stay informed with standard news updates.
                </CardDescription>

                <div className="mt-6 mb-2 h-10"></div> {/* Spacer to align with premium toggle */}

                <div className="mt-4 flex items-baseline text-4xl font-bold relative z-10">
                  <span className="text-3xl mr-1 font-bold text-white">৳</span>0
                  <span className="text-base text-slate-400 font-medium ml-2">/forever</span>
                </div>
              </CardHeader>
              
              <CardContent className="px-8 flex-1">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">Platform-generated daily news</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">Basic Text-to-Speech audio</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Archive className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">General Podcast Archive</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-4">
                <Link href="/register" className="w-full">
                  <Button className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl font-bold text-[15px]">
                    Current Plan
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full md:w-1/2 relative"
          >
            <Card className="bg-slate-950 border border-primary/50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] h-full flex flex-col rounded-[24px] overflow-hidden relative p-2">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              
              <CardHeader className="pb-6 pt-6 px-8 relative overflow-hidden">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                  <Star className="w-5 h-5 text-amber-500" />
                  Premium
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-2 font-medium max-w-[85%] relative z-10 leading-relaxed">
                  Everything you need. Full power of AI for your personalized news ecosystem.
                </CardDescription>

                <div className="mt-6 mb-2 h-10"></div> {/* Spacer to match layout */}

                <div className="mt-4 flex items-baseline text-4xl font-bold relative z-10">
                  <span className="text-3xl mr-1 font-bold text-white">৳</span>1,000
                  <span className="text-base text-slate-400 font-medium ml-2">/yr</span>
                </div>
              </CardHeader>
              
              <CardContent className="px-8 flex-1">
                <ul className="space-y-4">
                  {/* Premium Extra Features */}
                  <li className="flex items-start gap-3">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">Personalized News Generation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">Halal Mode (MDX-Net Filtering)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-sm font-medium">BYOK (Bring Your Own Key) Support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-sm font-medium">Personalized Podcast Archive</span>
                  </li>
                  <div className="border-t border-slate-800 my-4" />
                  <li className="text-xs text-slate-400">Plus all Free plan features</li>
                </ul>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-4">
                <Link href={status === "authenticated" ? "/profile" : "/register"} className="w-full">
                  <Button className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl font-bold text-[15px]">
                    {status === "authenticated" ? "Upgrade Now" : "Get Premium"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
