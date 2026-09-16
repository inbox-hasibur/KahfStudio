"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Shield, CheckCircle, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function InvoiceContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const gatewayParam = searchParams.get('gateway') || 'sslcommerz';
  const tranIdParam = searchParams.get('tran_id') || searchParams.get('session_id');
  const planParam = searchParams.get('plan') || 'monthly';
  const displayGateway = gatewayParam.toLowerCase() === 'sslcommerz' ? 'SSLCommerz' : gatewayParam.toLowerCase() === 'stripe' ? 'Stripe' : 'Online Payment';

  const today = new Date();
  const invoiceNumber = tranIdParam || `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

  const userName = session?.user?.name || "Valued Subscriber";
  const userEmail = session?.user?.email || "subscriber@kahfnews.com";

  const isYearly = planParam === 'yearly';
  const planName = isYearly ? "KahfNews Premium (Yearly Plan)" : "KahfNews Premium (Monthly Plan)";
  const planPrice = gatewayParam.toLowerCase() === 'stripe' ? (isYearly ? "$10.00" : "$1.00") : (isYearly ? "৳1,000.00" : "৳100.00");

  return (
    <div className="max-w-2xl w-full bg-card shadow-2xl rounded-2xl overflow-hidden border border-border">
      {/* Header */}
      <div className="bg-primary/95 text-primary-foreground p-6 sm:p-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">KahfNews</h1>
          <p className="text-primary-foreground/80 text-xs sm:text-sm">Premium AI News Platform</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg sm:text-xl font-bold tracking-wider mb-1">INVOICE</h2>
          <p className="text-primary-foreground/75 text-[11px] sm:text-xs font-mono break-all max-w-[180px] sm:max-w-xs">{invoiceNumber}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-border">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Billed To</p>
            <p className="font-bold text-foreground text-sm sm:text-base">{userName}</p>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">{userEmail}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date of Payment</p>
            <p className="font-medium text-foreground text-xs sm:text-sm">
              {today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-emerald-500 font-bold mt-0.5">Status: Paid ✓</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground bg-muted/50 p-2.5 sm:p-3 rounded-xl border border-border w-max">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Processed securely via {displayGateway}</span>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2.5 text-xs font-bold uppercase tracking-wider">Description</th>
              <th className="text-right py-2.5 text-xs font-bold uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-3.5 text-foreground font-semibold text-xs sm:text-sm">
                <div>{planName}</div>
                <div className="text-[11px] text-muted-foreground font-normal">Full AI Audio briefings, unlimited personalization & ad-free experience</div>
              </td>
              <td className="py-3.5 text-right text-foreground font-bold text-xs sm:text-sm">{planPrice}</td>
            </tr>
            <tr>
              <td className="py-3 text-muted-foreground text-xs font-bold">Total Paid</td>
              <td className="py-3 text-right text-emerald-500 font-extrabold text-sm sm:text-base">{planPrice}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-between bg-emerald-500/10 p-3.5 sm:p-4 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">Payment Verified</span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Thank you for supporting KahfNews!</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="print:hidden bg-muted/30 p-4 sm:p-6 flex items-center justify-between border-t border-border gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-bold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
        </Link>
        <button 
          onClick={() => typeof window !== 'undefined' && window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all hover:scale-102"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

export default function LocalInvoicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8 flex items-center justify-center font-sans">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Generating Invoice...</p>
        </div>
      }>
        <InvoiceContent />
      </Suspense>
    </div>
  );
}
