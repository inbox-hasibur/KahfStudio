"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Crown, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserPaymentHistoryPage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as { id: string };
  const [profile, setProfile] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch(`/api/admin/users/${resolvedParams.id}`);
        if (res.ok) {
          const { profile: p, subscriptions: s } = await res.json();
          setProfile(p);
          setSubscriptions(s || []);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchUserData();
  }, [resolvedParams.id]);

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
          <Button variant="ghost" className="gap-2 -ml-4 mb-2 text-muted-foreground hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to Users</Button>
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          User Payment History
        </h1>
        <p className="text-muted-foreground mt-1">
          View subscription records and payment history for {profile.full_name || "Unknown User"}.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              User Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-xs break-all">{profile.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Full Name</p>
              <p className="font-medium">{profile.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Tier</p>
              <div>
                {profile.tier === 'premium' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5" /> Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs font-semibold">
                    <User className="w-3.5 h-3.5" /> Free
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Joined Date</p>
              <p className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription History
            </CardTitle>
            <CardDescription>All subscription records for this user.</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-border rounded-xl bg-muted/10">
                No subscription history found for this user.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0f172a] text-white">
                    <tr>
                      <th className="px-4 py-3 font-medium">Plan Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Valid Until</th>
                      <th className="px-4 py-3 font-medium">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium capitalize">{sub.plan_type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sub.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                            sub.status === 'canceled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(sub.valid_until).toLocaleDateString()}
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
      </div>
    </div>
  );
}
