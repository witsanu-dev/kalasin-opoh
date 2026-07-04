"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BedDouble, Activity, Stethoscope, Baby, Clock, Hospital, Settings, Server, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboards" },
    { href: "/beds", icon: BedDouble, label: "ข้อมูลเตียง" },
    { href: "/or", icon: Stethoscope, label: "One OR" },
    { href: "/lr", icon: Baby, label: "One LR" },
    { href: "/icu", icon: Activity, label: "One ICU" },
    { href: "/surgical_queue", icon: Clock, label: "คิวผ่าตัด" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="h-20 flex flex-col justify-center px-6 border-b border-slate-200">
        <div className="flex items-center">
          <Hospital className="h-6 w-6 text-teal-600 mr-2" />
          <span className="font-bold text-xl text-slate-800 tracking-tight">
            OPOH <span className="text-teal-600 uppercase">{process.env.NEXT_PUBLIC_HOSPITAL_NAME || "KALASIN"}</span>
          </span>
        </div>
        <div className="mt-1.5">
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] px-2 py-0 font-medium rounded-md tracking-wider">
            One Province One Hospital
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          เมนูหลัก
        </div>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.label}
              href={item.href} 
              onClick={onClose}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
          <Link 
            href="/opoh-sync" 
            onClick={onClose}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
              pathname === "/opoh-sync"
                ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
            }`}
          >
            <Server className={`w-5 h-5 mr-3 ${pathname === "/opoh-sync" ? "text-teal-600" : "text-slate-400"}`} />
            ส่งข้อมูล OPOH API
          </Link>

          <Link 
            href="/settings" 
            onClick={onClose}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
              pathname === "/settings"
                ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
            }`}
          >
            <Settings className={`w-5 h-5 mr-3 ${pathname === "/settings" ? "text-teal-600" : "text-slate-400"}`} />
            ตั้งค่าระบบ
          </Link>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          ออกจากระบบ
        </button>
      </div>

      <div className="p-4 border-t border-slate-200 text-xs text-center text-slate-500 bg-slate-50/50">
        <p className="font-medium text-slate-600">สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </aside>
    </>
  );
}
