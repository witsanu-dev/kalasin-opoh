"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { LayoutDashboard, BedDouble, CheckCircle2, Activity, Hospital, Stethoscope, Clock, Baby } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Check } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from "recharts";
import { InlineApiEndpoint } from "@/components/api-endpoint-display";

const COLORS = {
  emerald: '#10b981',
  teal: '#0d9488',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#3b82f6',
  slate: '#e2e8f0',
};

const MySwal = withReactContent(Swal);

interface OverviewData {
  hospital_name: string;
  last_sync_at: string;
  summary: {
    total_beds: number;
    available_beds: number;
    total_icu: number;
    available_icu: number;
    or_cases_today: number;
    or_waiting: number;
    lr_cases_today: number;
  };
}

export function MainDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const localData = await fetchData();
      if (localData && localData.last_sync_at) {
        const lastSyncTime = new Date(localData.last_sync_at).getTime();
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
      setApiUrl(`${window.location.origin}/api/opoh/overview`);
    }
  }, []);

  const handleCopyApi = () => {
    if (apiUrl) {
      navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/overview");
      
      if (res.status === 401) {
        window.location.href = '/login';
        return null;
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          return json.data;
        }
      } else {
        console.error("Received non-JSON response from API");
      }
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleSync = async (isSilent = false) => {
    try {
      if (!isSilent) setSyncing(true);
      const [resBeds, resOr, resLr] = await Promise.all([
        fetch("/api/sync/beds", { method: "POST" }),
        fetch("/api/sync/or", { method: "POST" }),
        fetch("/api/sync/lr", { method: "POST" })
      ]);
      
      if (resBeds.status === 401 || resOr.status === 401 || resLr.status === 401) {
        window.location.href = '/login';
        return;
      }

      // Check content-type to avoid HTML parse errors
      const isJson = (res: Response) => res.headers.get("content-type")?.includes("application/json");
      
      const jsonBeds = isJson(resBeds) ? await resBeds.json() : { success: false };
      const jsonOr = isJson(resOr) ? await resOr.json() : { success: false };
      const jsonLr = isJson(resLr) ? await resLr.json() : { success: false };
      
      if (jsonBeds.success && jsonOr.success && jsonLr.success) {
        if (!isSilent) {
          MySwal.fire({
            title: 'ซิงค์ข้อมูลสำเร็จ!',
            text: 'อัปเดตข้อมูลภาพรวมล่าสุดเรียบร้อย',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
        fetchData(); // Refresh overview data
      } else {
        if (!isSilent) MySwal.fire('ข้อผิดพลาด', 'มีบางระบบไม่สามารถซิงค์ข้อมูลได้สมบูรณ์', 'warning');
        fetchData(); // Still refresh to get whatever succeeded
      }
    } catch (error) {
      if (!isSilent) MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      if (!isSilent) setSyncing(false);
    }
  };

  const d = data?.summary;
  const lastUpdated = data ? new Date(data.last_sync_at) : null;

  // Chart Data Calculations
  const bedsTotal = d?.total_beds || 0;
  const bedsAvailable = d?.available_beds || 0;
  const bedsOccupied = Math.max(0, bedsTotal - bedsAvailable);
  const bedOccupancyRate = bedsTotal > 0 ? ((bedsOccupied / bedsTotal) * 100).toFixed(0) : 0;

  const icuTotal = d?.total_icu || 0;
  const icuAvailable = d?.available_icu || 0;
  const icuOccupied = Math.max(0, icuTotal - icuAvailable);
  const icuOccupancyRate = icuTotal > 0 ? ((icuOccupied / icuTotal) * 100).toFixed(0) : 0;

  const bedData = [
    { name: 'ครองเตียง', value: bedsOccupied, color: COLORS.amber },
    { name: 'เตียงว่าง', value: bedsAvailable, color: COLORS.emerald },
  ];

  const icuData = [
    { name: 'ครองเตียง', value: icuOccupied, color: COLORS.rose },
    { name: 'เตียงว่าง', value: icuAvailable, color: COLORS.teal },
  ];

  const workloadData = [
    { name: 'ผ่าตัดวันนี้', cases: d?.or_cases_today || 0, fill: COLORS.blue },
    { name: 'รอคลอดวันนี้', cases: d?.lr_cases_today || 0, fill: COLORS.rose },
    { name: 'คิวรอผ่าตัด', cases: d?.or_waiting || 0, fill: COLORS.amber },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-2 text-teal-600" />
            ภาพรวมระบบ <span className="text-teal-600 ml-1.5">One Province One Hospital</span>
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-slate-500 text-sm font-medium">
              {process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาล'} จังหวัดกาฬสินธุ์ <span className="text-teal-500/40 mx-1.5 font-light">|</span> <span className="text-teal-600">Dashboards</span>
            </p>
            {apiUrl && (
              <InlineApiEndpoint url={apiUrl} />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {lastUpdated && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
              อัปเดตล่าสุด: {format(lastUpdated, "dd/MM/yyyy HH:mm:ss")}
            </span>
          )}
          <Button
            onClick={() => handleSync()}
            disabled={syncing || loading}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all rounded-md px-6"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            ซิงค์ข้อมูลภาพรวม
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {/* Card 1: เตียงรวมทั้งหมด */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-100 group-hover:bg-blue-500 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <BedDouble className="w-24 h-24 text-blue-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">เตียงรวมทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <BedDouble className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-800">{loading ? "-" : d?.total_beds?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: เตียงรวมว่าง */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-100 group-hover:bg-emerald-500 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <CheckCircle2 className="w-24 h-24 text-emerald-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">เตียงรวมว่าง</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-emerald-600">{loading ? "-" : d?.available_beds?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: เตียง ICU ทั้งหมด */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-100 group-hover:bg-teal-600 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Activity className="w-24 h-24 text-teal-600" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">เตียง ICU ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-teal-50 group-hover:bg-teal-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <Activity className="w-6 h-6 text-teal-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-800">{loading ? "-" : d?.total_icu?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: เตียง ICU ว่าง */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-100 group-hover:bg-teal-400 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <CheckCircle2 className="w-24 h-24 text-teal-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">เตียง ICU ว่าง</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-teal-50 group-hover:bg-teal-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-teal-600">{loading ? "-" : d?.available_icu?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: One OR (เคสผ่าตัดวันนี้) */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-100 group-hover:bg-amber-500 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Stethoscope className="w-24 h-24 text-amber-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">One OR (เคสผ่าตัดวันนี้)</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-amber-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <Stethoscope className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-amber-600">{loading ? "-" : d?.or_cases_today?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: คิวรอผ่าตัดสะสม */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-100 group-hover:bg-red-500 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Clock className="w-24 h-24 text-red-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">คิวรอผ่าตัดสะสม</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-red-500">{loading ? "-" : d?.or_waiting?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 7: One LR (รอคลอดวันนี้) */}
        <Card className="relative rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-100 group-hover:bg-pink-500 transition-colors"></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Baby className="w-24 h-24 text-pink-500" />
          </div>
          <CardHeader className="pb-1 pl-6 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">One LR (รอคลอดวันนี้)</CardTitle>
          </CardHeader>
          <CardContent className="pl-6 relative z-10 pb-4">
            <div className="flex items-center mt-1">
              <div className="w-12 h-12 rounded-xl bg-pink-50 group-hover:bg-pink-100 transition-colors flex items-center justify-center mr-4 shrink-0">
                <Baby className="w-6 h-6 text-pink-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-pink-600">{loading ? "-" : d?.lr_cases_today?.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-md shadow-sm border border-slate-100 lg:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold text-slate-700">อัตราการครองเตียงรวม</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {bedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value} เตียง`, '']} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-800">{bedOccupancyRate}%</span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">ครองเตียง</span>
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-500">
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>ผู้ป่วย ({bedsOccupied})</div>
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>ว่าง ({bedsAvailable})</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm border border-slate-100 lg:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold text-slate-700">อัตราการครองเตียง ICU</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={icuData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {icuData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value} เตียง`, '']} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-800">{icuOccupancyRate}%</span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">ครองเตียง</span>
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-500">
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>ผู้ป่วย ({icuOccupied})</div>
                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2"></span>ว่าง ({icuAvailable})</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm border border-slate-100 lg:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold text-slate-700">ภาระงานประจำวัน (Daily Workload)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      formatter={(value) => [`${value} เคส`, '']} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="cases" radius={[6, 6, 0, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-md shadow-sm border border-slate-100 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              สถานะทรัพยากร
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">โรงพยาบาล</th>
                  <th className="px-6 py-4 font-semibold text-center">เตียงรวม (ว่าง)</th>
                  <th className="px-6 py-4 font-semibold text-center">เตียง ICU (ว่าง)</th>
                  <th className="px-6 py-4 font-semibold text-center">One OR (เคสวันนี้)</th>
                  <th className="px-6 py-4 font-semibold text-center">คิวผ่าตัดรอ (เคส)</th>
                  <th className="px-6 py-4 font-semibold text-center">One LR (รอคลอดวันนี้)</th>
                </tr>
              </thead>
              <tbody>
                {!loading && data ? (
                  <tr className="bg-white border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-medium text-slate-800">
                      <div className="flex items-center">
                        <Hospital className="w-4 h-4 mr-2 text-teal-600" />
                        {data.hospital_name}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-slate-700">{d?.total_beds}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-bold text-emerald-600">{d?.available_beds}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-teal-700">{d?.total_icu}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-bold text-emerald-600">{d?.available_icu}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-amber-600">{d?.or_cases_today}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-red-500">{d?.or_waiting}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-pink-600">{d?.lr_cases_today}</span>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      กำลังโหลดข้อมูล...
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
