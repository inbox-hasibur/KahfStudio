"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Cpu, Database, Library, User } from "lucide-react";
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

  // Allow access for now to let user test Admin UI
  // if ((session?.user as any)?.role !== "admin") {
  //   redirect("/profile");
  // }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Scraping Control", href: "/admin/scraping", icon: Database },
    { name: "News Library", href: "/admin/library", icon: Library },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-28 md:pt-36 pb-32">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-bold">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{session?.user?.name || "Admin"}</h2>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Administrator</p>
            </div>
          </div>
          
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-white text-black shadow-md" 
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
