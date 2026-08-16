"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Cpu, Database, Library, User, BarChart3 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function AdminLayout({
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
    return <div className="pt-32 text-center text-muted-foreground">Loading...</div>;
  }

  const userRole = (session?.user as any)?.role || "user";

  if (userRole !== "admin") {
    if (pathname === "/admin" || pathname.startsWith("/admin/users")) {
      redirect("/profile");
    }
  }

  const allNavItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard, adminOnly: true },
    { name: "User Management", href: "/admin/users", icon: Users, adminOnly: true },
    { name: "Scraping Control", href: "/admin/scraping", icon: Database, adminOnly: false },
    { name: "News Library", href: "/admin/library", icon: Library, adminOnly: false },
  ];

  const navItems = allNavItems.filter(item => !item.adminOnly || userRole === "admin");

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-[72px] sm:pt-[84px] md:pt-[96px] pb-20 md:pb-28">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">{session?.user?.name || "User"}</h2>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {userRole === "admin" ? "System Administrator" : "Premium Studio"}
              </p>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm font-bold" 
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
