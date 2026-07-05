"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { RefreshCw, Bed, Users, BedDouble, Activity, Search, Edit2, RotateCcw, Copy, Check, Terminal, Send, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { InlineApiEndpoint } from "@/components/api-endpoint-display";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useRouter } from "next/navigation";
import { sendSyncData } from '@/app/opoh-sync/actions';

const MySwal = withReactContent(Swal);

interface BedData {
  ward_code: string;
  ward_name: string;
  total_bed: number;
  occupied_bed: number;
  available_bed: number;
  occupancy_rate: string;
  actual_bed: number | null;
  active_total_bed: number;
  export_code: string | null;
  last_sync_at: string;
}

export function BedDashboard() {
  const [data, setData] = useState<BedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  
  const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '-';

  useEffect(() => {
    setApiUrl(`${window.location.origin}/api/opoh/beds`);
  }, []);

  const handleCopyApi = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/beds");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.length > 0) {
          setLastUpdated(new Date(json.data[0].last_sync_at));
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
        const lastSyncTime = new Date(localData[0].last_sync_at).getTime();
        const now = Date.now();
        if (now - lastSyncTime > 60000) {
          handleSync(true);
        }
      } else {
        handleSync(true);
      }
    };
    initData();
  }, []);

  const handleSync = async (isSilent = false) => {
    const doSync = async () => {
      try {
        if (!isSilent) setSyncing(true);
        const res = await fetch("/api/sync/beds", { method: "POST" });
        const json = await res.json();

        if (json.success) {
          await fetchData();
          if (!isSilent) {
            MySwal.fire({
              title: 'สำเร็จ!',
              text: `ซิงค์ข้อมูลเรียบร้อยแล้ว (${json.total_synced} รายการ)`,
              icon: 'success',
              confirmButtonColor: '#0d9488'
            });
          }
        } else {
          if (!isSilent) MySwal.fire('ข้อผิดพลาด!', json.message || 'ไม่สามารถซิงค์ข้อมูลได้', 'error');
        }
      } catch (error) {
        if (!isSilent) MySwal.fire('ข้อผิดพลาด!', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      } finally {
        if (!isSilent) setSyncing(false);
      }
    };

    if (isSilent) {
      doSync();
    } else {
      MySwal.fire({
        title: 'ต้องการซิงค์ข้อมูล?',
        text: "ระบบจะทำการดึงข้อมูลล่าสุดจาก HOSxP",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'ใช่, ซิงค์เลย!',
        cancelButtonText: 'ยกเลิก'
      }).then((result) => {
        if (result.isConfirmed) {
          doSync();
        }
      });
    }
  };

  const handleEditBed = (ward_code: string, ward_name: string, current_actual: number | null, his_total: number) => {
    MySwal.fire({
      title: 'กำหนดเตียงใช้งานจริง',
      html: `
        <div class="text-sm text-slate-500 mb-4">สถานพยาบาล/วอร์ด: <strong>${ward_name}</strong></div>
        <div class="text-sm text-slate-500 mb-2">จำนวนเตียงจาก HIS: ${his_total} เตียง</div>
        <p class="text-xs text-amber-600 mb-2">* ปล่อยว่างเพื่อใช้จำนวนเตียงจาก HIS</p>
      `,
      input: 'number',
      inputValue: current_actual !== null ? current_actual : '',
      inputAttributes: {
        min: '0',
        step: '1'
      },
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'บันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const val = result.value === '' ? null : parseInt(result.value, 10);
          const res = await fetch("/api/beds", {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ward_code, actual_bed: val })
          });
          const json = await res.json();
          if (json.success) {
            MySwal.fire({
              title: 'สำเร็จ!',
              text: 'บันทึกข้อมูลจำนวนเตียงใช้งานจริงเรียบร้อย',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            fetchData();
          } else {
            MySwal.fire('ข้อผิดพลาด', json.message, 'error');
          }
        } catch (error) {
          MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
      }
    });
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
      const resBeds = await fetch("/api/beds");
      const jsonBeds = await resBeds.json();
      
      if (!jsonBeds.success || !jsonBeds.data || jsonBeds.data.length === 0) {
        MySwal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูลสำหรับส่ง', 'error');
        setSending(false);
        return;
      }
      
      const freshData = jsonBeds.data;
      
      // Update local state to reflect the latest sync
      setData(freshData);
      if (freshData.length > 0) {
        setLastUpdated(new Date(freshData[0].last_sync_at || new Date()));
      }

      const payload = {
        hospitalCode,
        wards: freshData.map((w: any) => ({
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
    const payload = {
      hospitalCode,
      wards: data.map(w => ({
        wardCode: w.ward_code,
        wardName: w.ward_name,
        totalBed: w.total_bed,
        actualBed: w.actual_bed !== null ? w.actual_bed : w.total_bed,
        occupiedBed: w.occupied_bed,
        availableBed: w.available_bed,
        occupancyRate: parseFloat(w.occupancy_rate as any),
        exportCode: w.export_code || ""
      }))
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
  };

  const showQueryModal = async () => {
    MySwal.fire({
      title: 'กำลังโหลด...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    let sqlQuery = 'ไม่สามารถดึงคำสั่ง SQL ได้';
    try {
      const res = await fetch('/api/sql-script?type=sync_beds');
      const data = await res.json();
      if (data.sql) sqlQuery = data.sql;
    } catch (error) {
      console.error(error);
    }
    
    MySwal.close();

    MySwal.fire({
      title: '<div class="flex items-center gap-2 justify-center"><span class="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold tracking-wide">HIS</span> <span class="text-sm font-bold text-slate-700">Database Query (beds.sql)</span></div>',
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
      width: '700px',
      showCloseButton: true,
      showConfirmButton: false,
      padding: '1.5em',
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

  const handleResetBed = (ward_code: string, ward_name: string) => {
    MySwal.fire({
      title: 'คืนค่าเริ่มต้น?',
      text: `ต้องการยกเลิกการกำหนดเตียงเอง และกลับไปใช้ข้อมูลจาก HIS สำหรับ ${ward_name} หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, คืนค่าเลย',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch("/api/beds", {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ward_code, actual_bed: null })
          });
          const json = await res.json();
          if (json.success) {
            MySwal.fire({
              title: 'สำเร็จ!',
              text: 'กลับไปใช้ข้อมูลจาก HIS เรียบร้อยแล้ว',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            fetchData();
          } else {
            MySwal.fire('ข้อผิดพลาด', json.message, 'error');
          }
        } catch (error) {
          MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
      }
    });
  };

  const totalBeds = data.reduce((sum, item) => sum + item.active_total_bed, 0);
  const totalOccupied = data.reduce((sum, item) => sum + item.occupied_bed, 0);
  const totalAvailable = data.reduce((sum, item) => sum + item.available_bed, 0);
  const overallOccupancyRate = totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(2) : "0.00";

  // Data for Chart (Top 10 Wards by Occupied Beds)
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.occupied_bed - a.occupied_bed)
      .slice(0, 10)
      .map(item => ({
        name: item.ward_name.length > 15 ? item.ward_name.substring(0, 15) + '...' : item.ward_name,
        'เตียงใช้งาน': item.occupied_bed,
        'เตียงว่าง': item.available_bed,
        rate: parseFloat(item.occupancy_rate)
      }));
  }, [data]);

  // TanStack Table Setup
  const columns = useMemo(
    () => [
      {
        accessorKey: 'hospital_code',
        header: 'รหัสสถานพยาบาล',
        cell: () => <span className="font-medium text-slate-500">{hospitalCode}</span>,
      },
      {
        accessorKey: 'export_code',
        header: 'รหัสส่งออก (HIS)',
        cell: (info: any) => <span className="font-medium text-blue-600">{info.getValue() || '-'}</span>,
      },
      {
        accessorKey: 'ward_name',
        header: 'สถานพยาบาล (วอร์ด)',
        cell: (info: any) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      },
      {
        accessorKey: 'active_total_bed',
        header: 'เตียงทั้งหมด',
        cell: (info: any) => {
          const row = info.row.original;
          const isCustom = row.actual_bed !== null;
          return (
            <div className="text-center flex items-center justify-center gap-1">
              <span>{info.getValue()}</span>
              {isCustom && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500" title="กำหนดจำนวนเตียงเอง (ไม่ใช้ค่าจาก HIS)"></span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'occupied_bed',
        header: 'ผู้ป่วย',
        cell: (info: any) => <div className="text-center font-bold text-teal-600">{info.getValue()}</div>,
      },
      {
        accessorKey: 'available_bed',
        header: 'เตียงว่าง',
        cell: (info: any) => <div className="text-center font-bold text-slate-500">{info.getValue()}</div>,
      },
      {
        accessorKey: 'occupancy_rate',
        header: 'อัตราครองเตียง',
        cell: (info: any) => {
          const rate = parseFloat(info.getValue());
          let badgeColor = "bg-teal-100 text-teal-800 border-teal-200";
          if (rate >= 100) badgeColor = "bg-red-100 text-red-800 border-red-200";
          else if (rate >= 80) badgeColor = "bg-orange-100 text-orange-800 border-orange-200";

          return (
            <div className="text-right">
              <Badge variant="outline" className={`${badgeColor} font-semibold px-2.5 py-0.5 rounded-md`}>
                {info.getValue()}%
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'กำหนดเตียง',
        cell: (info: any) => {
          const row = info.row.original;
          return (
            <div className="text-center flex justify-center gap-1">
              <button
                onClick={() => handleEditBed(row.ward_code, row.ward_name, row.actual_bed, row.total_bed)}
                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                title="ตั้งค่าเตียงใช้งานจริง"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {row.actual_bed !== null && (
                <button
                  onClick={() => handleResetBed(row.ward_code, row.ward_name)}
                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                  title="คืนค่ากลับไปใช้จาก HIS"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        }
      }
    ],
    []
  );

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
      pagination: { pageSize: 10 }
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <BedDouble className="w-6 h-6 mr-2 text-teal-600" />
            ข้อมูลเตียงผู้ป่วย (Bed Management)
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
              onClick={() => handleSync()}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-teal-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">เตียงทั้งหมด (เตียง)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
              <Bed className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{loading ? "-" : totalBeds}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-red-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ผู้ป่วย (ราย)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{loading ? "-" : totalOccupied}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">เตียงว่าง (เตียง)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <BedDouble className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{loading ? "-" : totalAvailable}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">อัตราครองเตียงภาพรวม</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{loading ? "-" : `${overallOccupancyRate}%`}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table Section */}
      <Card className="rounded-md shadow-sm border border-slate-100 flex flex-col mb-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-50">
          <CardTitle className="text-lg font-bold text-slate-800">สรุปข้อมูลเตียงผู้ป่วย</CardTitle>
          <div className="relative mt-2 sm:mt-0 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              placeholder="ค้นหาวอร์ด..."
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 font-semibold tracking-wider">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                      กำลังโหลดข้อมูลตาราง...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      ไม่พบข้อมูล
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

          {/* Pagination */}
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

      {/* Chart Section */}
      <Card className="rounded-md shadow-sm border border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">10 หอผู้ป่วยที่ใช้งานสูงสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400">กำลังโหลดกราฟ...</div>
            ) : (
              <ResponsiveContainer width="99%" height="99%" minWidth={1} minHeight={1}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar dataKey="เตียงใช้งาน" stackId="a" fill="#0d9488" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="เตียงว่าง" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
