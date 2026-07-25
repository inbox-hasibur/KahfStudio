"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, User, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "free" | "premium">("all");
  const supabase = createClient();

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User & Subscription Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts, view subscription details, and handle tier upgrades.
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              Users List
            </CardTitle>
            <CardDescription className="mt-1">View Basic and Premium users.</CardDescription>
          </div>
          
          {/* Integrated Tab Switcher */}
          <div className="flex bg-[#0f172a] p-1 rounded-xl w-full sm:w-auto border border-[#1e293b]">
            <button 
              onClick={() => setActiveTab("all")}
              className={`flex-1 sm:w-24 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "all" ? "bg-white text-black shadow-sm" : "text-white/70 hover:text-white"}`}
            >
              All Users
            </button>
            <button 
              onClick={() => setActiveTab("free")}
              className={`flex-1 sm:w-24 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "free" ? "bg-white text-black shadow-sm" : "text-white/70 hover:text-white"}`}
            >
              Free
            </button>
            <button 
              onClick={() => setActiveTab("premium")}
              className={`flex-1 sm:w-24 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "premium" ? "bg-white text-black shadow-sm" : "text-white/70 hover:text-white"}`}
            >
              Premium
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0f172a] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users
                    .filter(u => {
                      if (activeTab === "free") return u.tier !== "premium";
                      if (activeTab === "premium") return u.tier === "premium";
                      return true;
                    })
                    .map(user => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" title={user.id}>{user.id}</td>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {user.full_name || "Unknown User"}
                      </td>
                      <td className="px-4 py-3">
                        {user.tier === 'premium' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-semibold">
                            <Crown className="w-3.5 h-3.5" /> Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs font-semibold">
                            <User className="w-3.5 h-3.5" /> Free
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{user.role || 'user'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => {
                      if (activeTab === "free") return u.tier !== "premium";
                      if (activeTab === "premium") return u.tier === "premium";
                      return true;
                    }).length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
