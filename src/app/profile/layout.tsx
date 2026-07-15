"use client";

import React from "react";
import Link from "next/link";
import { usePathname, redirect } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Key, Cpu, Settings, User } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/login");
    },
  });

  if (status === "loading") {
    return <div className="pt-32 text-center text-muted-foreground">Loading Profile...</div>;
  }

  const navItems = [
    { name: "Dashboard", href: "/profile", icon: LayoutDashboard },
    { name: "BYOK & API Management", href: "/profile/byok", icon: Key },
    { name: "Preferences", href: "/profile/preferences", icon: Settings },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-28 md:pt-36 pb-32">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{session?.user?.name || "User"}</h2>
              <p className="text-xs text-muted-foreground">{session?.user?.email || "user@example.com"}</p>
            </div>
          </div>
          
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
