"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Search, User, Settings, Menu, Hospital, LogOut,
  LayoutDashboard, BedDouble, Activity, Stethoscope, Baby, Clock, ShieldCheck, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MfaModal from "@/components/MfaModal";
import { OpohSyncNavbarBadge } from "@/components/layout/opoh-sync-badge";

const searchItems = [
  { title: "หน้าหลัก (Dashboard)", href: "/", icon: LayoutDashboard, category: "เมนูหลัก" },
  { title: "ส่งข้อมูล OPOH API Hub", href: "/opoh-sync", icon: Hospital, category: "ระบบ" },
  { title: "ข้อมูลเตียงผู้ป่วย", href: "/beds", icon: BedDouble, category: "เมนูหลัก" },
  { title: "One OR (ห้องผ่าตัด)", href: "/or", icon: Stethoscope, category: "เมนูหลัก" },
  { title: "One ICU (หอผู้ป่วยวิกฤต)", href: "/icu", icon: Activity, category: "เมนูหลัก" },
  { title: "One LR (ห้องคลอด)", href: "/lr", icon: Baby, category: "เมนูหลัก" },
  { title: "คิวผ่าตัด", href: "/surgical_queue", icon: Clock, category: "เมนูหลัก" },
  { title: "ตั้งค่าระบบ", href: "/settings", icon: Settings, category: "ระบบ" },
];

