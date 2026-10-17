'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, Loader2, AlertCircle, Zap } from 'lucide-react';

export function OpohSyncNavbarBadge() {
  const [config, setConfig] = useState<any>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/sync/opoh/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      // Quiet fail if network/unauthorized
    }
  };

  // 1. Initial fetch & event listener for instant updates from /opoh-sync page
  useEffect(() => {
    fetchConfig();

    const handleConfigChange = () => {
      fetchConfig();
    };

    window.addEventListener('opoh-sync-config-changed', handleConfigChange);
    return () => window.removeEventListener('opoh-sync-config-changed', handleConfigChange);
  }, []);

  // 2. Periodic background refresh every 15 seconds to keep all tabs in sync
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchConfig();
    }, 15000);
    return () => clearInterval(pollTimer);
  }, []);

  // 3. Real-time 1-second countdown ticker
  useEffect(() => {
    if (!config?.is_auto_sync || !config?.next_sync_time) {
      setCountdownSeconds(null);
      setIsSyncingNow(false);
      return;
    }

    const updateCountdown = () => {
      const nextTime = new Date(config.next_sync_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((nextTime - now) / 1000));
      setCountdownSeconds(diffSec);

      if (diffSec === 0) {
        setIsSyncingNow(true);
        // After 2.5s, refresh config to get the new next_sync_time
        setTimeout(() => {
          fetchConfig();
          setIsSyncingNow(false);
        }, 2500);
      } else {
        setIsSyncingNow(false);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [config?.next_sync_time, config?.is_auto_sync]);

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // State 1: Circuit Breaker Rate Limit Cooldown Active
  if (config?.rate_limited_until && new Date(config.rate_limited_until).getTime() > Date.now()) {
    const remMin = Math.ceil((new Date(config.rate_limited_until).getTime() - Date.now()) / 60000);
    return (
      <Link
        href="/opoh-sync"
        title="เซิร์ฟเวอร์กลางติด Rate Limit (HTTP 429) ระบบกำลัง Cooldown ป้องกัน IP โรงพยาบาล - คลิกเพื่อดูรายละเอียด"
        className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-800 transition-all shadow-sm text-xs whitespace-nowrap shrink-0"
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
        <span className="font-medium text-[10px] sm:text-[11px]">Cooldown</span>
        <span className="font-mono font-bold text-amber-900 text-[11px] sm:text-xs">{remMin}m</span>
      </Link>
    );
  }

  // State 2: Auto-Sync Paused / Disabled
  if (!config?.is_auto_sync) {
    return (
      <Link
        href="/opoh-sync"
        title="ระบบส่งข้อมูล OPOH อัตโนมัติปิดอยู่ - คลิกเพื่อเปิดการส่งข้อมูล"
        className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all shadow-sm text-xs whitespace-nowrap shrink-0"
      >
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 group-hover:bg-slate-500 transition-colors shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">Sync</span>
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">Paused</span>
      </Link>
    );
  }

  // State 3: Sync In Progress (Countdown reaches 0 or isSyncingNow)
  if (isSyncingNow || countdownSeconds === 0) {
    return (
      <Link
        href="/opoh-sync"
        title="กำลังส่งข้อมูล OPOH API เข้าสู่ศูนย์กลาง... - คลิกเพื่อดูรายละเอียด"
        className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 transition-all shadow-sm text-xs animate-pulse whitespace-nowrap shrink-0"
      >
        <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
        <span className="font-semibold text-emerald-900 text-[11px] sm:text-xs">Syncing...</span>
      </Link>
    );
  }

  // State 4: Active Counting Down: "Syncing in [time]"
  return (
    <Link
      href="/opoh-sync"
      title={`ส่งข้อมูลอัตโนมัติรอบถัดไปในอีก ${formatCountdown(countdownSeconds)} นาที - คลิกเพื่อจัดการระบบ OPOH`}
      className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border border-teal-200/80 bg-gradient-to-r from-teal-50/90 to-emerald-50/70 hover:from-teal-100 hover:to-emerald-100 text-teal-800 transition-all shadow-sm text-xs hover:border-teal-300 hover:shadow whitespace-nowrap shrink-0"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 group-hover:text-teal-900 transition-colors">
        Syncing in
      </span>
      <span className="font-mono font-bold text-teal-900 text-[11px] sm:text-xs tracking-tight">
        {formatCountdown(countdownSeconds)}
      </span>
      <RotateCw className="w-3 h-3 text-teal-600/70 group-hover:text-teal-700 group-hover:rotate-180 transition-transform duration-500 hidden sm:inline shrink-0" />
    </Link>
  );
}
