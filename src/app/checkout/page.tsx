"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Shield, Zap, CreditCard, Wallet, Globe, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { initializePaddle, Paddle } from '@paddle/paddle-js';

function CheckoutContent() {
  const { data: sessionData, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isAnnual, setIsAnnual] = useState(searchParams?.get("annual") === "true");
  const [activeTab, setActiveTab] = useState<"local" | "global">("global");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [paddle, setPaddle] = useState<Paddle>();
  const [selectedMethod, setSelectedMethod] = useState<string | null>("stripe");

  const localAmount = isAnnual ? 1000 : 100;
  const globalAmount = isAnnual ? 10 : 1;
  const planName = isAnnual ? "Premium Plan (Yearly)" : "Premium Plan (Monthly)";

  const displayCurrency = activeTab === "local" ? "৳" : "$";
  const displayAmount = activeTab === "local" ? localAmount : globalAmount;

  useEffect(() => {
    // Only initialize paddle if the token is available
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    initializePaddle({ 
      environment: token.startsWith('test_') ? 'sandbox' : 'production', 
      token 
    }).then(
      (paddleInstance: Paddle | undefined) => {
        if (paddleInstance) setPaddle(paddleInstance);
      }
    );
  }, []);

  // Sync URL when toggling
  useEffect(() => {
    const newUrl = new URL(window.location.href);
    if (isAnnual) {
      newUrl.searchParams.set("annual", "true");
    } else {
      newUrl.searchParams.delete("annual");
    }
    window.history.replaceState({}, "", newUrl);
  }, [isAnnual]);

  useEffect(() => {
    if (!status && !sessionData?.user) {
      router.push("/auth/signin");
    }
  }, [status, router, sessionData]);

  const handleCheckout = async (gateway: 'lemonsqueezy' | 'aamarpay' | 'stripe' | 'paddle') => {
    if (!sessionData?.user?.id) return;
    setIsCheckoutLoading(true);
    
    // Paddle Client-Side Integration
    if (gateway === 'paddle' && paddle) {
      const priceId = isAnnual 
        ? process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID 
        : process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
        
      if (!priceId) {
        console.error("Paddle Price ID is missing.");
        setIsCheckoutLoading(false);
        return;
      }

      paddle.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1
          }
        ],
        customData: {
          userId: sessionData.user.id
        }
      });
      setIsCheckoutLoading(false);
      return;
    }

    const endpoint = gateway === 'stripe' ? '/api/checkout' : `/api/checkout/${gateway}`;

    try {
      const response = await fetch(endpoint, {
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

  const handlePayClick = () => {
    if (activeTab === "local") {
      if (selectedMethod === "sslcommerz") {
        handleCheckout("sslcommerz" as any);
      } else {
        // bKash, aamarPay, Card all go through aamarpay for now, or use their respective endpoints
        // wait, we replaced bKash with SSLCommerz, but if we want distinct, we should pass it.
        // I will just map sslcommerz to sslcommerz, and everything else to aamarpay
        handleCheckout(selectedMethod === "sslcommerz" ? "sslcommerz" : "aamarpay" as any);
      }
    } else {
      if (selectedMethod === "stripe") {
        handleCheckout("stripe");
      } else if (selectedMethod === "paddle") {
        handleCheckout("paddle" as any);
      } else if (selectedMethod === "razorpay") {
        handleCheckout("razorpay" as any);
      } else {
        handleCheckout("lemonsqueezy");
      }
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12 px-4 font-sans selection:bg-primary/20 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col md:flex-row border border-slate-200/60 dark:border-slate-800 transition-colors">
        
        {/* Left Side: Order Summary */}
        <div className="w-full md:w-[40%] lg:w-[35%] bg-slate-50/50 dark:bg-slate-800/20 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden border-r border-slate-200/60 dark:border-slate-800 transition-colors">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10">
            <Link href="/pricing" className="inline-flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-10 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 px-4 py-2 rounded-full backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pricing
            </Link>

            <h1 className="text-4xl font-extrabold mb-10 tracking-tight">Checkout</h1>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 mb-6 shadow-xl shadow-slate-100 dark:shadow-none transition-colors">
              
              {/* Monthly/Yearly Toggle Slider in Summary */}
              <div className="flex bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl mb-6 shadow-inner relative">
                <div 
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ transform: isAnnual ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${isAnnual ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  Yearly <span className="text-[10px] bg-primary/10 dark:bg-white/20 text-primary dark:text-white px-1.5 py-0.5 rounded ml-1">-20%</span>
                </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{planName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Full access to all features</p>
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

              <div className="border-t border-slate-100 dark:border-slate-700/50 my-5 transition-colors"></div>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="bg-amber-100 dark:bg-amber-500/20 p-1.5 rounded-lg mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Summarize News</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-500/20 p-1.5 rounded-lg mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Halal Mode (Music Filtering)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-green-100 dark:bg-green-500/20 p-1.5 rounded-lg mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Custom API Support</span>
                </li>
              </ul>
            </div>
          </div>

          </div>

        {/* Right Side: Payment Methods */}
        <div className="w-full md:w-[60%] lg:w-[65%] p-6 md:p-10 lg:p-12 bg-white dark:bg-slate-900 flex flex-col justify-center transition-colors">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Select Payment Method</h2>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 w-fit transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {sessionData?.user?.email}
              </div>
            </div>


            {/* Side-by-side Layout for Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              
              {/* LOCAL BD PAYMENTS COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Local Gateways</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => { setActiveTab("local"); setSelectedMethod("sslcommerz"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-blue-600 hover:-translate-y-0.5 h-24 bg-white dark:bg-slate-800 group ${selectedMethod === "sslcommerz" && activeTab === "local" ? "border-blue-600 shadow-lg shadow-blue-600/20 bg-blue-50/50 dark:bg-blue-600/10 ring-4 ring-blue-600/10" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    {selectedMethod === "sslcommerz" && activeTab === "local" && (
                      <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-extrabold text-blue-600 tracking-tight text-xl">SSLCommerz</span>
                  </div>

                  <div 
                    onClick={() => { setActiveTab("local"); setSelectedMethod("aamarpay"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-emerald-500 hover:-translate-y-0.5 h-24 bg-white dark:bg-slate-800 group ${selectedMethod === "aamarpay" && activeTab === "local" ? "border-emerald-500 shadow-lg shadow-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 ring-4 ring-emerald-500/10" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    {selectedMethod === "aamarpay" && activeTab === "local" && (
                      <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-extrabold text-emerald-600 tracking-tight text-xl">aamarPay</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-start gap-3 mt-4 transition-colors">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Processed securely by <span className="font-bold text-slate-700 dark:text-slate-300">{selectedMethod === 'sslcommerz' ? 'SSLCommerz' : 'aamarPay'} PGW</span> in BDT.</p>
                </div>
              </div>

              {/* GLOBAL PAYMENTS COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Global Gateways</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Stripe - ENABLED */}
                  <div 
                    onClick={() => { setActiveTab("global"); setSelectedMethod("stripe"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-[#635BFF] hover:-translate-y-0.5 h-24 bg-white dark:bg-slate-800 group ${selectedMethod === "stripe" && activeTab === "global" ? "border-[#635BFF] shadow-lg shadow-[#635BFF]/20 bg-[#635BFF]/5 dark:bg-[#635BFF]/10 ring-4 ring-[#635BFF]/10" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    {selectedMethod === "stripe" && activeTab === "global" && (
                      <div className="absolute top-2 right-2 bg-[#635BFF] rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-extrabold text-[#635BFF] text-2xl tracking-tight">stripe</span>
                  </div>

                  {/* Paddle - ENABLED */}
                  <div 
                    onClick={() => { setActiveTab("global"); setSelectedMethod("paddle"); }}
                    className={`relative border-2 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md hover:border-[#FF5A00] hover:-translate-y-0.5 h-24 bg-white dark:bg-slate-800 group ${selectedMethod === "paddle" && activeTab === "global" ? "border-[#FF5A00] shadow-lg shadow-[#FF5A00]/20 bg-[#FF5A00]/5 dark:bg-[#FF5A00]/10 ring-4 ring-[#FF5A00]/10" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    {selectedMethod === "paddle" && activeTab === "global" && (
                      <div className="absolute top-2 right-2 bg-[#FF5A00] rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xl tracking-tight">Paddle</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-start gap-3 mt-4 transition-colors">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Processed by <span className="font-bold text-slate-700 dark:text-slate-300">Stripe / Paddle</span> in USD.</p>
                </div>
              </div>

            </div>

            <div className="mt-8">
              <Button 
                onClick={handlePayClick}
                disabled={isCheckoutLoading}
                className="w-full h-14 md:h-16 text-lg md:text-xl font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white border-0"
              >
                {isCheckoutLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <>Proceed to Pay {displayCurrency}{displayAmount.toLocaleString()}</>
                )}
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-medium">
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
    <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <CheckoutContent />
    </React.Suspense>
  )
}
