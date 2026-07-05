"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { RefreshCw, Activity, BedDouble, CheckCircle2, AlertCircle, TrendingUp, Hospital, Copy, Check, Terminal, Send, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { InlineApiEndpoint } from "@/components/api-endpoint-display";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useRouter } from "next/navigation";
import { sendSyncData } from '@/app/opoh-sync/actions';

const MySwal = withReactContent(Swal);

interface ICUData {
  id: number;
  ward_code: string;
  ward_name: string;
  total_bed: number;
  actual_bed: number | null;
  occupied_bed: number;
  available_bed: number;
  occupancy_rate: number;
  export_code: string | null;
  last_sync_at: string;
}

export function ICUDashboard() {
  const [data, setData] = useState<ICUData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/icu");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (json.data.length > 0) {
          // Find the most recent sync time
          const maxDate = new Date(Math.max(...json.data.map((d: any) => new Date(d.last_sync_at).getTime())));
          setLastUpdated(maxDate);
        }
        return json.data;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    const initData = async () => {
      const localData = await fetchData();
      if (localData && localData.length > 0) {
        const maxDate = new Date(Math.max(...localData.map((d: any) => new Date(d.last_sync_at).getTime())));
        const lastSyncTime = maxDate.getTime();
        const now = Date.now();
        if (now - lastSyncTime > 60000) {
          handleSync(true);
        }
      } else {
        handleSync(true);
      }
    };
    initData();
    if (typeof window !== 'undefined') {
      setApiUrl(`${window.location.origin}/api/opoh/icu`);
    }
  }, []);

  const handleCopyApi = () => {
    if (apiUrl) {
      navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSync = async (isSilent = false) => {
    try {
      if (!isSilent) setSyncing(true);
      const res = await fetch("/api/sync/beds", { method: "POST" });
      const json = await res.json();
      
      if (json.success) {
        if (!isSilent) {
          MySwal.fire({
            title: 'ซิงค์ข้อมูลสำเร็จ!',
            text: 'อัปเดตข้อมูลเตียงล่าสุดเรียบร้อย',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
        fetchData();
      } else {
        if (!isSilent) MySwal.fire('ข้อผิดพลาด', json.message || 'ไม่สามารถซิงค์ข้อมูลได้', 'error');
      }
    } catch (error) {
      if (!isSilent) MySwal.fire('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    } finally {
      if (!isSilent) setSyncing(false);
    }
  };

  const handleSendToOPOH = async () => {
    const apiKey = localStorage.getItem('OPOH_API_KEY');
    if (!apiKey) {
      MySwal.fire({
        title: 'ไม่พบ API Key',
        text: 'กรุณาตั้งค่า API Key ที่หน้าระบบส่งข้อมูล OPOH ก่อนทำการส่งข้อมูล',
        icon: 'warning',
        confirmButtonText: 'ไปหน้าตั้งค่า',
        confirmButtonColor: '#0d9488'
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/opoh-sync');
        }
      });
      return;
    }

    setSending(true);
    try {
      MySwal.fire({
        title: 'กำลังเตรียมข้อมูล...',
        text: 'ระบบกำลังซิงค์ข้อมูลล่าสุดจาก HIS ก่อนส่งข้อมูล',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 1. Force Sync (Silent)
      await fetch("/api/sync/beds", { method: "POST" });
      
      // 2. Fetch fresh data
      // ICU is sent along with all beds, so we fetch the full beds data
      const resBeds = await fetch('/api/beds');
      const jsonBeds = await resBeds.json();
      
      if (!jsonBeds.success || !jsonBeds.data || jsonBeds.data.length === 0) {
        MySwal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูลเตียงสำหรับส่ง', 'error');
        setSending(false);
        return;
      }

      const allBeds = jsonBeds.data;
      const payload = {
        hospitalCode: process.env.NEXT_PUBLIC_HOSPITAL_CODE || '-',
        wards: allBeds.map((w: any) => ({
          wardCode: w.ward_code,
          wardName: w.ward_name,
          totalBed: w.total_bed,
          actualBed: w.actual_bed !== null ? w.actual_bed : w.total_bed,
          occupiedBed: w.occupied_bed,
          availableBed: w.available_bed,
          occupancyRate: parseFloat(w.occupancy_rate),
          exportCode: w.export_code || ""
        }))
      };

      const response = await sendSyncData('/sync/beds', payload, apiKey);
      if (response.success) {
        MySwal.fire({
          title: 'ส่งข้อมูลสำเร็จ!',
          text: 'ข้อมูล ICU ถูกส่งไปยังฐานข้อมูลกลาง (พร้อมกับข้อมูลเตียง) เรียบร้อยแล้ว',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        MySwal.fire('เกิดข้อผิดพลาด!', response.error || `Status: ${response.status}`, 'error');
      }
    } catch (error: any) {
      MySwal.fire('ระบบขัดข้อง!', error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const showPayloadModal = async () => {
    try {
      MySwal.fire({
        title: 'กำลังดึงข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      const resBeds = await fetch('/api/beds');
      const jsonBeds = await resBeds.json();
      
      if (!jsonBeds.success || !jsonBeds.data || jsonBeds.data.length === 0) {
        MySwal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูลเตียงสำหรับดู Payload', 'error');
        return;
      }

      const allBeds = jsonBeds.data;
      const payload = {
        hospitalCode: process.env.NEXT_PUBLIC_HOSPITAL_CODE || '-',
        wards: allBeds.map((w: any) => ({
          wardCode: w.ward_code,
          wardName: w.ward_name,
          totalBed: w.total_bed,
          actualBed: w.actual_bed !== null ? w.actual_bed : w.total_bed,
          occupiedBed: w.occupied_bed,
          availableBed: w.available_bed,
          occupancyRate: parseFloat(w.occupancy_rate),
          exportCode: w.export_code || ""
        }))
      };
      
      const jsonStr = JSON.stringify(payload, null, 2);
      
      MySwal.fire({
        title: '<div class="flex items-center gap-2 justify-center"><span class="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide">JSON</span> <span class="text-sm font-bold text-slate-700">Data Payload (ส่งพร้อมข้อมูลเตียง)</span></div>',
        html: `
          <div class="flex items-stretch gap-2 mb-3 h-9">
            <div class="flex items-center justify-center px-3 bg-teal-600 text-white text-[11px] font-bold rounded-md shadow-sm tracking-wider">
              POST
            </div>
            <div class="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden shadow-sm">
              <code class="font-mono text-xs text-slate-600 px-3 flex-1 truncate text-left select-all">https://appksn.moph.go.th/opoh/api/v1/sync/beds</code>
              <button id="copy-url-btn" class="flex items-center justify-center px-3 h-full border-l border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-teal-600 transition-colors" title="Copy URL">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
          </div>
          <div class="relative text-left bg-slate-900 rounded-md overflow-hidden border border-slate-700 shadow-xl">
            <div class="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
              <div class="flex space-x-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
              </div>
              <span class="text-xs font-medium text-slate-400">payload.json</span>
            </div>
            <div class="p-4 max-h-[400px] overflow-auto custom-scrollbar">
              <pre class="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">${jsonStr}</pre>
            </div>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'ปิดหน้าต่าง',
        confirmButtonColor: '#0f172a',
        width: '600px',
        customClass: {
          popup: 'rounded-[16px] pb-6',
          title: 'pt-6 pb-2',
          confirmButton: 'rounded-md px-8'
        },
        didOpen: () => {
          const copyBtn = document.getElementById('copy-url-btn');
          if (copyBtn) {
            copyBtn.addEventListener('click', () => {
              navigator.clipboard.writeText('https://appksn.moph.go.th/opoh/api/v1/sync/beds');
              copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
              setTimeout(() => {
                copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
              }, 2000);
            });
          }
        }
      });
    } catch (error) {
      MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้าง Payload ได้', 'error');
    }
  };

  const showQueryModal = async () => {
    try {
      MySwal.fire({
        title: 'กำลังโหลด...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const res = await fetch('/api/sql-script?type=sync_beds');
      const data = await res.json();
      
      let sqlQuery = "ไม่พบคำสั่ง SQL ที่ตั้งค่าไว้ในระบบ";
      if (res.ok && data.sql) {
        sqlQuery = data.sql;
      }

    MySwal.fire({
      title: '<div class="flex items-center gap-2 justify-center"><span class="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold tracking-wide">HIS</span> <span class="text-sm font-bold text-slate-700">Database Query</span></div>',
      html: `
        <div class="relative mt-2 text-left bg-slate-900 rounded-md overflow-hidden border border-slate-700 shadow-xl">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">SQL</span>
            <button id="copy-sql-btn" class="flex items-center justify-center w-8 h-8 rounded-md bg-slate-700 hover:bg-slate-600 text-teal-400 hover:text-teal-300 transition-colors focus:outline-none" title="คัดลอก Query">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
          </div>
          <div class="p-4 overflow-x-auto">
            <pre class="text-xs text-teal-300 font-mono leading-relaxed m-0">${sqlQuery}</pre>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '800px',
      customClass: {
        popup: 'rounded-xl border border-slate-200',
        title: 'pt-2 pb-0 m-0'
      },
      didOpen: () => {
        const copyBtn = document.getElementById('copy-sql-btn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(sqlQuery);
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
            setTimeout(() => {
              copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
            }, 2000);
          });
        }
      }
    });
  } catch (error) {
    MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลคำสั่ง SQL ได้', 'error');
  }
};

  const columns = useMemo(() => [
    {
      accessorKey: 'ward_name',
      header: 'วอร์ด (หอผู้ป่วยวิกฤต)',
      cell: (info: any) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
    },
    {
      accessorKey: 'active_bed',
      header: 'เตียง ICU รวม',
      cell: (info: any) => {
        const row = info.row.original;
        const total = row.actual_bed !== null ? row.actual_bed : row.total_bed;
        return <div className="text-center font-bold text-teal-700">{total}</div>;
      },
    },
    {
      accessorKey: 'occupied_bed',
      header: 'ใช้แล้ว',
      cell: (info: any) => <div className="text-center font-bold text-red-500">{info.getValue()}</div>,
    },
    {
      accessorKey: 'available_bed',
      header: 'คงเหลือ',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <div className={`text-center font-bold ${val > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
            {val}
          </div>
        );
      },
    },
    {
      accessorKey: 'occupancy_rate',
      header: 'อัตราครองเตียง',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <div className="flex items-center justify-center">
            <span className={`font-bold ${val >= 100 ? 'text-red-600' : val >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {val}%
            </span>
          </div>
        );
      },
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Calculate Summary
  const summary = useMemo(() => {
    let totalWards = data.length;
    let totalBeds = 0;
    let totalOccupied = 0;
    let totalAvailable = 0;

    data.forEach(d => {
      const activeBed = d.actual_bed !== null ? d.actual_bed : d.total_bed;
      totalBeds += activeBed;
      totalOccupied += d.occupied_bed;
      
      // Calculate real available based on active beds
      const available = activeBed - d.occupied_bed;
      totalAvailable += available > 0 ? available : 0;
    });

    const occupancyRate = totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(2) : "0.00";

    return { totalWards, totalBeds, totalOccupied, totalAvailable, occupancyRate };
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-teal-600" />
            ระบบจัดการหอผู้ป่วยวิกฤต - One ICU (Semi-ICU)
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-slate-500 text-sm font-medium">
              Intensive Care Unit / Semi-ICU Dashboard
            </p>
            {apiUrl && (
              <InlineApiEndpoint url={apiUrl} />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {lastUpdated && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
              อัปเดตล่าสุด: {format(lastUpdated, "dd/MM/yyyy HH:mm")}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={showQueryModal}
              title="ดูคำสั่ง SQL ที่ใช้ดึงข้อมูล"
              className="text-slate-500 hover:text-teal-600 border-slate-200 rounded-md"
            >
              <Terminal className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={showPayloadModal}
              title="ดูโครงสร้างข้อมูล (JSON Payload)"
              className="text-slate-500 hover:text-emerald-600 border-slate-200 rounded-md"
            >
              <FileJson className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => handleSync(false)}
              disabled={syncing || loading || sending}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all rounded-md px-6"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              ซิงค์ข้อมูล
            </Button>
            <Button
              onClick={handleSendToOPOH}
              disabled={sending || loading || syncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all rounded-md px-6"
            >
              <Send className={`w-4 h-4 mr-2 ${sending ? 'animate-pulse' : ''}`} />
              ส่งข้อมูล
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">วอร์ดที่มีเตียง ICU</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Hospital className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {loading ? "-" : summary.totalWards} <span className="text-sm font-normal text-slate-400">แห่ง</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-teal-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">เตียง ICU รวม</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
              <BedDouble className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700">{loading ? "-" : summary.totalBeds}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-red-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ใช้แล้ว (Occupied)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{loading ? "-" : summary.totalOccupied}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">คงเหลือ (Available)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{loading ? "-" : summary.totalAvailable}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-amber-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">อัตราครองเตียงภาพรวม</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{loading ? "-" : `${summary.occupancyRate}%`}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-md shadow-sm border border-slate-100 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              ข้อมูลทรัพยากรเตียง ICU
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-6 py-3 font-semibold whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="bg-white border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-500">
                      {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลเตียงผู้ป่วย ICU'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
