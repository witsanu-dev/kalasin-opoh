"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { RefreshCw, Copy, Check, Activity, BedDouble, Stethoscope, Eye, Terminal, ClipboardList, Edit3, AlertCircle, Clock, Bone, Baby, Send, FileJson } from "lucide-react";
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

interface WaitingORData {
  id: number;
  hospital_code: string;
  hospital_name: string;
  total_cases: number;
  general_surgery: number;
  ortho_surgery: number;
  eye_surgery: number;
  obgyn_surgery: number;
  urgency_level_desc: string;
  last_sync_at: string;
}

export function SurgicalQueueDashboard() {
  const [data, setData] = useState<WaitingORData[]>([]);
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
      const res = await fetch("/api/surgical_queue");
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
      }
    };
    initData();
    if (typeof window !== 'undefined') {
      setApiUrl(`${window.location.origin}/api/opoh/surgical_queue`);
    }
  }, []);

  const handleCopyApi = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyIn = () => {
    const ownData = data.find(d => d.hospital_code === ownHospitalCode) || {
      general_surgery: 0, ortho_surgery: 0, eye_surgery: 0, obgyn_surgery: 0, urgency_level_desc: ''
    };
    
    let urgencies = { high: 0, med: 0, low: 0 };
    if (ownData.urgency_level_desc) {
      const matchHigh = ownData.urgency_level_desc.match(/ฉุกเฉิน \(Emergency\):\s*(\d+)/);
      const matchMed = ownData.urgency_level_desc.match(/เร่งด่วน \(Urgency\):\s*(\d+)/);
      const matchLow = ownData.urgency_level_desc.match(/รอตามนัด \(Elective\):\s*(\d+)/);
      if (matchHigh) urgencies.high = parseInt(matchHigh[1]);
      if (matchMed) urgencies.med = parseInt(matchMed[1]);
      if (matchLow) urgencies.low = parseInt(matchLow[1]);
    }

    MySwal.fire({
      title: 'บันทึกข้อมูลจัดการคิวผ่าตัด',
      html: `
        <div class="space-y-4 text-left mt-4 p-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">ศัลยกรรมทั่วไป (General)</label>
              <input type="number" id="gen" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${ownData.general_surgery}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">ศัลยกรรมกระดูก (Ortho)</label>
              <input type="number" id="ortho" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${ownData.ortho_surgery}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">จักษุ (Eye)</label>
              <input type="number" id="eye" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${ownData.eye_surgery}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">สูตินรีเวช (OB/GYN)</label>
              <input type="number" id="obgyn" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${ownData.obgyn_surgery}">
            </div>
          </div>
          <hr class="border-slate-100 my-4" />
          <h4 class="font-bold text-slate-700 text-sm">รายละเอียดความเร่งด่วน (เคส)</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-red-500 mb-1">ฉุกเฉิน (Emergency)</label>
              <input type="number" id="uhigh" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${urgencies.high}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-amber-500 mb-1">เร่งด่วน (Urgency)</label>
              <input type="number" id="umed" class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" value="${urgencies.med}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-emerald-500 mb-1">รอตามนัด (Elective)</label>
              <input type="number" id="ulow" readonly class="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed px-3 py-2 text-sm focus:outline-none" value="${urgencies.low}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'บันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-xl',
      },
      didOpen: () => {
        const genEl = document.getElementById('gen') as HTMLInputElement;
        const orthoEl = document.getElementById('ortho') as HTMLInputElement;
        const eyeEl = document.getElementById('eye') as HTMLInputElement;
        const obgynEl = document.getElementById('obgyn') as HTMLInputElement;
        const highEl = document.getElementById('uhigh') as HTMLInputElement;
        const medEl = document.getElementById('umed') as HTMLInputElement;
        const lowEl = document.getElementById('ulow') as HTMLInputElement;

        const recalculateLow = () => {
          const total = (parseInt(genEl.value) || 0) + (parseInt(orthoEl.value) || 0) + (parseInt(eyeEl.value) || 0) + (parseInt(obgynEl.value) || 0);
          const high = parseInt(highEl.value) || 0;
          const med = parseInt(medEl.value) || 0;
          
          let remaining = total - high - med;
          if (remaining < 0) remaining = 0;
          lowEl.value = remaining.toString();
        };

        [genEl, orthoEl, eyeEl, obgynEl, highEl, medEl].forEach(el => {
          if (el) el.addEventListener('input', recalculateLow);
        });
        
        // Trigger calculation on open
        recalculateLow();
      },
      preConfirm: () => {
        const gen = parseInt((document.getElementById('gen') as HTMLInputElement).value) || 0;
        const ortho = parseInt((document.getElementById('ortho') as HTMLInputElement).value) || 0;
        const eye = parseInt((document.getElementById('eye') as HTMLInputElement).value) || 0;
        const obgyn = parseInt((document.getElementById('obgyn') as HTMLInputElement).value) || 0;
        
        const high = parseInt((document.getElementById('uhigh') as HTMLInputElement).value) || 0;
        const med = parseInt((document.getElementById('umed') as HTMLInputElement).value) || 0;

        const totalCases = gen + ortho + eye + obgyn;
        const totalUrgency = high + med;

        if (totalUrgency > totalCases) {
          Swal.showValidationMessage(`จำนวนเคสฉุกเฉินและเร่งด่วน (${totalUrgency}) ต้องไม่เกินคิวสะสมทั้งหมด (${totalCases})`);
          return false;
        }

        const low = totalCases - totalUrgency;

        return {
          general: gen,
          ortho: ortho,
          eye: eye,
          obgyn: obgyn,
          highUrgency: high,
          medUrgency: med,
          lowUrgency: low,
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setSyncing(true);
          const res = await fetch("/api/surgical_queue/update", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.value)
          });
          const json = await res.json();
          if (json.success) {
            MySwal.fire({
              title: 'บันทึกข้อมูลสำเร็จ!',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            fetchData();
          } else {
            MySwal.fire('ข้อผิดพลาด', json.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
          }
        } catch (error) {
          MySwal.fire('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        } finally {
          setSyncing(false);
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
      await fetch("/api/sync/surgical_queue", { method: "POST" });
      
      // 2. Fetch fresh data
      const resData = await fetch("/api/surgical_queue");
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
        totalCases: ownData.total_cases || 0,
        generalSurgery: ownData.general_surgery || 0,
        orthoSurgery: ownData.ortho_surgery || 0,
        eyeSurgery: ownData.eye_surgery || 0,
        obgynSurgery: ownData.obgyn_surgery || 0,
        urgencyLevelDesc: ownData.urgency_level_desc || "ฉุกเฉิน (Emergency) 0, เร่งด่วน (Urgency) 0, รอตามนัด (Elective) 0"
      };

      const response = await sendSyncData('/sync/surgical-queue', payload, apiKey);
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
      totalCases: ownData.total_cases || 0,
      generalSurgery: ownData.general_surgery || 0,
      orthoSurgery: ownData.ortho_surgery || 0,
      eyeSurgery: ownData.eye_surgery || 0,
      obgynSurgery: ownData.obgyn_surgery || 0,
      urgencyLevelDesc: ownData.urgency_level_desc || "ฉุกเฉิน (Emergency) 0, เร่งด่วน (Urgency) 0, รอตามนัด (Elective) 0"
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
            <code class="font-mono text-xs text-slate-600 px-3 flex-1 truncate text-left select-all">https://appksn.moph.go.th/opoh/api/v1/sync/surgical-queue</code>
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
            navigator.clipboard.writeText('https://appksn.moph.go.th/opoh/api/v1/sync/surgical-queue');
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
            setTimeout(() => {
              copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
            }, 2000);
          });
        }
      }
    });
  };

  const summary = useMemo(() => {
    const targetData = data;

    return targetData.reduce((acc, curr) => {
      let h = 0, m = 0, l = 0;
      if (curr.urgency_level_desc) {
        const matchHigh = curr.urgency_level_desc.match(/ฉุกเฉิน \(Emergency\):\s*(\d+)/);
        const matchMed = curr.urgency_level_desc.match(/เร่งด่วน \(Urgency\):\s*(\d+)/);
        const matchLow = curr.urgency_level_desc.match(/รอตามนัด \(Elective\):\s*(\d+)/);
        if (matchHigh) h = parseInt(matchHigh[1]) || 0;
        if (matchMed) m = parseInt(matchMed[1]) || 0;
        if (matchLow) l = parseInt(matchLow[1]) || 0;
      }

      return {
        total_cases: acc.total_cases + curr.total_cases,
        general_surgery: acc.general_surgery + curr.general_surgery,
        ortho_surgery: acc.ortho_surgery + curr.ortho_surgery,
        eye_surgery: acc.eye_surgery + curr.eye_surgery,
        obgyn_surgery: acc.obgyn_surgery + curr.obgyn_surgery,
        urgency_high: acc.urgency_high + h,
        urgency_med: acc.urgency_med + m,
        urgency_low: acc.urgency_low + l,
      }
    }, {
      total_cases: 0,
      general_surgery: 0,
      ortho_surgery: 0,
      eye_surgery: 0,
      obgyn_surgery: 0,
      urgency_high: 0,
      urgency_med: 0,
      urgency_low: 0,
    });
  }, [data, showOwnHospitalOnly, ownHospitalCode]);

  const showUrgencyModal = (desc: string) => {
    let urgencies = { high: 0, med: 0, low: 0 };
    if (desc) {
      const matchHigh = desc.match(/ฉุกเฉิน \(Emergency\):\s*(\d+)/);
      const matchMed = desc.match(/เร่งด่วน \(Urgency\):\s*(\d+)/);
      const matchLow = desc.match(/รอตามนัด \(Elective\):\s*(\d+)/);
      if (matchHigh) urgencies.high = parseInt(matchHigh[1]);
      if (matchMed) urgencies.med = parseInt(matchMed[1]);
      if (matchLow) urgencies.low = parseInt(matchLow[1]);
    }

    MySwal.fire({
      title: '<div class="flex items-center justify-center gap-2 text-xl font-bold text-slate-800 tracking-tight"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg> ระดับความเร่งด่วน</div>',
      html: `
        <div class="mt-2 space-y-2.5 text-left px-2">
          <div class="flex justify-between items-center px-4 py-3 bg-red-50 rounded-lg border border-red-100">
            <div class="flex items-center gap-3">
              <span class="flex h-3 w-3 rounded-full bg-red-500"></span>
              <span class="text-sm font-bold text-red-700">ฉุกเฉิน <span class="text-red-400/80 font-medium text-xs ml-1">(Emergency)</span></span>
            </div>
            <span class="text-2xl font-black text-red-600">${urgencies.high} <span class="text-xs font-semibold text-red-400">เคส</span></span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 bg-amber-50 rounded-lg border border-amber-100">
            <div class="flex items-center gap-3">
              <span class="flex h-3 w-3 rounded-full bg-amber-500"></span>
              <span class="text-sm font-bold text-amber-700">เร่งด่วน <span class="text-amber-500/80 font-medium text-xs ml-1">(Urgency)</span></span>
            </div>
            <span class="text-2xl font-black text-amber-600">${urgencies.med} <span class="text-xs font-semibold text-amber-500">เคส</span></span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div class="flex items-center gap-3">
              <span class="flex h-3 w-3 rounded-full bg-emerald-500"></span>
              <span class="text-sm font-bold text-emerald-700">รอตามนัด <span class="text-emerald-500/80 font-medium text-xs ml-1">(Elective)</span></span>
            </div>
            <span class="text-2xl font-black text-emerald-600">${urgencies.low} <span class="text-xs font-semibold text-emerald-500">เคส</span></span>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'ปิดหน้าต่าง',
      confirmButtonColor: '#0f172a',
      width: '400px',
      customClass: {
        popup: 'rounded-[16px] pb-6',
        title: 'pt-6 pb-2',
        confirmButton: 'rounded-md px-8'
      }
    });
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'hospital_name',
      header: 'หน่วยบริการ',
      cell: (info: any) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
    },
    {
      accessorKey: 'total_cases',
      header: 'รวมทั้งหมด (เคส)',
      cell: (info: any) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
            {info.getValue()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'general_surgery',
      header: 'ศัลยกรรมทั่วไป',
      cell: (info: any) => <div className="text-center font-bold text-blue-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'ortho_surgery',
      header: 'ศัลยกรรมกระดูก',
      cell: (info: any) => <div className="text-center font-bold text-amber-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'eye_surgery',
      header: 'จักษุ',
      cell: (info: any) => <div className="text-center font-bold text-emerald-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'obgyn_surgery',
      header: 'สูตินรีเวช',
      cell: (info: any) => <div className="text-center font-bold text-pink-600">{info.getValue()}</div>,
    },
    {
      accessorKey: 'urgency_level_desc',
      header: 'ความเร่งด่วน',
      cell: (info: any) => (
        <div className="text-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 px-3 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200"
            onClick={() => showUrgencyModal(info.getValue())}
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
            ดูรายละเอียด
          </Button>
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
            <Clock className="w-6 h-6 mr-2 text-teal-600" />
            ระบบจัดการคิวผ่าตัด - Surgical Queue
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-slate-500 text-sm font-medium">
              ภาพรวมและข้อมูลคิวผ่าตัดแบบเรียลไทม์
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
              disabled={true}
              title="ไม่มีคำสั่ง SQL เนื่องจากเป็นการบันทึกข้อมูลเอง (Key-in)"
              className="text-slate-300 border-slate-200 rounded-md cursor-not-allowed bg-slate-50"
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
              onClick={handleKeyIn}
              disabled={syncing || loading || sending}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all rounded-md px-6"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              บันทึกข้อมูล
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
          <div className="h-1 w-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">คิวผ่าตัดสะสมรวม</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{loading ? "-" : summary.total_cases.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ศัลยกรรมทั่วไป</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Stethoscope className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{loading ? "-" : summary.general_surgery.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-amber-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ศัลยกรรมกระดูก</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <Bone className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{loading ? "-" : summary.ortho_surgery.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">จักษุ</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <Eye className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{loading ? "-" : summary.eye_surgery.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-pink-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">สูตินรีเวช</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-pink-50 group-hover:text-pink-600 transition-colors">
              <Baby className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-500">{loading ? "-" : summary.obgyn_surgery.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-red-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ฉุกเฉิน</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-red-50 transition-colors">
              <span className="flex h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{loading ? "-" : summary.urgency_high.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-amber-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">เร่งด่วน</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-amber-50 transition-colors">
              <span className="flex h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{loading ? "-" : summary.urgency_med.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-none shadow-sm bg-white overflow-hidden group">
          <div className="h-1 w-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">รอตามนัด</CardTitle>
            <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 transition-colors">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{loading ? "-" : summary.urgency_low.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-md shadow-sm border border-slate-100 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              ปริมาณคิวผ่าตัดสะสม
            </CardTitle>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="ค้นหาโรงพยาบาล..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-3 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
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
                        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-teal-200" />
                        <p>กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                      <p>ไม่พบข้อมูลคิวผ่าตัด</p>
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
