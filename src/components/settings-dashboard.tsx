"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Database, Activity, Save, Loader2, Hospital, Copy, Check, Globe, Eye, EyeOff, AlertTriangle, ShieldCheck, RotateCcw, Search, KeyRound, UserCheck, ShieldAlert, RefreshCw } from "lucide-react";
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

  // MFA Users Management State
  const [mfaUsers, setMfaUsers] = useState<any[]>([]);
  const [loadingMfaUsers, setLoadingMfaUsers] = useState(false);
  const [mfaSearchQuery, setMfaSearchQuery] = useState("");
  const [resettingUser, setResettingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchEnvData();
    fetchMfaUsers();
  }, []);

  const fetchMfaUsers = async () => {
    setLoadingMfaUsers(true);
    try {
      const res = await fetch("/api/auth/mfa/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        setMfaUsers(json.users);
      }
    } catch (err) {
      console.error("Error loading MFA users:", err);
    } finally {
      setLoadingMfaUsers(false);
    }
  };

  const handleAdminResetMfa = async (user: any) => {
    const result = await MySwal.fire({
      title: `ยืนยันการรีเซ็ต MFA?`,
      html: `
        <div class="text-left text-sm space-y-2">
          <p>รีเซ็ตการยืนยันตัวตน 2 ขั้นตอน</p>
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <p class="font-bold text-slate-800">${user.full_name || user.username}</p>
            <p class="text-xs text-slate-500 font-mono">ชื่อผู้ใช้งาน: ${user.username}</p>
            <p class="text-xs text-slate-500">ตำแหน่ง: ${user.position || '-'}</p>
          </div>
          <p class="text-xs text-rose-600 font-medium pt-1">
            ข้อมูล Secret Key และรหัส Authenticator เดิมจะถูกยกเลิกและผู้ใช้จะสามารถเข้าสู่ระบบด้วยรหัสผ่านปกติได้ทันที
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      customClass: {
        container: '!z-[99999]',
        popup: 'rounded-md',
        confirmButton: 'rounded-md font-medium text-sm',
        cancelButton: 'rounded-md font-medium text-sm'
      }
    });

    if (result.isConfirmed) {
      setResettingUser(user.username);
      try {
        const res = await fetch('/api/auth/mfa/admin-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username }),
        });
        const data = await res.json();
        if (data.success) {
          MySwal.fire({
            icon: 'success',
            title: 'รีเซ็ตสำเร็จ',
            text: data.message || `รีเซ็ต MFA ของ ${user.username} เรียบร้อยแล้ว`,
            confirmButtonColor: '#0d9488',
            customClass: { container: '!z-[99999]', popup: 'rounded-md' }
          });
          fetchMfaUsers();
        } else {
          MySwal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: data.message || 'ไม่สามารถรีเซ็ตได้',
            customClass: { container: '!z-[99999]', popup: 'rounded-md' }
          });
        }
      } catch (err) {
        MySwal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'ไม่สามารถเชื่อมต่อระบบได้',
          customClass: { container: '!z-[99999]', popup: 'rounded-md' }
        });
      } finally {
        setResettingUser(null);
      }
    }
  };

  const filteredMfaUsers = mfaUsers.filter((u) => {
    if (!mfaSearchQuery.trim()) return true;
    const query = mfaSearchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(query) ||
      u.full_name?.toLowerCase().includes(query) ||
      u.position?.toLowerCase().includes(query) ||
      u.department?.toLowerCase().includes(query)
    );
  });

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

        {/* MFA User Management Section */}
        <Card className="rounded-md shadow-sm border border-slate-100 md:col-span-2 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-teal-600" />
                การจัดการผู้ใช้งาน MFA
                <Badge variant="outline" className="ml-3 bg-teal-50 text-teal-700 border-teal-200 rounded-sm px-2 py-0.5 text-xs font-semibold">
                  เปิดใช้งานแล้ว {mfaUsers.filter(u => u.is_enabled).length} คน
                </Badge>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMfaUsers}
                disabled={loadingMfaUsers}
                className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs rounded-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingMfaUsers ? 'animate-spin text-teal-600' : ''}`} />
                รีเฟรชรายชื่อ
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Search Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={mfaSearchQuery}
                  onChange={(e) => setMfaSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อผู้ใช้, ชื่อ-สกุล หรือตำแหน่ง..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  เปิดใช้งาน ({mfaUsers.filter(u => u.is_enabled).length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  รอเปิดใช้งาน ({mfaUsers.filter(u => !u.is_enabled).length})
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">ชื่อผู้ใช้งาน</th>
                    <th className="py-2.5 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-4">แผนก</th>
                    <th className="py-2.5 px-4 text-center">สถานะ</th>
                    <th className="py-2.5 px-4 text-center">รหัสกู้คืนฉุกเฉิน</th>
                    <th className="py-2.5 px-4">วันที่เปิดใช้งาน</th>
                    <th className="py-2.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMfaUsers ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                        กำลังโหลดรายชื่อผู้ใช้งาน MFA...
                      </td>
                    </tr>
                  ) : filteredMfaUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <ShieldAlert className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        {mfaSearchQuery ? 'ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา' : 'ยังไม่มีผู้ใช้งานที่เปิดระบบ MFA ในระบบ'}
                      </td>
                    </tr>
                  ) : (
                    filteredMfaUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {u.username}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {u.full_name || u.username}
                            <span className="text-[10px] px-1.5 py-0.2 font-normal rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {u.auth_source || 'HOSxP'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{u.position || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {u.department || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.is_enabled ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 font-medium rounded-md">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-2 py-0.5 font-medium rounded-md">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.has_recovery_codes ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-medium">
                              <KeyRound className="w-3 h-3 text-teal-600" />
                              {u.recovery_codes_count} รหัส
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {u.enabled_at ? new Date(u.enabled_at).toLocaleString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resettingUser === u.username}
                            onClick={() => handleAdminResetMfa(u)}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs px-2.5 py-1 h-auto rounded-md font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="รีเซ็ต MFA ให้ผู้ใช้เข้าสู่ระบบด้วยรหัสผ่านปกติ"
                          >
                            {resettingUser === u.username ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            รีเซ็ต MFA
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Admin Policy Guideline */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
                คำแนะนำมาตรฐานความปลอดภัย:
              </p>
              <p className="leading-relaxed">
                การกด <b className="text-rose-600">รีเซ็ต MFA</b> จะทำการลบ Secret Key และรหัสกู้คืนทั้งหมดของผู้ใช้งานทันที ผู้ใช้จะสามารถเข้าสู่ระบบด้วยรหัสผ่านปกติได้ และสามารถสแกน QR Code เพื่อตั้งค่า Authenticator ใหม่ได้
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
