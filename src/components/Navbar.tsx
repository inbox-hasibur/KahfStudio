"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Headphones, 
  Globe, 
  Archive, 
  LayoutGrid, 
  Menu, 
  X, 
  Search, 
  Sun, 
  Moon,
  Command,
  LogOut,
  ChevronDown,
  Cpu,
  CreditCard
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track scroll for navbar appearance change
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <motion.div 
      className="fixed top-2 md:top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[980px] px-2 md:px-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Main Navigation Dock - Enhanced Glassmorphism */}
          <motion.nav 
            className={`flex-1 glass-strong rounded-2xl p-1 md:p-1.5 flex items-center justify-between relative transition-all duration-500 ${
              scrolled ? "shadow-[0_8px_32px_rgba(0,0,0,0.15)]" : ""
            }`}
            whileHover={{ scale: 1.002 }}
            transition={{ duration: 0.3 }}
          >
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-2 pl-2 md:pl-4 pr-3 md:pr-6 border-r border-border">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-[14px] font-black text-white italic">K</span>
              </motion.div>
              <span className="text-sm font-black tracking-tighter text-foreground hidden sm:block">
                Kahf<span className="text-primary">News</span>
              </span>
            </Link>

            {/* Links - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/" icon={<Headphones className="w-4 h-4" />} label="News" active={pathname === "/"} />
              <NavLink href="/media" icon={<Globe className="w-4 h-4" />} label="Media" active={pathname === "/media"} />
              <NavLink href="/archive" icon={<Archive className="w-4 h-4" />} label="Archive" active={pathname === "/archive"} />
              <NavLink href="/models" icon={<Cpu className="w-4 h-4" />} label="AI Models" active={pathname === "/models"} />
            </div>

            <div className="flex items-center gap-1 pr-2">
              {/* Theme Toggle - Without animation */}
              {mounted && (
                <button 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-800"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              {/* Search Icon - With keyboard shortcut hint */}
              <motion.button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search className="w-4 h-4" />
                <span className="text-[11px] font-medium">Search</span>
                <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">
                  <Command className="w-3 h-3" />K
                </kbd>
              </motion.button>

              {/* Mobile Search Button */}
              <motion.button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="sm:hidden p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Search className="w-4 h-4" />
              </motion.button>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <motion.button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isMenuOpen ? "close" : "menu"}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </motion.nav>

          {/* Auth Buttons - Desktop */}
          <motion.div 
            className="hidden sm:flex glass-strong rounded-2xl p-1.5 items-center gap-1"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            {status === "authenticated" ? (
              <div className="flex items-center gap-2">
                <motion.button 
                  onClick={() => signOut()}
                  className="px-4 py-2 bg-transparent text-muted-foreground rounded-full text-[13px] font-bold hover:bg-muted hover:text-foreground transition-all flex items-center gap-2 h-9"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </motion.button>
                
                <div className="relative">
                  <motion.button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-9 h-9 rounded-full bg-[#1e293b] flex items-center justify-center text-white font-bold hover:bg-[#334155] transition-colors border border-[#334155]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                  </motion.button>
                  
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-64 rounded-2xl border border-border bg-slate-950 shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden py-2 z-50 flex flex-col"
                      >
                        <div className="px-5 py-3 border-b border-border bg-slate-900/50">
                          <p className="text-[14px] font-bold text-slate-200">{session?.user?.name}</p>
                          <p className="text-[12px] text-slate-400 truncate">{session?.user?.email}</p>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                          <Link href="/profile" onClick={() => setIsProfileDropdownOpen(false)}>
                            <div className="px-3 py-2 text-[13px] font-medium hover:bg-slate-800 rounded-xl cursor-pointer transition-colors text-slate-300 hover:text-white">
                              Dashboard
                            </div>
                          </Link>
                          <Link href="/profile/byok" onClick={() => setIsProfileDropdownOpen(false)}>
                            <div className="px-3 py-2 text-[13px] font-medium hover:bg-slate-800 rounded-xl cursor-pointer transition-colors text-slate-300 hover:text-white">
                              BYOK & API Management
                            </div>
                          </Link>
                          <Link href="/profile/preferences" onClick={() => setIsProfileDropdownOpen(false)}>
                            <div className="px-3 py-2 text-[13px] font-medium hover:bg-slate-800 rounded-xl cursor-pointer transition-colors text-slate-300 hover:text-white">
                              Preferences
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <motion.button 
                    className="px-5 py-2.5 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Login
                  </motion.button>
                </Link>
                <Link href="/register">
                  <motion.button 
                    className="px-5 py-2.5 bg-white text-zinc-900 rounded-xl text-[12px] font-bold hover:bg-zinc-100 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign&nbsp;up
                  </motion.button>
                </Link>
              </>
            )}
          </motion.div>
        </div>

        {/* Search Bar Overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              className="glass-strong rounded-2xl p-2"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search news, categories, or updates..."
                  className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <motion.button
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-3 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              {/* Search suggestions placeholder */}
              <div className="mt-2 px-4 py-2 text-[12px] text-muted-foreground">
                <span className="font-medium">Popular:</span> Politics, Technology, Sports, Weather
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              className="md:hidden glass-strong rounded-2xl p-3 md:p-4 flex flex-col gap-1"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <NavLink href="/" icon={<Headphones className="w-4 h-4" />} label="News" active={pathname === "/"} onClick={() => setIsMenuOpen(false)} />
              <NavLink href="/media" icon={<Globe className="w-4 h-4" />} label="Media" active={pathname === "/media"} onClick={() => setIsMenuOpen(false)} />
              <NavLink href="/archive" icon={<Archive className="w-4 h-4" />} label="Archive" active={pathname === "/archive"} onClick={() => setIsMenuOpen(false)} />
              <NavLink href="/models" icon={<Cpu className="w-4 h-4" />} label="AI Models" active={pathname === "/models"} onClick={() => setIsMenuOpen(false)} />
              <div className="h-px bg-border my-1" />
              <div className="flex gap-2 mt-1">
                {status === "authenticated" ? (
                  <>
                    <Link href="/profile" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                      <motion.button 
                        className="w-full py-3 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted min-h-[44px]"
                        whileTap={{ scale: 0.98 }}
                      >
                        Profile
                      </motion.button>
                    </Link>
                    <div className="flex-1">
                      <motion.button 
                        onClick={() => { signOut(); setIsMenuOpen(false); }}
                        className="w-full py-3 bg-destructive/10 text-destructive rounded-xl text-[13px] font-bold hover:bg-destructive hover:text-destructive-foreground transition-all min-h-[44px]"
                        whileTap={{ scale: 0.98 }}
                      >
                        Logout
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                      <motion.button 
                        className="w-full py-3 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted min-h-[44px]"
                        whileTap={{ scale: 0.98 }}
                      >
                        Login
                      </motion.button>
                    </Link>
                    <Link href="/register" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                      <motion.button 
                        className="px-6 py-2.5 bg-white text-zinc-900 rounded-xl text-[13px] font-bold hover:bg-zinc-100 transition-all shadow-lg min-w-[90px]"
                        whileTap={{ scale: 0.95 }}
                      >
                        Sign&nbsp;up
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Sub-component for individual links - Enhanced with animations
const NavLink = ({ 
  href, 
  icon, 
  label, 
  active = false,
  onClick
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className="relative group"
  >
    <div
      className={`flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-xl text-[13px] md:text-[12px] font-bold transition-all duration-300 w-full md:w-auto min-h-[44px] md:min-h-0 hover:bg-white dark:hover:bg-slate-800 ${
        active 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={active ? "text-primary" : "group-hover:text-primary transition-colors"}>
        {icon}
      </span>
      {label}
    </div>
  </Link>
);

export default Navbar;
