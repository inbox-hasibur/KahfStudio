import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="w-20 h-20 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Checkout Cancelled</h2>
              <p className="text-slate-400">
                You have cancelled the checkout process. You have not been charged.
              </p>
            </div>
            
            <div className="w-full mt-4">
              <Button 
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 hover:bg-slate-700 h-12 flex items-center justify-center gap-2"
                asChild
              >
                <Link href="/pricing">
                  <ArrowLeft className="w-4 h-4" />
                  Return to Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
