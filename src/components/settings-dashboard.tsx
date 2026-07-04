"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Database, Activity, Save, Loader2, Hospital, Copy, Check, Globe, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export function SettingsDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hospitalCodeInputRef = useRef<HTMLInputElement>(null);
  const [testingHos, setTestingHos] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [statusHos, setStatusHos] = useState<'idle' | 'online' | 'offline'>('idle');
  const [statusLocal, setStatusLocal] = useState<'idle' | 'online' | 'offline'>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [envData, setEnvData] = useState<Record<string, string>>({
    NEXT_PUBLIC_HOSPITAL_NAME: "",
    NEXT_PUBLIC_HOSPITAL_CODE: "",
    NEXT_PUBLIC_HOSPITAL_FULL_NAME: "",
    API_KEY: "",
    API_KEY_CREATED_AT: "",
    LOCAL_DB_HOST: "",
    LOCAL_DB_PORT: "",
    LOCAL_DB_USER: "",
    LOCAL_DB_PASSWORD: "",
    LOCAL_DB_NAME: "",
    HOSXP_DB_HOST: "",
    HOSXP_DB_PORT: "",
    HOSXP_DB_USER: "",
    HOSXP_DB_PASSWORD: "",
    HOSXP_DB_NAME: "",
  });

  useEffect(() => {
    fetchEnvData();
  }, []);

  const fetchEnvData = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        setEnvData(prev => ({ ...prev, ...json.data }));
        // ทดสอบการเชื่อมต่ออัตโนมัติเมื่อโหลดหน้า
        if (json.data.HOSXP_DB_HOST) handleTestConnection('hosxp', json.data, true);
        if (json.data.LOCAL_DB_HOST) handleTestConnection('local', json.data, true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEnvData(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'API_KEY' && prev.API_KEY !== value) {
        next.API_KEY_CREATED_AT = new Date().toISOString();
      }
      return next;
    });
    setIsDirty(true);
  };

  const getApiKeyDays = () => {
    if (!envData.API_KEY_CREATED_AT || !envData.API_KEY?.trim()) return 0;
    try {
      const created = new Date(envData.API_KEY_CREATED_AT);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSave(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [envData, isDirty]);

  const handleTestConnection = async (type: 'local' | 'hosxp', overrideData?: Record<string, string>, silent = false) => {
    const isLocal = type === 'local';
    const prefix = isLocal ? 'LOCAL_DB_' : 'HOSXP_DB_';
    const setTesting = isLocal ? setTestingLocal : setTestingHos;
    const setStatus = isLocal ? setStatusLocal : setStatusHos;
    const dataToUse = overrideData || envData;
    
    setTesting(true);
    setStatus('idle');
    try {
      const res = await fetch("/api/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dataToUse[`${prefix}HOST`],
          port: dataToUse[`${prefix}PORT`],
          user: dataToUse[`${prefix}USER`],
          password: dataToUse[`${prefix}PASSWORD`],
          database: dataToUse[`${prefix}NAME`],
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatus('online');
        if (!silent) MySwal.fire('สำเร็จ!', json.message, 'success');
      } else {
        setStatus('offline');
        if (!silent) MySwal.fire('ข้อผิดพลาด', json.message, 'error');
      }
    } catch (err) {
      setStatus('offline');
      if (!silent) MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyKey = () => {
    if (envData.API_KEY) {
      navigator.clipboard.writeText(envData.API_KEY);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envData)
      });
      const json = await res.json();
      if (!silent) {
        if (json.success) {
          MySwal.fire('บันทึกสำเร็จ!', json.message, 'success');
        } else {
          MySwal.fire('ข้อผิดพลาด', json.message, 'error');
        }
      }
    } catch (err) {
      if (!silent) MySwal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setSaving(false);
      setIsDirty(false);
    }
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center text-slate-400">กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-slate-600" />
            ตั้งค่าระบบ (System Settings)
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            จัดการการเชื่อมต่อฐานข้อมูลและตั้งค่าพื้นฐานของโปรแกรม
          </p>
        </div>
        <div>
          <Button onClick={() => handleSave()} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-md">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="rounded-md shadow-sm border border-slate-100 md:col-span-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
              <Hospital className="w-5 h-5 mr-2 text-teal-600" />
              การตั้งค่าทั่วไป
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  รหัสหน่วยบริการ 5 หลัก
                  {envData.NEXT_PUBLIC_HOSPITAL_CODE?.trim().length === 5 ? (
                    <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-600 border-teal-200 rounded-md px-1.5 py-0 text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 border-red-200 rounded-md px-1.5 py-0 text-[10px]">Required</Badge>
                  )}
                </label>
                <input
                  ref={hospitalCodeInputRef}
                  type="text"
                  maxLength={5}
                  value={envData.NEXT_PUBLIC_HOSPITAL_CODE || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    handleChange("NEXT_PUBLIC_HOSPITAL_CODE", val);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="เช่น 11078"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  ชื่อเต็มโรงพยาบาล
                  {envData.NEXT_PUBLIC_HOSPITAL_FULL_NAME?.trim() ? (
                    <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-600 border-teal-200 rounded-md px-1.5 py-0 text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 border-red-200 rounded-md px-1.5 py-0 text-[10px]">Required</Badge>
                  )}
                </label>
                <input
                  type="text"
                  value={envData.NEXT_PUBLIC_HOSPITAL_FULL_NAME || ""}
                  onChange={(e) => handleChange("NEXT_PUBLIC_HOSPITAL_FULL_NAME", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="เช่น โรงพยาบาลกมลาไสย"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  ชื่อย่อโรงพยาบาล
                  {envData.NEXT_PUBLIC_HOSPITAL_NAME?.trim() ? (
                    <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-600 border-teal-200 rounded-md px-1.5 py-0 text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-600 border-yellow-200 rounded-md px-1.5 py-0 text-[10px]">Undefined</Badge>
                  )}
                </label>
                <input
                  type="text"
                  value={envData.NEXT_PUBLIC_HOSPITAL_NAME || ""}
                  onChange={(e) => handleChange("NEXT_PUBLIC_HOSPITAL_NAME", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="เช่น KALASIN"
                />
                <p className="text-xs text-slate-500">
                  แสดงต่อท้ายโลโก้ OPOH (เช่น OPOH <span className="text-teal-600 font-bold">{envData.NEXT_PUBLIC_HOSPITAL_NAME || 'KALASIN'}</span>)
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  API Key
                  {envData.API_KEY?.trim() ? (
                    <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-600 border-teal-200 rounded-md px-1.5 py-0 text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-600 border-yellow-200 rounded-md px-1.5 py-0 text-[10px]">Undefined</Badge>
                  )}
                  {envData.API_KEY?.trim() && envData.API_KEY_CREATED_AT && (
                    <span className="ml-2 text-xs text-slate-500 font-normal">
                      (ใช้งานมาแล้ว {getApiKeyDays()} วัน)
                    </span>
                  )}
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={envData.API_KEY || ""}
                      onChange={(e) => handleChange("API_KEY", e.target.value)}
                      className="w-full h-10 pl-3 pr-10 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 font-mono"
                      placeholder="รหัสผ่านสำหรับ สสจ. ดึงข้อมูล"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const randomKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                      handleChange("API_KEY", randomKey);
                    }}
                    className="h-10 rounded-md border-slate-200"
                  >
                    Generate
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCopyKey}
                    title="คัดลอก API Key"
                    className="h-10 w-10 p-0 rounded-md border-slate-200 text-slate-500 hover:text-teal-600"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">รหัสสำหรับยืนยันตัวตนการส่งออกข้อมูล</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-teal-600" />
                  API Endpoint
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {(!envData.NEXT_PUBLIC_HOSPITAL_CODE?.trim() || envData.NEXT_PUBLIC_HOSPITAL_CODE.trim().length !== 5 || !envData.NEXT_PUBLIC_HOSPITAL_FULL_NAME?.trim()) ? (
                    <button 
                      type="button"
                      onClick={() => hospitalCodeInputRef.current?.focus()}
                      className="flex-1 w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-md px-4 py-2.5 text-sm flex items-center transition-colors text-left"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                      <span>กรุณากำหนดรหัสหน่วยบริการ 5 หลักและชื่อเต็มโรงพยาบาล ก่อนเข้าถึง API Endpoint</span>
                    </button>
                  ) : (
                    <>
                      <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 font-mono text-sm text-slate-600 break-all select-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/opoh/all` : '/api/opoh/all'}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                           if (typeof window !== 'undefined') {
                             navigator.clipboard.writeText(`${window.location.origin}/api/opoh/all`);
                             MySwal.fire({ title: 'คัดลอก URL สำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-xl' } });
                           }
                        }}
                        className="w-full sm:w-auto h-[42px] px-6 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md transition-all shadow-sm"
                      >
                        <Copy className="w-4 h-4 mr-2 text-teal-600" />
                        คัดลอก
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* HOSxP DB Settings */}
        <Card className="rounded-md shadow-sm border border-slate-100">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                <Database className="w-5 h-5 mr-2 text-teal-600" />
                ฐานข้อมูล HIS
                {statusHos === 'online' && <Badge variant="outline" className="ml-3 bg-emerald-50 text-emerald-600 border-emerald-200 rounded-md px-2 py-0.5">Connected</Badge>}
                {statusHos === 'offline' && <Badge variant="outline" className="ml-3 bg-red-50 text-red-600 border-red-200 rounded-md px-2 py-0.5">Disconnected</Badge>}
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleTestConnection('hosxp')} disabled={testingHos} className="border-teal-200 text-teal-700 hover:bg-teal-50">
              {testingHos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              ทดสอบการเชื่อมต่อ
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Host (IP Address)</label>
                <input type="text" value={envData.HOSXP_DB_HOST || ""} onChange={(e) => handleChange("HOSXP_DB_HOST", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Port</label>
                <input type="text" value={envData.HOSXP_DB_PORT || ""} onChange={(e) => handleChange("HOSXP_DB_PORT", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Database Name</label>
                <input type="text" value={envData.HOSXP_DB_NAME || ""} onChange={(e) => handleChange("HOSXP_DB_NAME", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Username</label>
                <input type="text" value={envData.HOSXP_DB_USER || ""} onChange={(e) => handleChange("HOSXP_DB_USER", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input type="password" value={envData.HOSXP_DB_PASSWORD || ""} onChange={(e) => handleChange("HOSXP_DB_PASSWORD", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local DB Settings */}
        <Card className="rounded-md shadow-sm border border-slate-100">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                <Database className="w-5 h-5 mr-2 text-slate-600" />
                ฐานข้อมูล OPOH
                {statusLocal === 'online' && <Badge variant="outline" className="ml-3 bg-emerald-50 text-emerald-600 border-emerald-200 rounded-md px-2 py-0.5">Connected</Badge>}
                {statusLocal === 'offline' && <Badge variant="outline" className="ml-3 bg-red-50 text-red-600 border-red-200 rounded-md px-2 py-0.5">Disconnected</Badge>}
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleTestConnection('local')} disabled={testingLocal} className="border-slate-200 text-slate-700 hover:bg-slate-100">
              {testingLocal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              ทดสอบการเชื่อมต่อ
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Host (IP Address)</label>
                <input type="text" value={envData.LOCAL_DB_HOST || ""} onChange={(e) => handleChange("LOCAL_DB_HOST", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Port</label>
                <input type="text" value={envData.LOCAL_DB_PORT || ""} onChange={(e) => handleChange("LOCAL_DB_PORT", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Database Name</label>
                <input type="text" value={envData.LOCAL_DB_NAME || ""} onChange={(e) => handleChange("LOCAL_DB_NAME", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Username</label>
                <input type="text" value={envData.LOCAL_DB_USER || ""} onChange={(e) => handleChange("LOCAL_DB_USER", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input type="password" value={envData.LOCAL_DB_PASSWORD || ""} onChange={(e) => handleChange("LOCAL_DB_PASSWORD", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
