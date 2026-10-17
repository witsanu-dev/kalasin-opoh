'use client';

import { useState, useEffect } from 'react';
import { sendSyncData } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Loader2, Send, RefreshCw, Key, Server, CheckCircle2, AlertCircle,
  Copy, Check, Globe, Activity, Clock, Zap, History, Shield, Play, Pause, RotateCw, Trash2,
  Logs
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MySwal = withReactContent(Swal);

export function OpohClient({ currentUser, isAdmin }: { currentUser?: any; isAdmin?: boolean }) {
  // Universal Hospital Admin Permission Check (Props -> User Session -> Fallback)
  const isSystemAdmin = isAdmin !== undefined ? Boolean(isAdmin) : (() => {
    if (!currentUser) return true;
    const roleUpper = String(currentUser.role || '').toUpperCase();
    const usernameLower = String(currentUser.username || '').toLowerCase();
    const defaultAdmins = ['admin', 'sa', 'bmsadmin', 'ict', 'it', 'hosxp', 'opoh'];
    return roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN' || defaultAdmins.includes(usernameLower);
  })();

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://appksn.moph.go.th/opoh/api/v1');
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Background Auto-Sync State
  const [autoConfig, setAutoConfig] = useState<any>({
    is_auto_sync: false,
    interval_minutes: 3,
    last_sync_at: null,
    last_sync_status: null,
    last_sync_message: null,
    next_sync_time: null,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'logs'>('endpoints');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const ownHospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '11078';
  const ownHospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาลกมลาไสย';

  const getBangkokTime = () => {
    const d = new Date();
    const bkkTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return bkkTime.toISOString().replace('Z', '+07:00');
  };

  // 1. Load API Key, Base URL & Auto Config on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('OPOH_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
    const savedBaseUrl = localStorage.getItem('OPOH_BASE_URL');
    if (savedBaseUrl) {
      setBaseUrl(savedBaseUrl);
    }

    fetchAutoConfig();
    fetchLogs();
    loadRealData();
  }, []);

  // 2. Fetch server-side auto sync config
  const fetchAutoConfig = async () => {
    try {
      const res = await fetch('/api/sync/opoh/config');
      const data = await res.json();
      if (data.success && data.config) {
        setAutoConfig(data.config);
        if (data.config.base_url) setBaseUrl(data.config.base_url);
        if (data.config.api_key && !apiKey) {
          setApiKey(data.config.api_key);
          setIsSaved(true);
        }
      }
    } catch (err) {
      console.error('Failed to load auto sync config:', err);
    }
  };

  // 3. Fetch sync history logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/sync/opoh/logs?limit=50');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch sync logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // 3.1 Clear Logs Handler (Admin Only with Double Confirmation & Retention Options)
  const handleOpenClearLogsModal = async () => {
    const { value: mode, isConfirmed } = await MySwal.fire({
      title: '<div class="text-base font-bold text-slate-800 flex items-center justify-center gap-2">จัดการข้อมูล Logs</div>',
      html: `
        <div class="text-left text-xs text-slate-600 space-y-3 pt-2">
          <p class="text-slate-600 leading-relaxed">
            เลือกรูปแบบการล้างข้อมูลประวัติการส่งข้อมูล OPOH API
          </p>
          <div class="space-y-2.5">
            <label class="flex items-start gap-2.5 p-2.5 rounded-md border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors">
              <input type="radio" name="clear-mode" value="truncate" checked class="mt-0.5 text-rose-600 focus:ring-rose-500" />
              <div>
                <span class="font-bold text-rose-700 block text-xs">ล้างทั้งหมด</span>
              </div>
            </label>
            <label class="flex items-start gap-2.5 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input type="radio" name="clear-mode" value="older_7_days" class="mt-0.5 text-teal-600 focus:ring-teal-500" />
              <div>
                <span class="font-bold text-slate-800 block text-xs">ล้าง Logs ที่เก่ากว่า 7 วัน</span>
              </div>
            </label>
            <label class="flex items-start gap-2.5 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input type="radio" name="clear-mode" value="older_30_days" class="mt-0.5 text-teal-600 focus:ring-teal-500" />
              <div>
                <span class="font-bold text-slate-800 block text-xs">ล้าง Logs ที่เก่ากว่า 30 วัน</span>
              </div>
            </label>
          </div>
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-2 mt-2">
            <span><strong>คำเตือน:</strong> การล้างข้อมูลทั้งหมดจะเป็นการลบข้อมูลประวัติการส่งออกทั้งหมดอย่างถาวร</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันล้างข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      focusCancel: true,
      preConfirm: () => {
        const selected = document.querySelector('input[name="clear-mode"]:checked') as HTMLInputElement;
        return selected ? selected.value : 'truncate';
      }
    });

    if (isConfirmed && mode) {
      executeClearLogs(mode);
    }
  };

  const executeClearLogs = async (mode: string) => {
    setClearingLogs(true);
    try {
      const res = await fetch(`/api/sync/opoh/logs?mode=${mode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await MySwal.fire({
          icon: 'success',
          title: 'ล้างข้อมูล Logs สำเร็จ',
          text: data.message,
          confirmButtonColor: '#0d9488',
          timer: 2000,
        });
        fetchLogs();
      } else {
        await MySwal.fire({
          icon: 'error',
          title: 'ไม่สามารถล้างข้อมูลได้',
          text: data.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล',
          confirmButtonColor: '#0d9488',
        });
      }
    } catch (err: any) {
      await MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
        confirmButtonColor: '#0d9488',
      });
    } finally {
      setClearingLogs(false);
    }
  };

  // 4. Live Countdown Ticker
  useEffect(() => {
    if (!autoConfig?.is_auto_sync || !autoConfig?.next_sync_time) {
      setCountdownSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const nextTime = new Date(autoConfig.next_sync_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((nextTime - now) / 1000));
      setCountdownSeconds(diffSec);

      // When countdown elapses, refresh config and logs silently
      if (diffSec === 0) {
        setTimeout(() => {
          fetchAutoConfig();
          fetchLogs();
        }, 1000);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [autoConfig?.next_sync_time, autoConfig?.is_auto_sync]);

  // Real-time automatic polling every 4 seconds to reflect status changes immediately
  useEffect(() => {
    if (!autoConfig?.is_auto_sync) return;
    const pollInterval = setInterval(() => {
      fetchAutoConfig();
      if (activeTab === 'logs') {
        fetchLogs();
      }
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [autoConfig?.is_auto_sync, activeTab]);

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Save Settings handlers
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('OPOH_API_KEY', key);
    setIsSaved(true);
    // Also sync to server config in background
    fetch('/api/sync/opoh/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key }),
    }).catch(() => { });
  };

  const handleSaveBaseUrl = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem('OPOH_BASE_URL', url);
    // Also sync to server config in background
    fetch('/api/sync/opoh/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_url: url }),
    }).catch(() => { });
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = async (enabled: boolean) => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/sync/opoh/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_auto_sync: enabled,
          interval_minutes: autoConfig?.interval_minutes || 3,
          base_url: baseUrl,
          api_key: apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutoConfig(data.config);
        window.dispatchEvent(new Event('opoh-sync-config-changed'));
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: enabled
            ? `เปิดระบบส่งข้อมูลอัตโนมัติ (ทุกๆ ${data.config.interval_minutes} นาที)`
            : 'หยุดระบบส่งข้อมูลอัตโนมัติชั่วคราว',
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        MySwal.fire({ icon: 'error', title: 'ผิดพลาด', text: data.message });
      }
    } catch (e: any) {
      MySwal.fire({ icon: 'error', title: 'ผิดพลาด', text: e.message });
    } finally {
      setSavingConfig(false);
    }
  };

  // Change Interval (Support 15s = 0.25 min, 30s = 0.5 min, 1 min, etc.)
  const handleChangeInterval = async (minutes: number) => {
    const safeMinutes = Math.max(0.25, Number(minutes) || 3);
    setSavingConfig(true);
    try {
      const res = await fetch('/api/sync/opoh/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_auto_sync: autoConfig?.is_auto_sync ?? true,
          interval_minutes: safeMinutes,
          base_url: baseUrl,
          api_key: apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutoConfig(data.config);
        window.dispatchEvent(new Event('opoh-sync-config-changed'));
        const label = safeMinutes < 1 ? `${Math.round(safeMinutes * 60)} วินาที` : `${safeMinutes} นาที`;
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `กำหนดรอบเวลาส่งข้อมูลเป็นทุกๆ ${label}`,
          showConfirmButton: false,
          timer: 2500,
        });
      } else {
        MySwal.fire({ icon: 'error', title: 'ผิดพลาด', text: data.message });
      }
    } catch (e: any) {
      MySwal.fire({ icon: 'error', title: 'ผิดพลาด', text: e.message });
    } finally {
      setSavingConfig(false);
    }
  };

  // Trigger Instant Sync All
  const handleSyncAllNow = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/sync/opoh/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        MySwal.fire({
          icon: 'success',
          title: 'ส่งข้อมูลสำเร็จ',
          text: data.message,
          confirmButtonColor: '#0d9488',
        });
      } else {
        MySwal.fire({
          icon: 'warning',
          title: 'ผลการส่งข้อมูล',
          text: data.message,
          confirmButtonColor: '#0d9488',
        });
      }
      fetchAutoConfig();
      fetchLogs();
      loadRealData();
    } catch (err: any) {
      MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
        confirmButtonColor: '#0d9488',
      });
    } finally {
      setSyncingAll(false);
    }
  };

  // Load Real Data for Payload Inspector
  const loadRealData = async () => {
    setFetchingData(true);
    try {
      const [resBeds, resLr, resOr, resSq] = await Promise.all([
        fetch('/api/beds').then(r => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/lr').then(r => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/or').then(r => r.json()).catch(() => ({ success: false, data: null })),
        fetch('/api/surgical_queue').then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ]);

      const items = [];

      // 1. Beds
      const bedWards = (resBeds.success && resBeds.data) ? resBeds.data : [];
      items.push({
        id: 'beds',
        title: 'ข้อมูลเตียงผู้ป่วย (Bed Management)',
        endpoint: '/sync/beds',
        payload: {
          hospitalCode: ownHospitalCode,
          updatedAt: getBangkokTime(),
          wards: bedWards.map((w: any) => ({
            wardCode: w.ward_code,
            wardName: w.ward_name,
            totalBed: w.total_bed,
            actualBed: w.actual_bed !== null ? w.actual_bed : w.total_bed,
            occupiedBed: w.occupied_bed,
            availableBed: w.available_bed,
            occupancyRate: parseFloat(w.occupancy_rate),
            exportCode: w.export_code || ""
          }))
        }
      });

      // 2. LR
      const lrData = (resLr.success && resLr.data) ? (Array.isArray(resLr.data) ? resLr.data[0] : resLr.data) : null;
      items.push({
        id: 'lr',
        title: 'ข้อมูลห้องคลอด (LR Management)',
        endpoint: '/sync/lr',
        payload: {
          hospitalCode: ownHospitalCode,
          hospitalName: ownHospitalName,
          waitingLabor: lrData?.waiting_labor || 0,
          normalDelivery: lrData?.normal_delivery || 0,
          cesareanDelivery: lrData?.cesarean_delivery || 0,
          abortion: lrData?.abortion || 0,
          notDelivery: lrData?.not_delivery || 0,
          totalCase: lrData?.total_case || 0
        }
      });

      // 3. OR
      const orData = (resOr.success && resOr.data) ? resOr.data : null;
      items.push({
        id: 'or',
        title: 'ข้อมูลห้องผ่าตัด (OR Management)',
        endpoint: '/sync/or',
        payload: {
          hospitalCode: ownHospitalCode,
          hospitalName: ownHospitalName,
          roomAvailableStr: orData?.room_available_str || "0/0",
          operatingCount: orData?.operating_count || 0,
          waitingCount: orData?.waiting_count || 0,
          completedCount: orData?.completed_count || 0,
          cancelledCount: orData?.cancelled_count || 0,
          totalCaseToday: orData?.total_case_today || 0
        }
      });

      // 4. Surgical Queue
      const sqData = (resSq.success && resSq.data) ? (Array.isArray(resSq.data) ? resSq.data[0] : resSq.data) : null;
      items.push({
        id: 'surgical-queue',
        title: 'ข้อมูลคิวผ่าตัด (Surgical Queue)',
        endpoint: '/sync/surgical-queue',
        payload: {
          hospitalCode: ownHospitalCode,
          hospitalName: ownHospitalName,
          totalCases: sqData?.total_cases || 0,
          generalSurgery: sqData?.general_surgery || 0,
          orthoSurgery: sqData?.ortho_surgery || 0,
          eyeSurgery: sqData?.eye_surgery || 0,
          obgynSurgery: sqData?.obgyn_surgery || 0,
          urgencyLevelDesc: sqData?.urgency_level_desc || "ฉุกเฉิน (Emergency) 0, เร่งด่วน (Urgency) 0, รอตามนัด (Elective) 0"
        }
      });

      setEndpoints(items);
    } catch (error) {
      console.error('Error fetching real data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleCopyEndpoint = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (id: string, endpoint: string, payload: any) => {
    if (!apiKey) {
      MySwal.fire({
        title: 'กรุณากรอก API Key',
        text: 'จำเป็นต้องใช้ API Key ในการส่งข้อมูลไปยังฐานข้อมูลกลาง',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    setLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const response = await sendSyncData(endpoint, payload, apiKey, baseUrl);
      setResults(prev => ({ ...prev, [id]: response }));

      if (response.success) {
        MySwal.fire({
          title: 'สำเร็จ!',
          text: `ส่งข้อมูลไปที่ ${endpoint} เรียบร้อยแล้ว`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด!',
          text: response.error || `Status: ${response.status}`,
          icon: 'error',
          confirmButtonColor: '#0d9488'
        });
      }
      fetchLogs();
    } catch (error: any) {
      MySwal.fire({
        title: 'ระบบขัดข้อง!',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setLoadingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 animate-in fade-in duration-500">
        <div className="p-6 bg-white rounded-md shadow-sm border border-slate-100 mb-6">
          <Server className="h-10 w-10 text-teal-600 animate-pulse" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin mb-3 text-teal-600" />
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">กำลังประมวลผลข้อมูล</h2>
        <p className="text-sm mt-1">ระบบกำลังเตรียมข้อมูลล่าสุดจากฐานข้อมูล (HIS) เพื่อนำส่งส่วนกลาง...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 flex items-center">
            <Server className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-teal-600" />
            ระบบส่งข้อมูล OPOH <span className="text-teal-600 ml-2">API Hub</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            เชื่อมโยงข้อมูล OPOH ของโรงพยาบาล ไปยังศูนย์กลางข้อมูลสาธารณสุขจังหวัดกาฬสินธุ์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSyncAllNow}
            disabled={syncingAll || !apiKey}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm rounded-md h-10 px-4 text-xs font-semibold"
          >
            {syncingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 text-white" />}
            ส่งข้อมูลทันที
          </Button>
          <Button
            onClick={loadRealData}
            variant="outline"
            className="bg-white hover:bg-slate-50 rounded-md border-slate-200 shadow-sm h-10 px-3 text-xs"
          >
            <RefreshCw className="w-4 h-4 text-teal-600 mr-1.5" />
            โหลดข้อมูลใหม่
          </Button>
        </div>
      </div>

      {/* 🚀 Auto-Sync Background Scheduler Control Panel */}
      <Card className="rounded-md border-teal-200/80 shadow-md overflow-hidden bg-gradient-to-br from-white via-teal-50/20 to-slate-50 border">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600"></div>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-teal-500/10 text-teal-700 rounded-md">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    ระบบส่งข้อมูลอัตโนมัติ
                    {autoConfig?.is_auto_sync ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 rounded-md px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {Number(autoConfig.interval_minutes) < 1
                          ? `${Math.round(Number(autoConfig.interval_minutes) * 60)} วินาที`
                          : `${autoConfig.interval_minutes} นาที`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                        หยุดชั่วคราว
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ประมวลผลบนเซิร์ฟเวอร์ ตลอด 24 ชม. <span className="font-semibold text-teal-600">Sync Schedule</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 self-start lg:self-center">
              <span className="text-xs font-bold text-slate-700">
                {autoConfig?.is_auto_sync ? 'เปิดการส่งอัตโนมัติ' : 'ปิดการส่งอัตโนมัติ'}
              </span>
              <button
                type="button"
                disabled={savingConfig}
                onClick={() => handleToggleAutoSync(!autoConfig?.is_auto_sync)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${autoConfig?.is_auto_sync ? 'bg-teal-600' : 'bg-slate-300'
                  } disabled:opacity-50`}
                role="switch"
                aria-checked={autoConfig?.is_auto_sync}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoConfig?.is_auto_sync ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Circuit Breaker Alert Banner */}
          {autoConfig?.rate_limited_until && new Date(autoConfig.rate_limited_until).getTime() > Date.now() && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2.5 text-xs text-amber-900 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>ระบบ Circuit Breaker ป้องกัน HTTP 429:</strong> เซิร์ฟเวอร์กลางแจ้งเตือนอัตราการส่งข้อมูลสูงเกินไป ระบบจึงหยุดส่งชั่วคราวเพื่อปกป้อง IP โรงพยาบาล โดยจะเริ่มส่งตามปกติเวลา {new Date(autoConfig.rate_limited_until).toLocaleTimeString('th-TH')}
              </span>
            </div>
          )}

          {/* Controls & Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* 1. Interval Selector */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>รอบเวลาส่งข้อมูล</span>
                <span className="text-[10px] text-teal-600 font-normal">Ticker Interval</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={autoConfig?.interval_minutes ?? 3}
                  disabled={savingConfig}
                  onChange={(e) => handleChangeInterval(parseFloat(e.target.value))}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option hidden value={0.25}>15 วินาที</option>
                  <option hidden value={0.5}>30 วินาที</option>
                  <option value={1}>1 นาที</option>
                  <option value={3}>3 นาที</option>
                  <option value={5}>5 นาที</option>
                  <option value={10}>10 นาที</option>
                  <option value={15}>15 นาที</option>
                  <option value={30}>30 นาที</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400">
                เพื่อประสิทธิภาพในการส่งข้อมูล ควรตั้งค่าไม่น้อยกว่า 3 นาที
              </p>
            </div>

            {/* 2. Next Sync Countdown */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                รอบการส่งข้อมูล
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-black text-teal-700 tracking-wider">
                  {autoConfig?.is_auto_sync ? formatCountdown(countdownSeconds) : '--:--'}
                </span>
                <span className="text-[10px] text-slate-400">นาที</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {autoConfig?.next_sync_time ? `เวลา: ${new Date(autoConfig.next_sync_time).toLocaleTimeString('th-TH')}` : 'หยุดการนับชั่วคราว'}
              </p>
            </div>

            {/* 3. Last Sync Timestamp & Real-time Status */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                ส่งข้อมูลล่าสุดเมื่อ
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {autoConfig?.last_sync_at ? new Date(autoConfig.last_sync_at).toLocaleString('th-TH', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                }) : 'ยังไม่มีประวัติการส่ง'}
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                <span>สถานะ</span>
                {(() => {
                  const s = String(autoConfig?.last_sync_status || '').trim();
                  const isSuccess = s === 'สำเร็จ' || s === 'SUCCESS';
                  const isFail = s === 'ไม่สำเร็จ' || s === 'FAILED' || s === 'FAIL' || s === 'ERROR';
                  const isPartial = s === 'สำเร็จบางส่วน' || s === 'PARTIAL';

                  if (isSuccess) {
                    return (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] shadow-sm animate-in fade-in">
                        <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse" />
                        สำเร็จ
                      </span>
                    );
                  }
                  if (isFail) {
                    return (
                      <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md text-[11px] shadow-sm animate-in fade-in">
                        <span className="w-1.5 h-1.5 rounded-sm bg-red-500" />
                        ไม่สำเร็จ
                      </span>
                    );
                  }
                  if (isPartial) {
                    return (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                        สำเร็จบางส่วน
                      </span>
                    );
                  }
                  return <span className="font-medium text-slate-400">{s || '-'}</span>;
                })()}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold underline pt-1 flex items-center gap-1 transition-colors"
              >
                <History className="w-3 h-3" />
                <span>ดูประวัติและจัดการ Logs ({logs.length})</span>
              </button>
            </div>

            {/* 4. Safety & Concurrency Guard */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                ระบบความปลอดภัย
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Concurrency Lock Active
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Timeout 15s
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Configuration Card: Base URL & API Key */}
      <Card className="rounded-md border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="w-full space-y-2 md:col-span-5">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <Globe className="w-4 h-4 mr-1.5 text-slate-400" />
                Endpoint Base URL
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="https://appksn.moph.go.th/opoh/api/v1"
                  value={baseUrl}
                  onChange={(e) => handleSaveBaseUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-xs transition-all shadow-sm text-slate-700"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                กำหนดเซิร์ฟเวอร์ปลายทางสำหรับรับข้อมูล OPOH
              </p>
            </div>

            <div className="w-full space-y-2 md:col-span-7">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center">
                  <Key className="w-4 h-4 mr-1.5 text-slate-400" />
                  OPOH Authentication Key (API Key)
                </span>
                {isSaved && apiKey.length > 0 && (
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> บันทึกแล้ว
                  </span>
                )}
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  placeholder="กรอก API Key เพื่อยืนยันตัวตน..."
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-xs transition-all shadow-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" />
                API Key ใช้สำหรับส่ง Header <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">OPOH-Auth-Key</code> ไปยังเซิร์ฟเวอร์กลาง
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('endpoints')}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'endpoints'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Server className="w-4 h-4" />
            โครงสร้าง Payload ({endpoints.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              fetchLogs();
            }}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'logs'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติการส่งข้อมูล (Logs)</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold">
              {logs.length}
            </span>
          </button>
        </div>

        {isSystemAdmin && activeTab === 'endpoints' && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              setTimeout(() => handleOpenClearLogsModal(), 150);
            }}
            className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 pb-3 font-semibold transition-colors"
            title="ไปที่แท็บประวัติและเปิดหน้าต่างล้าง Logs"
          >
            <Logs className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">จัดการ Logs</span>
          </button>
        )}

        {activeTab === 'logs' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="text-xs text-slate-500 hover:text-teal-700 h-8 mb-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingLogs ? 'animate-spin text-teal-600' : ''}`} />
            รีเฟรชประวัติ
          </Button>
        )}
      </div>

      {/* Tab 1: Endpoints & Payloads */}
      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {endpoints.map((item) => {
            const isLoading = loadingIds[item.id];
            const result = results[item.id];
            const fullEndpoint = `${baseUrl}${item.endpoint}`;

            return (
              <Card key={item.id} className="rounded-md shadow-sm border border-slate-200 flex flex-col bg-white overflow-hidden group hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                  <div className="flex flex-col gap-2.5">
                    <CardTitle className="text-base font-bold text-slate-800">{item.title}</CardTitle>
                    <div className="flex items-stretch gap-2 h-8">
                      <div className="flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 text-[10px] uppercase font-bold tracking-wider px-2.5 rounded-md">
                        POST
                      </div>
                      <div className="flex-1 flex items-center justify-between bg-white border border-slate-200 rounded-md px-2.5 shadow-sm group/copy hover:border-teal-300 transition-colors">
                        <code className="text-[11px] font-mono text-slate-500 truncate mr-2">
                          {fullEndpoint}
                        </code>
                        <button
                          onClick={() => handleCopyEndpoint(fullEndpoint, item.id)}
                          className="text-slate-400 hover:text-teal-600 focus:outline-none transition-colors shrink-0"
                          title="คัดลอก URL"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="bg-slate-900 text-slate-300 p-3.5 overflow-x-auto max-h-[260px] text-xs font-mono border-b border-slate-800">
                    <pre className="m-0 leading-relaxed">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>

                  <div className="p-4 bg-white flex flex-col gap-3">
                    <Button
                      onClick={() => handleSend(item.id, item.endpoint, item.payload)}
                      disabled={isLoading || !apiKey}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-sm h-10 transition-all flex items-center justify-center font-semibold text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-3.5 w-3.5" />
                      )}
                      {isLoading ? 'กำลังส่งข้อมูล...' : 'ทดสอบส่งข้อมูลระบบนี้'}
                    </Button>

                    {result && (
                      <div className={`p-3 rounded-md border text-xs ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <div className="flex items-center font-bold mb-1.5">
                          {result.success ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                          Response Status: {result.status || 'Error'}
                        </div>
                        <div className="bg-white/80 rounded border border-white/40 p-2 overflow-x-auto max-h-[120px]">
                          <pre className="text-[11px] font-mono m-0 opacity-80">
                            {JSON.stringify(result.data || result.error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 2: Sync History Logs Table */}
      {activeTab === 'logs' && (
        <Card className="rounded-md border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 py-3 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                ประวัติการส่งข้อมูลย้อนหลัง
              </CardTitle>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ประวัติการส่งข้อมูล OPOH API ย้อนหลัง ({logs.length} รายการล่าสุด)
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-100 rounded-md gap-1.5"
                title="รีเฟรชประวัติการส่งข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </Button>

              {isSystemAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenClearLogsModal}
                  disabled={clearingLogs || loadingLogs}
                  className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 rounded-md gap-1.5 transition-all shadow-sm"
                  title="จัดการล้างประวัติ Logs (เฉพาะสิทธิ์ Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>{clearingLogs ? 'กำลังล้าง...' : 'ล้างประวัติ Logs'}</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">วัน-เวลา</th>
                  <th className="py-2.5 px-4 text-center">ประเภท</th>
                  <th className="py-2.5 px-4">Endpoint</th>
                  <th className="py-2.5 px-4 text-center">HTTP Status</th>
                  <th className="py-2.5 px-4 text-right">เวลาที่ใช้</th>
                  <th className="py-2.5 px-4">ข้อความตอบกลับ / ข้อผิดพลาด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                      กำลังโหลดประวัติการส่งข้อมูล...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      ยังไม่มีประวัติการส่งข้อมูลในระบบ
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {log.sync_type === 'AUTO' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-2 py-0.2 rounded-md font-semibold font-sans">
                            AUTO
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0.2 rounded-md font-semibold font-sans">
                            MANUAL
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {log.endpoint}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {log.is_success ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            สำเร็จ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            ไม่สำเร็จ
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {log.duration_ms} ms
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans max-w-xs truncate" title={log.error_message || log.response_data}>
                        {log.error_message ? (
                          <span className="text-rose-600 font-medium">{log.error_message}</span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">{log.response_data || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
