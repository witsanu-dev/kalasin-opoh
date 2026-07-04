"use client";

import { useState, useEffect } from "react";
import { Copy, AlertTriangle, Check } from "lucide-react";
import Link from "next/link";

export function InlineApiEndpoint({ url }: { url: string }) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const code = json.data.NEXT_PUBLIC_HOSPITAL_CODE?.trim();
          const name = json.data.NEXT_PUBLIC_HOSPITAL_FULL_NAME?.trim();
          setIsConfigured(!!(code && code.length === 5 && name));
        }
      })
      .catch(() => setIsConfigured(false));
  }, []);

  const handleCopyApi = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConfigured === null) {
    return <div className="h-[26px] w-[200px] bg-slate-50 animate-pulse rounded-md" />;
  }

  if (!isConfigured) {
    return (
      <Link href="/settings" className="flex items-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-md px-2 py-1 space-x-1.5 text-xs transition-colors">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>กรุณาตั้งค่ารหัสและชื่อโรงพยาบาล</span>
      </Link>
    );
  }

  if (!url) return null;

  return (
    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1 space-x-2 text-xs w-max">
      <span className="font-mono text-slate-500 truncate max-w-[200px] sm:max-w-xs">{url}</span>
      <button 
        onClick={handleCopyApi}
        className="text-slate-400 hover:text-teal-600 transition-colors focus:outline-none"
        title="คัดลอก Endpoint API"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
