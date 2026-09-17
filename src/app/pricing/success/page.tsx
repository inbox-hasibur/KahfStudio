"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, FileText, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    const gateway = searchParams.get("gateway");
    
    // For local gateways, verification is already handled by the callback route
    if (gateway === "sslcommerz") {
      const refresh = async () => {
        const supabase = createClient();
        await supabase.auth.refreshSession();
        setStatus("success");
        setInvoiceUrl(`/pricing/invoice?gateway=${gateway}`);
      };
      refresh();
      return;
    }

    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        });
        const data = await res.json();
        
        if (data.success) {
          // Refresh session to get updated user_metadata (premium tier)
          const supabase = createClient();
          await supabase.auth.refreshSession();
          
          setStatus("success");
          if (data.invoiceUrl) {
            setInvoiceUrl(data.invoiceUrl);
          }
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    verifySession();
  }, [sessionId, searchParams]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-card/90 backdrop-blur-xl border border-border rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
    >
      {/* Decorative Glow Orbs */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verifying Payment...</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please wait a moment while we confirm your Premium upgrade status.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-5 py-3 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
              Upgrade Activated
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Welcome to Premium!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your payment was successful and your premium privileges are now fully unlocked across all devices.
            </p>
          </div>
          
          <div className="flex flex-col w-full gap-3 mt-2">
            {invoiceUrl && (
              <Button 
                variant="outline" 
                className="w-full bg-muted/40 border-border hover:bg-muted text-foreground h-12 rounded-xl font-semibold cursor-pointer" 
                asChild
              >
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Download Invoice
                </a>
              </Button>
            )}
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              Go to Profile
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground h-10 rounded-xl text-xs font-medium cursor-pointer"
              onClick={() => router.push("/")}
            >
              Back to News Feed
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-5 py-4 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Verification Issue</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We couldn't verify your transaction. If you were charged, please contact our support team with your receipt.
            </p>
          </div>
          <Button 
            variant="outline"
            className="w-full bg-muted/40 border-border hover:bg-muted text-foreground h-12 rounded-xl font-semibold mt-2 cursor-pointer"
            onClick={() => router.push("/pricing")}
          >
            Return to Pricing
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 relative overflow-hidden">
      <Navbar />
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 pt-24 pb-16">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }>
          <CheckoutSuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
