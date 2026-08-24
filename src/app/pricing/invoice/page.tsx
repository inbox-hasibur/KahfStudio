"use client";

import React from 'react';
import { Shield, FileText, CheckCircle, Printer } from 'lucide-react';

export default function LocalInvoicePage({ searchParams }: { searchParams: any }) {
  const gateway = searchParams?.gateway || 'Local Payment';
  const displayGateway = gateway === 'sslcommerz' ? 'SSLCommerz' : gateway;
  
  const today = new Date();
  const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 flex justify-center font-sans">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 flex justify-between items-start text-white">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">KahfNews</h1>
            <p className="text-slate-400 text-sm">Premium AI News Features</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-200 mb-1">INVOICE</h2>
            <p className="text-slate-400 text-sm font-mono">{invoiceNumber}</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-8">
          <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">KahfNews User</p>
              <p className="text-slate-500 text-sm mt-1">user@example.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Payment Method</p>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 w-max">
              <Shield className="w-4 h-4 text-emerald-500" />
              Processed securely via {displayGateway}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-4 text-slate-800 dark:text-slate-200 font-medium">KahfNews Premium Subscription</td>
                <td className="py-4 text-right text-slate-800 dark:text-slate-200 font-bold">Paid</td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400">Payment Successful</span>
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-500 font-medium">Thank you for your business!</p>
          </div>
        </div>

        {/* Footer */}
        <div className="print:hidden bg-slate-50 dark:bg-slate-800/50 p-6 flex justify-center border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
