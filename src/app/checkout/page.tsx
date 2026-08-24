"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Shield, Zap, CreditCard, Wallet, Globe, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function CheckoutContent() {
  const { data: sessionData, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const cycleParam = searchParams?.get("cycle") || (searchParams?.get("annual") === "true" ? "yearly" : "monthly");
  const [cycle, setCycle] = useState<"weekly" | "monthly" | "yearly">(
    cycleParam === "weekly" ? "weekly" : cycleParam === "yearly" ? "yearly" : "monthly"
  );
  const [activeTab, setActiveTab] = useState<"local" | "global">("global");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>("stripe");

  const isAnnual = cycle === "yearly";

  const localAmount = cycle === "weekly" ? 30 : cycle === "yearly" ? 1000 : 100;
  const globalAmount = cycle === "weekly" ? 0.5 : cycle === "yearly" ? 10 : 1;
  const planName = cycle === "weekly" ? "Premium Weekly (Recurring)" : cycle === "yearly" ? "Premium Yearly (Recurring)" : "Premium Monthly (Recurring)";

  const displayCurrency = activeTab === "local" ? "৳" : "$";
  const displayAmount = activeTab === "local" ? localAmount : globalAmount;

  // Sync URL when toggling cycle
  useEffect(() => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("cycle", cycle);
    window.history.replaceState({}, "", newUrl);
  }, [cycle]);

  useEffect(() => {
    if (!status && !sessionData?.user) {
      router.push("/auth/signin");
    }
  }, [status, router, sessionData]);

  const handleCheckout = async (gateway: 'lemonsqueezy' | 'stripe') => {
    if (!sessionData?.user?.id) return;
    setIsCheckoutLoading(true);

    const endpoint = gateway === 'stripe' ? '/api/checkout' : `/api/checkout/${gateway}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: sessionData.user.id, isAnnual: cycle === "yearly", cycle }),
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

  const handlePayClick = () => {
    if (activeTab === "local") {
      handleCheckout("sslcommerz" as any);
    } else {
      if (selectedMethod === "stripe") {
        handleCheckout("stripe");
      } else if (selectedMethod === "razorpay") {
        handleCheckout("razorpay" as any);
      } else {
        handleCheckout("lemonsqueezy");
      }
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 font-sans selection:bg-primary/20 text-foreground transition-colors">
      <div className="max-w-5xl mx-auto bg-card rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-border transition-colors">
        
        {/* Left Side: Order Summary */}
        <div className="w-full md:w-[40%] lg:w-[35%] bg-muted/40 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden border-r border-border transition-colors">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10">
            <Link href="/pricing" className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-10 bg-muted hover:bg-muted/80 px-4 py-2 rounded-full backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pricing
            </Link>

            <h1 className="text-4xl font-extrabold mb-10 tracking-tight text-foreground">Checkout</h1>

            <div className="bg-card/90 backdrop-blur-md rounded-3xl p-6 border border-border mb-6 shadow-xl transition-colors">
              
              {/* Weekly / Monthly / Yearly Cycle Switcher */}
              <div className="flex bg-muted/80 p-1 rounded-xl mb-6 shadow-inner gap-1">
                <button
                  onClick={() => setCycle("weekly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${cycle === "weekly" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setCycle("monthly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${cycle === "monthly" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle("yearly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${cycle === "yearly" ? "bg-card text-primary font-extrabold shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Yearly <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded ml-0.5">-16%</span>
                </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{planName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Full access to all features</p>
                </div>
                <div className="text-right">
                  <motion.span 
                    key={displayCurrency + displayAmount}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-2xl font-black inline-block text-primary"
                  >
                    {displayCurrency}{displayAmount.toLocaleString()}
                  </motion.span>
                </div>
              </div>

              <div className="border-t border-border my-5 transition-colors"></div>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="bg-amber-500/10 p-1.5 rounded-lg mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  </div>
                  <span className="text-foreground text-sm font-medium">Personalized Summarized News</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-blue-500/10 p-1.5 rounded-lg mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </div>
                  <span className="text-foreground text-sm font-medium">Halal Mode (Music Filtering)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-purple-500/10 p-1.5 rounded-lg mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  </div>
                  <span className="text-foreground text-sm font-medium">News Source Control</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-green-500/10 p-1.5 rounded-lg mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  </div>
                  <span className="text-foreground text-sm font-medium">Custom API Support</span>
                </li>
              </ul>
            </div>
          </div>

          </div>

        {/* Right Side: Payment Methods */}
        <div className="w-full md:w-[60%] lg:w-[65%] p-6 md:p-10 lg:p-12 bg-card flex flex-col justify-center transition-colors">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Select Payment Method</h2>
              <div className="text-xs font-bold text-foreground bg-muted px-4 py-2 rounded-full border border-border inline-flex items-center gap-2 w-fit transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {sessionData?.user?.email}
              </div>
            </div>

            {/* Side-by-side Layout for Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              
              {/* LOCAL BD PAYMENTS COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Local Gateways</h4>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div 
                    onClick={() => { setActiveTab("local"); setSelectedMethod("sslcommerz"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-row items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-blue-600 hover:-translate-y-0.5 h-16 bg-background group ${selectedMethod === "sslcommerz" && activeTab === "local" ? "border-blue-600 shadow-lg shadow-blue-600/20 bg-blue-500/10 ring-4 ring-blue-600/10" : "border-border"}`}
                  >
                    {selectedMethod === "sslcommerz" && activeTab === "local" && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-blue-600 rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-extrabold text-blue-600 tracking-tight text-xl">SSLCommerz</span>
                  </div>
                </div>

                <div className="bg-muted/50 border border-border rounded-2xl p-4 flex items-start gap-3 mt-4 transition-colors">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">Processed securely by <span className="font-bold text-foreground">SSLCommerz PGW</span> in BDT.</p>
                </div>
              </div>

              {/* GLOBAL PAYMENTS COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Global Gateways</h4>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Stripe - ENABLED */}
                  <div 
                    onClick={() => { setActiveTab("global"); setSelectedMethod("stripe"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-row items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-[#635BFF] hover:-translate-y-0.5 h-16 bg-background group ${selectedMethod === "stripe" && activeTab === "global" ? "border-[#635BFF] shadow-lg shadow-[#635BFF]/20 bg-[#635BFF]/10 ring-4 ring-[#635BFF]/10" : "border-border"}`}
                  >
                    {selectedMethod === "stripe" && activeTab === "global" && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-[#635BFF] rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-extrabold text-[#635BFF] text-2xl tracking-tight">stripe</span>
                  </div>

                </div>

                <div className="bg-muted/50 border border-border rounded-2xl p-4 flex items-start gap-3 mt-4 transition-colors">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">Processed by <span className="font-bold text-foreground">Stripe</span> in USD.</p>
                </div>
              </div>

            </div>

            <div className="mt-8">
              <Button 
                onClick={handlePayClick}
                disabled={isCheckoutLoading}
                className="w-full h-14 md:h-16 text-lg md:text-xl font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all bg-primary text-primary-foreground hover:bg-primary/90 border-0"
              >
                {isCheckoutLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <>Proceed to Pay {displayCurrency}{displayAmount.toLocaleString()}</>
                )}
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-xs font-medium">
                <Lock className="w-3 h-3" /> Payments are secure and encrypted.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CheckoutContent />
    </React.Suspense>
  )
}
