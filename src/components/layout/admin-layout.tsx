"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

interface AdminLayoutProps {
  children: ReactNode;
  user?: any;
}

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // If on login page, render without Sidebar and Navbar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto min-h-full pb-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
