"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    const gateway = searchParams.get("gateway");
    
    // For local gateways, verification is already handled by the callback route
    if (gateway === "sslcommerz" || gateway === "aamarpay") {
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
  }, [sessionId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h2 className="text-xl font-bold">Verifying Payment...</h2>
          <p className="text-slate-400">Please wait while we confirm your Premium upgrade.</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Premium!</h2>
            <p className="text-slate-400">
              Your payment was successful and your account has been upgraded.
            </p>
          </div>
          
          <div className="flex flex-col w-full gap-3 mt-4">
            {invoiceUrl && (
              <Button variant="outline" className="w-full bg-slate-800 border-slate-700 hover:bg-slate-700 h-12" asChild>
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Download Invoice
                </a>
              </Button>
            )}
            <Button 
              className="w-full h-12 flex items-center justify-center gap-2"
              onClick={() => router.push("/profile")}
            >
              Go to Profile
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-4xl font-bold">
            !
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h2>
            <p className="text-slate-400">
              We couldn't verify your payment. If you were charged, please contact support.
            </p>
          </div>
          <Button 
            variant="outline"
            className="w-full bg-slate-800 border-slate-700 hover:bg-slate-700 h-12 mt-4"
            onClick={() => router.push("/pricing")}
          >
            Return to Pricing
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
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
