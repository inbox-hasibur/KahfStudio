"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Zap, Shield, Headphones, Archive, Loader2, CreditCard, Wallet, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PricingPage() {
  const { data: sessionData, status } = useSession();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleClaimTrial = async () => {
    if (!sessionData?.user?.id) return;
    setIsTrialLoading(true);
    try {
      const response = await fetch('/api/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: sessionData.user.id })
      });
      const data = await response.json();
      if (data.success) {
        // Redirect to success page mimicking local gateways to trigger session refresh
        window.location.href = '/pricing/success?gateway=sslcommerz';
      } else {
        alert(data.error || 'Failed to claim trial');
        setIsTrialLoading(false);
      }
    } catch (err) {
      alert('Network error while claiming trial');
      setIsTrialLoading(false);
    }
  };

  const handleCheckout = async (gateway: 'lemonsqueezy' | 'aamarpay') => {
    if (!sessionData?.user?.id) return;
    setIsCheckoutLoading(true);
    try {
      const response = await fetch(`/api/checkout/${gateway}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: sessionData.user.id, isAnnual }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setIsCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Checkout request failed:", err);
      setIsCheckoutLoading(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-20 sm:pt-28 md:pt-32 pb-20 px-3 sm:px-6 relative overflow-hidden">
        <motion.div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 z-10" {...fadeIn}>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xs sm:text-base md:text-lg text-slate-400 font-medium mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            Join the personalized news ecosystem. Automate your daily briefings and enjoy an ad-free, halal audio experience.
          </p>

          <div className="flex items-center justify-center gap-2 sm:gap-3 bg-slate-900/50 p-1 sm:p-1.5 rounded-full border border-slate-800 w-fit mx-auto">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${!isAnnual ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${isAnnual ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Yearly
              <span className="bg-green-500/20 text-green-400 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full">Save 16%</span>
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-center items-stretch w-full max-w-5xl mx-auto z-10 gap-4 sm:gap-8">
          {/* Free Plan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full md:w-1/2 relative"
          >
            <Card className="bg-slate-950/80 border border-slate-800 h-full flex flex-col rounded-2xl sm:rounded-[24px] overflow-hidden relative p-1 sm:p-2 backdrop-blur-md">
              <CardHeader className="pb-4 sm:pb-6 pt-4 sm:pt-6 px-4 sm:px-8 relative overflow-hidden">
                <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white">
                  Free
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2 font-medium max-w-[85%] relative z-10 leading-relaxed">
                  Basic access to stay informed with standard news updates.
                </CardDescription>

                <div className="mt-3 sm:mt-4 flex items-baseline text-2xl sm:text-4xl font-bold relative z-10">
                  <span className="text-xl sm:text-3xl mr-1 font-bold text-white">৳</span>0
                  <span className="text-xs sm:text-base text-slate-400 font-medium ml-1.5 sm:ml-2">/forever</span>
                </div>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-8 flex-1">
                <ul className="space-y-2.5 sm:space-y-4">
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
                  <Button className="w-full bg-slate-800 text-white hover:bg-slate-700 h-12 rounded-xl font-bold text-[15px]">
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

                <div className="mt-4 flex items-baseline text-4xl font-bold relative z-10">
                  <span className="text-3xl mr-1 font-bold text-white">৳</span>
                  {isAnnual ? "1,000" : "100"}
                  <span className="text-base text-slate-400 font-medium ml-2">/{isAnnual ? 'yr' : 'mo'}</span>
                </div>
              </CardHeader>
              
              <CardContent className="px-8 flex-1">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">Personalized Summarized News</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">Halal Mode (Music Filtering)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">News Source Control</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                    <span className="text-slate-100 text-sm font-bold">Custom API Support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-sm font-medium">Personalized Podcast Archive</span>
                  </li>
                  <div className="border-t border-slate-800 my-4" />
                  <li className="text-xs text-slate-400">Plus all Free plan features</li>
                </ul>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-4 flex-col gap-3">
                {status === "authenticated" ? (
                  <>
                    <Link href={`/checkout?annual=${isAnnual}`} className="w-full">
                      <Button 
                        className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl font-bold text-[15px]"
                      >
                        Upgrade Now
                      </Button>
                    </Link>
                    <Button 
                      onClick={handleClaimTrial}
                      disabled={isTrialLoading || (sessionData?.user as any)?.tier === 'premium'}
                      variant="outline"
                      className="w-full h-12 rounded-xl font-bold text-[15px] border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      {isTrialLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim 7-Day Free Trial"}
                    </Button>
                  </>
                ) : (
                  <Link href="/register" className="w-full">
                    <Button className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl font-bold text-[15px]">
                      Get Premium
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
