'use client';

import { useState, useEffect } from 'react';
import { sendSyncData } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Loader2, Send, RefreshCw, Key, Server, CheckCircle2, AlertCircle, Copy, Check, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MySwal = withReactContent(Swal);

export function OpohClient() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://appksn.moph.go.th/opoh/api/v1');
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ownHospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '11078';
  const ownHospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาลกมลาไสย';

  const getBangkokTime = () => {
    const d = new Date();
    const bkkTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    // มาตรฐาน ISO 8601 สำหรับเวลาประเทศไทย: YYYY-MM-DDTHH:mm:ss.sss+07:00
    return bkkTime.toISOString().replace('Z', '+07:00');
  };

  // Load API Key and Base URL from localStorage
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
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('OPOH_API_KEY', key);
    setIsSaved(true);
  };

  const handleSaveBaseUrl = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem('OPOH_BASE_URL', url);
  };

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

  useEffect(() => {
    loadRealData();
  }, []);

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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center">
            <Server className="w-8 h-8 mr-3 text-teal-600" />
            ระบบส่งข้อมูล OPOH <span className="text-teal-600 ml-2">API</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl font-medium tracking-wide">
            One Province One Hospital <span className="text-teal-600 font-bold">Data Hub</span> <span className="text-slate-300 mx-1">|</span> จังหวัดกาฬสินธุ์
          </p>
        </div>
        <Button onClick={loadRealData} variant="outline" className="bg-white hover:bg-slate-50 rounded-md border-slate-200 shadow-sm h-10 px-4">
          <RefreshCw className="w-4 h-4 mr-2 text-teal-600" />
          โหลดข้อมูลใหม่
        </Button>
      </div>

      <Card className="rounded-md border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 to-emerald-400"></div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="w-full space-y-3 md:col-span-5">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <Globe className="w-4 h-4 mr-2 text-slate-400" />
                Endpoint Base URL
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  placeholder="https://appksn.moph.go.th/opoh/api/v1" 
                  value={baseUrl}
                  onChange={(e) => handleSaveBaseUrl(e.target.value)}
                  className="w-full h-11 px-4 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-sm transition-all shadow-sm text-slate-700"
                />
              </div>
              <p className="text-xs text-slate-400">
                กำหนด Base URL
              </p>
            </div>

            <div className="w-full space-y-3 md:col-span-7">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <Key className="w-4 h-4 mr-2 text-slate-400" />
                OPOH Authentication Key (API Key)
              </label>
              <div className="relative flex items-center">
                <input 
                  type="password" 
                  placeholder="กรอก API Key เพื่อยืนยันตัวตน..." 
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  className="w-full h-11 pl-4 pr-12 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-sm transition-all shadow-sm"
                />
                {isSaved && apiKey.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-xs font-medium border border-teal-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    บันทึกแล้ว
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                API Key จะถูกเข้ารหัสและบันทึกไว้ใน Browser (LocalStorage) ของคุณอย่างปลอดภัย ไม่มีการส่งผ่านหรือเก็บไว้ที่ฐานข้อมูล
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {endpoints.map((item) => {
          const isLoading = loadingIds[item.id];
          const result = results[item.id];
          const fullEndpoint = `${baseUrl}${item.endpoint}`;

          return (
            <Card key={item.id} className="rounded-md shadow-sm border border-slate-200 flex flex-col bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-3">
                  <CardTitle className="text-lg font-bold text-slate-800">{item.title}</CardTitle>
                  <div className="flex items-stretch gap-2 h-9">
                    <div className="flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 text-[11px] uppercase font-bold tracking-wider px-3 rounded-md">
                      POST
                    </div>
                    <div className="flex-1 flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 shadow-sm group/copy hover:border-teal-300 transition-colors">
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
                <div className="bg-slate-900 text-slate-300 p-4 overflow-x-auto max-h-[300px] text-xs font-mono border-b border-slate-800">
                  <pre className="m-0">
                    {JSON.stringify(item.payload, null, 2)}
                  </pre>
                </div>

                <div className="p-4 bg-white flex flex-col gap-4">
                  <Button 
                    onClick={() => handleSend(item.id, item.endpoint, item.payload)}
                    disabled={isLoading || !apiKey}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-sm h-11 transition-all flex items-center justify-center font-semibold"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'กำลังส่งข้อมูล...' : 'ยืนยันการส่งข้อมูล'}
                  </Button>

                  {result && (
                    <div className={`p-4 rounded-md border text-sm ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <div className="flex items-center font-bold mb-2">
                        {result.success ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <AlertCircle className="w-4 h-4 mr-1.5" />}
                        Response Status: {result.status || 'Error'}
                      </div>
                      <div className="bg-white/80 rounded border border-white/40 p-3 overflow-x-auto max-h-[150px]">
                        <pre className="text-xs font-mono m-0 opacity-80">
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
        {endpoints.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-md border border-dashed border-slate-300">
            <Activity className="w-10 h-10 mx-auto text-slate-300 mb-4" />
            <p className="font-medium text-lg">ไม่พบข้อมูลสำหรับจัดเตรียมเพื่อนำส่ง</p>
            <p className="text-sm mt-1">โปรดตรวจสอบการเชื่อมต่อฐานข้อมูล HIS หรือทำการโหลดข้อมูลใหม่อีกครั้ง</p>
          </div>
        )}
      </div>
    </div>
  );
}
