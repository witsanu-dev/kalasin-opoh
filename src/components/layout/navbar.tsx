"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bell, Search, User, Settings, Menu, Hospital, LogOut,
  LayoutDashboard, BedDouble, Activity, Stethoscope, Baby, Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const searchItems = [
  { title: "หน้าหลัก (Dashboard)", href: "/dashboard", icon: LayoutDashboard, category: "เมนูหลัก" },
  { title: "ข้อมูลเตียงผู้ป่วย", href: "/", icon: BedDouble, category: "เมนูหลัก" },
  { title: "One OR (ห้องผ่าตัด)", href: "/or", icon: Stethoscope, category: "เมนูหลัก" },
  { title: "One ICU (หอผู้ป่วยวิกฤต)", href: "/icu", icon: Activity, category: "เมนูหลัก" },
  { title: "One LR (ห้องคลอด)", href: "/lr", icon: Baby, category: "เมนูหลัก" },
  { title: "คิวผ่าตัด", href: "/surgery", icon: Clock, category: "เมนูหลัก" },
  { title: "ตั้งค่าระบบ", href: "/settings", icon: Settings, category: "ระบบ" },
];

export function Navbar({ onMenuClick, user }: { onMenuClick?: () => void, user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
      <div className="flex items-center flex-1">
        <div className="flex items-center md:hidden mr-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-slate-500 hover:text-teal-600">
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center ml-2">
            <Hospital className="h-5 w-5 text-teal-600 mr-2" />
            <span className="font-bold text-lg text-slate-800 tracking-tight">OPOH</span>
          </div>
        </div>
        
        {/* Search Box */}
        <div ref={searchRef} className="hidden md:block relative w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเมนู, ระบบ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim() !== "" && (
            <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              {filteredItems.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <li key={index}>
                        <button
                          onClick={() => handleSelect(item.href)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center transition-colors"
                        >
                          <Icon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-teal-600" />
                          <div className="flex flex-col">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-[10px] text-slate-400">{item.category}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p>ไม่พบผลลัพธ์สำหรับ "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <Link href="/settings">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`transition-colors ${pathname === '/settings' ? 'text-teal-600 bg-teal-50' : 'text-slate-500 hover:text-teal-600 hover:bg-slate-50'}`} 
            title="ตั้งค่าระบบ"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-teal-600">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 ml-2 relative" ref={profileRef}>
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm border border-teal-100 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium hidden md:flex items-center text-slate-700 ml-2.5">
              <User className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
              {user ? user.first_name : 'Guest'}
            </span>
          </div>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-800 truncate flex items-center">
                  <User className="w-3.5 h-3.5 mr-2 text-teal-600" />
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] text-teal-600 font-medium truncate ml-5 mt-0.5">{user?.username}</p>
              </div>
              <ul className="py-1">
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