export function Navbar({ onMenuClick, user }: { onMenuClick?: () => void; user?: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [isMfaActive, setIsMfaActive] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setIsMobileSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          searchInputRef.current?.focus();
          setIsSearchOpen(true);
        } else {
          setIsMobileSearchOpen((prev) => !prev);
        }
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
    }
  }, [isMobileSearchOpen]);

  // Close mobile search on route navigation
  useEffect(() => {
    setIsMobileSearchOpen(false);
    setIsSearchOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const res = await fetch("/api/auth/mfa/status");
      const data = await res.json();
      if (data.success) {
        setIsMfaActive(Boolean(data.isEnabled));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = searchQuery.trim() === ""
    ? []
    : searchItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 flex items-center justify-between px-3 sm:px-4 lg:px-8 z-30 sticky top-0 transition-all">
      {/* Left Section: Mobile Drawer Trigger & Hospital Branding */}
      <div className="flex items-center min-w-0 mr-2 flex-1">
        <div className="flex items-center md:hidden mr-2 sm:mr-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-slate-600 hover:text-teal-600 hover:bg-slate-100 rounded-md h-9 w-9"
            aria-label="เปิดเมนูการนำทาง"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center ml-1 sm:ml-2">
            <Hospital className="h-5 w-5 text-teal-600 mr-1.5 shrink-0" />
            <span className="font-bold text-base sm:text-lg text-slate-800 tracking-tight shrink-0">OPOH</span>
          </div>
        </div>

        {/* Desktop / Tablet Inline Search Box */}
        <div ref={searchRef} className="hidden md:block relative w-full max-w-xs lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ค้นหาเมนู, ระบบ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-12 text-xs sm:text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-slate-800 placeholder:text-slate-400"
            />
            <kbd className="hidden lg:inline-flex items-center absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
              Ctrl+K
            </kbd>
          </div>

          {/* Desktop Search Dropdown */}
          {isSearchOpen && searchQuery.trim() !== "" && (
            <div className="absolute top-full mt-1.5 w-full bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {filteredItems.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <li key={index}>
                        <button
                          onClick={() => handleSelect(item.href)}
                          className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center transition-colors group"
                        >
                          <Icon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-teal-600 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{item.title}</span>
                            <span className="text-[10px] text-slate-400">{item.category}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-5 text-center text-xs text-slate-500">
                  <Search className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                  <p>ไม่พบผลลัพธ์สำหรับ "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Actions, Countdown Ticker & Profile */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">

        {/* Mobile Search Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="md:hidden text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-md h-8 w-8 sm:h-9 sm:w-9"
          title="ค้นหาเมนู"
          aria-label="ค้นหาเมนู"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Real-Time OPOH Auto-Sync Countdown Ticker */}
        <OpohSyncNavbarBadge />

        {/* MFA / Google Authenticator Quick Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMfaModalOpen(true)}
          className={`relative transition-colors rounded-md h-8 w-8 sm:h-9 sm:w-9 ${isMfaActive
            ? 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'
            : 'text-slate-500 hover:text-teal-600 hover:bg-slate-50'
            }`}
          title="ระบบความปลอดภัย 2 ขั้นตอน (Google Authenticator)"
          aria-label="ความปลอดภัย 2 ขั้นตอน"
        >
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          {isMfaActive && (
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </Button>

        {/* System Settings Quick Button */}
        <Link href="/settings">
          <Button
            variant="ghost"
            size="icon"
            className={`transition-colors rounded-md h-8 w-8 sm:h-9 sm:w-9 ${pathname === '/settings'
              ? 'text-teal-600 bg-teal-50'
              : 'text-slate-500 hover:text-teal-600 hover:bg-slate-50'
              }`}
            title="ตั้งค่าระบบ"
            aria-label="ตั้งค่าระบบ"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Link>

        {/* Notification Bell (Visible on Tablet & Desktop) */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-md h-8 w-8 sm:h-9 sm:w-9 hidden sm:inline-flex"
          title="การแจ้งเตือน"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* User Profile Avatar & Dropdown */}
        <div className="flex items-center border-l border-slate-200 pl-2 sm:pl-3 ml-0.5 sm:ml-1 relative" ref={profileRef}>
          <button
            type="button"
            className="flex items-center cursor-pointer group rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="โปรไฟล์ผู้ใช้งาน"
            aria-expanded={isProfileOpen}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm border border-teal-100 transition-transform group-hover:scale-105 shrink-0">
              <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:flex flex-col items-start ml-2 text-left leading-tight">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 group-hover:text-teal-700 transition-colors">
                <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate max-w-[140px] lg:max-w-[180px]">
                  {user ? (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username) : 'ผู้ใช้งาน'}
                </span>
              </span>
              {user?.position && (
                <span className="text-[10px] text-teal-600 font-medium truncate max-w-[140px] lg:max-w-[180px] mt-0.5">
                  {user.position}
                </span>
              )}
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate flex items-center">
                  <User className="w-3.5 h-3.5 mr-2 text-teal-600 shrink-0" />
                  <span className="truncate">{user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'ผู้ใช้งาน'}</span>
                </p>
                {user?.position && (
                  <p className="text-[11px] text-slate-500 font-medium truncate ml-5.5 mt-1">
                    ตำแหน่ง: <span className="text-slate-700 font-semibold">{user.position}</span>
                  </p>
                )}
                <p className="text-[10px] text-teal-600 font-mono font-medium truncate ml-5.5 mt-0.5">
                  @{user?.username || 'user'}
                </p>
              </div>

              {/* Dropdown Items */}
              <div className="py-1">
                {/* MFA Item */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsMfaModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>ความปลอดภัย 2 ชั้น (MFA)</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isMfaActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {isMfaActive ? 'เปิดใช้งาน' : 'ยังไม่เปิด'}
                  </span>
                </button>

                {/* OPOH Hub Link */}
                <Link
                  href="/opoh-sync"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition-colors"
                >
                  <Hospital className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>ส่งข้อมูล OPOH</span>
                </Link>

                {/* Settings Link in Profile */}
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>ตั้งค่าระบบ</span>
                </Link>


              </div>

              {/* Logout Button */}
              <div className="border-t border-slate-100 py-1 bg-slate-50/30">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2 shrink-0" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Expandable Search Bar */}
      {isMobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 px-3 py-2.5 shadow-lg z-40 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="ค้นหาเมนู, ระบบ OPOH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md font-medium shrink-0"
            >
              ปิด
            </button>
          </div>

          {/* Mobile Search Results */}
          {searchQuery.trim() !== "" && (
            <div className="mt-2 bg-slate-50 rounded-md border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
              {filteredItems.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <li key={index}>
                        <button
                          onClick={() => handleSelect(item.href)}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.category}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-4 text-center text-xs text-slate-400">
                  ไม่พบผลลัพธ์สำหรับ "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MFA Security Modal */}
      <MfaModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        user={user}
        onStatusChange={(active) => setIsMfaActive(active)}
      />
    </header>
  );
}
