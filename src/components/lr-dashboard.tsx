"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { RefreshCw, Copy, Check, Baby, Activity, AlertCircle, CheckCircle2, XCircle, Terminal, Send, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { InlineApiEndpoint } from "@/components/api-endpoint-display";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';
import { useRouter } from "next/navigation";
import { sendSyncData } from '@/app/opoh-sync/actions';

const MySwal = withReactContent(Swal);

interface LRData {
  id: number;
  hospital_code: string;
  hospital_name: string;
  waiting_labor: number;
  normal_delivery: number;
  cesarean_delivery: number;
  abortion: number;
  not_delivery: number;
  total_case: number;
  last_sync_at: string;
}

export function LRDashboard() {
  const [data, setData] = useState<LRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showOwnHospitalOnly, setShowOwnHospitalOnly] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const ownHospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '00000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lr");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (json.data.length > 0) {
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
      setApiUrl(`${window.location.origin}/api/opoh/lr`);
    }
  }, []);

  const handleCopyApi = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async (isSilent = false) => {
    try {
      if (!isSilent) setSyncing(true);
      const res = await fetch("/api/sync/lr", { method: "POST" });
      const json = await res.json();
      
      if (json.success) {
        if (!isSilent) {
          MySwal.fire({
            title: 'ซิงค์ข้อมูลสำเร็จ!',
            text: 'อัปเดตข้อมูลสูติกรรมล่าสุดเรียบร้อย',
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
      await fetch("/api/sync/lr", { method: "POST" });
      
      // 2. Fetch fresh data
      const resData = await fetch("/api/lr");
      const jsonData = await resData.json();
      
      if (!jsonData.success || !jsonData.data || jsonData.data.length === 0) {
        MySwal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูลสำหรับส่ง', 'error');
        setSending(false);
        return;
      }
      
      const freshData = jsonData.data;
      
      // Update local state to reflect the latest sync
      setData(freshData);
      if (freshData.length > 0) {
        setLastUpdated(new Date(freshData[0].last_sync_at || new Date()));
      }

      const ownData = freshData.find((d: any) => d.hospital_code === ownHospitalCode) || freshData[0];

      const payload = {
        hospitalCode: ownHospitalCode,
        hospitalName: process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาลกมลาไสย',
        waitingLabor: ownData.waiting_labor || 0,
        normalDelivery: ownData.normal_delivery || 0,
        cesareanDelivery: ownData.cesarean_delivery || 0,
        abortion: ownData.abortion || 0,
        notDelivery: ownData.not_delivery || 0,
        totalCase: ownData.total_case || 0
      };

      const response = await sendSyncData('/sync/lr', payload, apiKey);
      if (response.success) {
        MySwal.fire({
          title: 'ส่งข้อมูลสำเร็จ!',
          text: 'ข้อมูลถูกส่งไปยังฐานข้อมูลกลางเรียบร้อยแล้ว',
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

  const showPayloadModal = () => {
    if (data.length === 0) {
      MySwal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูล', 'error');
      return;
    }
    const ownData = data.find(d => d.hospital_code === ownHospitalCode) || data[0];
    const payload = {
      hospitalCode: ownHospitalCode,
      hospitalName: process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาลกมลาไสย',
      waitingLabor: ownData.waiting_labor || 0,
      normalDelivery: ownData.normal_delivery || 0,
      cesareanDelivery: ownData.cesarean_delivery || 0,
      abortion: ownData.abortion || 0,
      notDelivery: ownData.not_delivery || 0,
      totalCase: ownData.total_case || 0
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    
    MySwal.fire({
      title: '<div class="flex items-center gap-2 justify-center"><span class="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide">JSON</span> <span class="text-sm font-bold text-slate-700">Data Payload</span></div>',
      html: `
        <div class="flex items-stretch gap-2 mb-3 h-9">
          <div class="flex items-center justify-center px-3 bg-teal-600 text-white text-[11px] font-bold rounded-md shadow-sm tracking-wider">
            POST
          </div>
          <div class="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <code class="font-mono text-xs text-slate-600 px-3 flex-1 truncate text-left select-all">https://appksn.moph.go.th/opoh/api/v1/sync/lr</code>
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
            navigator.clipboard.writeText('https://appksn.moph.go.th/opoh/api/v1/sync/lr');
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
            setTimeout(() => {
              copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
            }, 2000);
          });
        }
      }
    });
  };

  const showQueryModal = async () => {
    MySwal.fire({
      title: 'กำลังโหลด...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    let sqlQuery = 'ไม่สามารถดึงคำสั่ง SQL ได้';
    try {
      const res = await fetch('/api/sql-script?type=sync_lr');
      const data = await res.json();
      if (data.sql) sqlQuery = data.sql;
    } catch (error) {
      console.error(error);
    }
    
    MySwal.close();

    MySwal.fire({
      title: '<div class="flex items-center gap-2 justify-center"><span class="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold tracking-wide">HIS</span> <span class="text-sm font-bold text-slate-700">Database Query (lr.sql)</span></div>',
      html: `
        <div class="relative mt-2 text-left bg-slate-900 rounded-md overflow-hidden border border-slate-700 shadow-xl">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">SQL</span>
            <button id="copy-sql-btn" class="flex items-center justify-center w-8 h-8 rounded-md bg-slate-700 hover:bg-slate-600 text-teal-400 hover:text-teal-300 transition-colors focus:outline-none" title="คัดลอก Query">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
          </div>
          <div class="p-4 overflow-x-auto">
            <pre class="text-xs text-teal-300 font-mono leading-relaxed m-0">${sqlQuery.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
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
  };

  const summary = useMemo(() => {
    const targetData = showOwnHospitalOnly 
      ? data.filter(d => d.hospital_code === ownHospitalCode)
      : data;

    return targetData.reduce((acc, curr) => ({
      waiting_labor: acc.waiting_labor + curr.waiting_labor,
      normal_delivery: acc.normal_delivery + curr.normal_delivery,
      cesarean_delivery: acc.cesarean_delivery + curr.cesarean_delivery,
      abortion: acc.abortion + curr.abortion,
      not_delivery: acc.not_delivery + curr.not_delivery,
      total_case: acc.total_case + curr.total_case,
    }), {
      waiting_labor: 0,
      normal_delivery: 0,
      cesarean_delivery: 0,
      abortion: 0,
      not_delivery: 0,
      total_case: 0
    });
  }, [data, showOwnHospitalOnly, ownHospitalCode]);

  const columns = useMemo(() => [
    {
      accessorKey: 'hospital_code',
      header: 'รหัส รพ.',
      cell: (info: any) => <div className="text-center font-mono text-slate-500">{info.getValue() === 'ไม่ระบุ' ? '-' : info.getValue()}</div>,
    },
    {
      accessorKey: 'hospital_name',
      header: 'โรงพยาบาล',
      cell: (info: any) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
    },
    {
      accessorKey: 'waiting_labor',
      header: 'รอคลอด',
      cell: (info: any) => <div className="text-center font-bold text-amber-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'normal_delivery',
      header: 'คลอดปกติ',
      cell: (info: any) => <div className="text-center font-bold text-emerald-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'cesarean_delivery',
      header: 'ผ่าคลอด',
      cell: (info: any) => <div className="text-center font-bold text-blue-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'abortion',
      header: 'แท้ง',
      cell: (info: any) => <div className="text-center font-bold text-red-500">{info.getValue()}</div>,
    },
    {
      accessorKey: 'not_delivery',
      header: 'ไม่คลอด',
      cell: (info: any) => <div className="text-center font-semibold text-slate-500">{info.getValue()}</div>,
    },
    {
      accessorKey: 'total_case',
      header: 'รวมทั้งหมด (เคส)',
      cell: (info: any) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
            {info.getValue()}
          </span>
        </div>
      ),
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 }
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <Baby className="w-6 h-6 mr-2 text-teal-600" />
            ระบบจัดการห้องคลอด - One LR (Labor Room)
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-slate-500 text-sm font-medium">
              ภาพรวมและข้อมูลอัปเดตแบบเรียลไทม์
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

      {/* Hospital Filter Switch */}
      <div className="flex items-center justify-end gap-3 px-1">
        <label 
          htmlFor="hospital-toggle" 
          className="text-sm font-medium text-slate-700 cursor-pointer select-none"
        >
          แสดงเฉพาะหน่วยบริการหลัก ({ownHospitalCode})
        </label>
        <button
          id="hospital-toggle"
          type="button"
          role="switch"
          aria-checked={showOwnHospitalOnly}
          onClick={() => setShowOwnHospitalOnly(!showOwnHospitalOnly)}
          className={`${
            showOwnHospitalOnly ? 'bg-teal-600' : 'bg-slate-200'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2`}
        >
          <span
            aria-hidden="true"
            className={`${
              showOwnHospitalOnly ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-amber-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">รอคลอด (เคส)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{loading ? "-" : summary.waiting_labor.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">คลอดปกติ (เคส)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{loading ? "-" : summary.normal_delivery.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ผ่าคลอด (เคส)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{loading ? "-" : summary.cesarean_delivery.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-red-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">แท้ง (เคส)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{loading ? "-" : summary.abortion.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-slate-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ไม่คลอด (เคส)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
              <XCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-500">{loading ? "-" : summary.not_delivery.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-md shadow-sm border border-slate-100 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              สรุปสถานะผู้ป่วยแผนกสูติกรรม
            </CardTitle>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="ค้นหาโรงพยาบาล..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-3 pr-4 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 font-semibold whitespace-nowrap">
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
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-pink-200" />
                        <p>กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                      <Baby className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                      <p>ไม่พบข้อมูลผู้ป่วยแผนกสูติกรรม</p>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && table.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
              <div className="text-sm text-slate-500">
                หน้า {table.getState().pagination.pageIndex + 1} จาก {table.getPageCount()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-md"
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="rounded-md"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
