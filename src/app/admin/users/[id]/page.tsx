"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Crown, ArrowLeft, CreditCard, Receipt, CheckCircle2, AlertCircle, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserPaymentHistoryPage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as { id: string };
  const [profile, setProfile] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("free");
  const [savingTier, setSavingTier] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch(`/api/admin/users/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setSelectedTier(data.profile?.tier?.toLowerCase() || "free");
          setSubscriptions(data.subscriptions || []);
          setInvoices(data.invoices || []);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchUserData();
  }, [resolvedParams.id]);

  const handleUpdateTier = async () => {
    setSavingTier(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated.profile);
        setMessage({ text: `User tier successfully updated to ${selectedTier.toUpperCase()}!`, type: "success" });
        // Refresh data to show any new subscription record
        const refreshRes = await fetch(`/api/admin/users/${resolvedParams.id}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setSubscriptions(refreshData.subscriptions || []);
          setInvoices(refreshData.invoices || []);
        }
      } else {
        const err = await res.json();
        setMessage({ text: err.error || "Failed to update tier", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: e.message || "An error occurred", type: "error" });
    }
    setSavingTier(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading user details...</div>;
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Link href="/admin/users">
          <Button variant="ghost" className="gap-2 -ml-4"><ArrowLeft className="w-4 h-4" /> Back to Users</Button>
        </Link>
        <div className="text-center py-12 text-muted-foreground">User not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost" className="gap-2 -ml-4 mb-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Button>
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          User Payment & Subscription Management
        </h1>
        <p className="text-muted-foreground mt-1">
          View invoices, subscriptions, and update tier permissions for {profile.full_name || profile.email || "User"}.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
          message.type === "success" 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* User Details & Tier Control */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">User ID</p>
                <p className="font-mono text-xs break-all bg-muted/40 p-2 rounded border border-border">{profile.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium text-foreground">{profile.full_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-foreground">{profile.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Tier</p>
                <div>
                  {profile.tier?.toLowerCase() === 'premium' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 text-xs font-semibold">
                      <Crown className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 text-xs font-semibold">
                      <User className="w-3.5 h-3.5" /> Free
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <p className="text-sm capitalize font-medium">{profile.role || 'user'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Joined Date</p>
                <p className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Tier Override */}
          <Card className="bg-card/50 backdrop-blur-sm border-border border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Change Tier Permissions
              </CardTitle>
              <CardDescription className="text-xs">
                Manually grant or revoke Premium access for this user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Select Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="free">Free Tier</option>
                  <option value="premium">Premium Tier</option>
                </select>
              </div>
              <Button
                onClick={handleUpdateTier}
                disabled={savingTier || selectedTier === profile.tier?.toLowerCase()}
                className="w-full gap-2 text-xs font-semibold"
                size="sm"
              >
                <Save className="w-3.5 h-3.5" />
                {savingTier ? "Saving..." : "Save Tier Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions & Invoices Tabs / Cards */}
        <div className="space-y-6 md:col-span-2">
          {/* Subscriptions Table */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Subscription History
              </CardTitle>
              <CardDescription>Records in the `subscriptions` table.</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-border rounded-xl bg-muted/10 text-sm">
                  No subscription records found for this user.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/70 text-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Plan Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Valid Until</th>
                        <th className="px-4 py-3 font-medium">Date Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs sm:text-sm">
                      {subscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium capitalize">{sub.plan_type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              sub.status === 'canceled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {sub.valid_until ? new Date(sub.valid_until).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Invoices Table */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Payment Invoices & Receipts
              </CardTitle>
              <CardDescription>Records in the `payment_invoices` table (SSLCommerz & Stripe).</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-border rounded-xl bg-muted/10 text-sm">
                  No payment invoices or transaction records found for this user.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/70 text-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Transaction ID</th>
                        <th className="px-4 py-3 font-medium">Provider</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs sm:text-sm">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs max-w-[140px] truncate" title={inv.transaction_id}>
                            {inv.transaction_id}
                          </td>
                          <td className="px-4 py-3 font-medium capitalize">
                            {inv.payment_provider || "Online"}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            ৳{Number(inv.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              inv.status === 'failed' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
