"use client";

import { useState, useEffect } from "react";
import {
  X,
  Database,
  Save,
  Activity,
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  TerminalSquare,
  Settings,
  Download,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Globe
} from "lucide-react";
import Swal from "sweetalert2";

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message?: string;
}

export default function DatabaseConfigModal({ isOpen, onClose }: DatabaseConfigModalProps) {
  const [activeTab, setActiveTab] = useState<"hosxp" | "local" | "system">("hosxp");
  const [loading, setLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [testResults, setTestResults] = useState<{ hosxp: TestResult, local: TestResult }>({
    hosxp: { status: 'idle' },
    local: { status: 'idle' }
  });

  const [config, setConfig] = useState({
    hosxp: { host: "", port: "3306", user: "", password: "", database: "" },
    local: { host: "127.0.0.1", port: "3306", user: "root", password: "", database: "db_opoh" },
    system: {
      hospitalName: "",
      hospitalCode: "",
      hospitalFullName: "",
      apiKey: "",
      opohBaseUrl: "https://appksn.moph.go.th/opoh/api/v1",
      appPort: "3000"
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setTestResults({
        hosxp: { status: 'idle' },
        local: { status: 'idle' }
      });
      setActiveTab("hosxp");
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({
          hosxp: { ...prev.hosxp, ...data.hosxp },
          local: { ...prev.local, ...data.local },
          system: { ...prev.system, ...data.system },
        }));

        // Auto test initial tab if it has connection credentials
        if (activeTab === 'hosxp' || activeTab === 'local') {
          const dbConfig = data[activeTab];
          if (dbConfig && dbConfig.host && dbConfig.user && dbConfig.database) {
            handleTestConnection(activeTab, dbConfig);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: "hosxp" | "local" | "system") => {
    setActiveTab(tab);

    if (tab === "hosxp" || tab === "local") {
      const dbConfig = config[tab];
      const hasData = dbConfig.host && dbConfig.user && dbConfig.database;
      if (hasData && testResults[tab].status === 'idle') {
        handleTestConnection(tab, dbConfig);
      }
    }
  };

  const handleChange = (type: "hosxp" | "local" | "system", field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type as keyof typeof prev],
        [field]: value,
      },
    }));
    if (type !== 'system' && testResults[type as "hosxp" | "local"].status !== 'idle') {
      setTestResults(prev => ({
        ...prev,
        [type]: { status: 'idle' }
      }));
    }
  };

  const generateApiKey = () => {
    // Generate secure 24-character random alphanumeric key
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    const array = new Uint8Array(24);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < 24; i++) {
        key += chars[array[i] % chars.length];
      }
    } else {
      key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    handleChange("system", "apiKey", key);
  };

  const handleCopyApiKey = async () => {
    if (!config.system.apiKey) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(config.system.apiKey);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = config.system.apiKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const handleTestConnection = async (type: "hosxp" | "local", overrideConfig?: any) => {
    setTestResults(prev => ({
      ...prev,
      [type]: { status: 'testing' }
    }));

    const dbConfig = overrideConfig || config[type];

    try {
      const res = await fetch("/api/db-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const data = await res.json();

      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [type]: { status: 'success', message: data.message || 'เชื่อมต่อฐานข้อมูลสำเร็จ (Connection Successful)' }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [type]: { status: 'error', message: data.error || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Unknown Error)" }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [type]: { status: 'error', message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย (Network Error)" }
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "บันทึกการตั้งค่าสำเร็จ",
          html: `
            <div class="text-left text-sm text-slate-600 space-y-1.5 mt-2">
              <p>✔ บันทึกลงไฟล์ <code>.env</code> ของระบบเรียบร้อย</p>
              <p>✔ อัปเดต In-Memory Process Environment ทันที</p>
              <p>✔ Hot-Reload Database Connection Pools พร้อมใช้งาน</p>
              <p class="text-xs text-teal-600 font-semibold pt-1">ผู้ใช้งานสามารถเข้าสู่ระบบผ่าน HOSxP ได้ทันทีโดยไม่ต้อง Restart Server</p>
            </div>
          `,
          customClass: { container: '!z-[99999]' },
          timer: 3500,
          timerProgressBar: true
        }).then(() => {
          onClose();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "บันทึกล้มเหลว",
          text: data.error || "ไม่สามารถบันทึกการตั้งค่าได้",
          customClass: { container: '!z-[99999]' }
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกการตั้งค่าได้",
        customClass: { container: '!z-[99999]' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = async () => {
    try {
      const res = await fetch("/api/db-schema");
      if (res.ok) {
        const text = await res.text();

        let success = false;
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(text);
            success = true;
          } catch (err) {
            console.warn("Clipboard API failed:", err);
          }
        }

        if (!success) {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "0";
          textArea.style.top = "0";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            success = document.execCommand('copy');
          } catch (err) {
            console.error('Fallback copy failed', err);
          }
          document.body.removeChild(textArea);
        }

        if (success) {
          setCopiedSql(true);
          setTimeout(() => setCopiedSql(false), 2000);
        } else {
          Swal.fire({
            icon: "error",
            title: "คัดลอกไม่สำเร็จ",
            text: "เบราว์เซอร์ของคุณปิดกั้นการคัดลอก กรุณาใช้ปุ่มดาวน์โหลดแทน",
            customClass: { container: '!z-[99999]' }
          });
        }
      } else {
        throw new Error("API returned " + res.status);
      }
    } catch (err: any) {
      console.error("Failed to copy SQL", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูล SQL ได้",
        customClass: { container: '!z-[99999]' }
      });
    }
  };

  if (!isOpen) return null;

  const currentTestResult: TestResult = activeTab !== 'system' ? testResults[activeTab] : { status: 'idle' };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200/80">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 text-teal-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                ตั้งค่าการเชื่อมต่อฐานข้อมูลและระบบ
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-teal-100/70 text-teal-700 rounded-md">
                  Config
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดค่าเชื่อมต่อผ่าน Interface และบันทึกลง <code>.env</code> อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Tabs */}
          <div className="flex p-1 mb-5 space-x-1.5 bg-slate-100/80 rounded-xl overflow-x-auto border border-slate-200/50">
            <button
              onClick={() => handleTabChange("hosxp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === "hosxp"
                ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
            >
              <Activity className="w-4 h-4 shrink-0 text-teal-600" />
              <span>ฐานข้อมูล HOSxP</span>
              {testResults.hosxp.status === 'success' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("local")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === "local"
                ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
            >
              <Server className="w-4 h-4 shrink-0 text-teal-600" />
              <span>ฐานข้อมูลระบบ</span>
              {testResults.local.status === 'success' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("system")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === "system"
                ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-teal-600" />
              <span>ข้อมูลระบบ</span>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {loading && config.hosxp.host === "" ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
                <p className="text-sm">กำลังโหลดข้อมูลการตั้งค่า...</p>
              </div>
            ) : (
              <>
                {activeTab === "system" ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          รหัสโรงพยาบาล 5 หลัก
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={config.system.hospitalCode}
                          onChange={(e) => handleChange("system", "hospitalCode", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                          placeholder="e.g. 11078"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          ชื่อย่อโรงพยาบาล (EN)
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={config.system.hospitalName}
                          onChange={(e) => handleChange("system", "hospitalName", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase transition-all"
                          placeholder="e.g. KAMALASAI"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Port
                        </label>
                        <input
                          type="text"
                          value={config.system.appPort}
                          onChange={(e) => handleChange("system", "appPort", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                          placeholder="3000"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        ชื่อเต็มโรงพยาบาล (TH)
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={config.system.hospitalFullName}
                        onChange={(e) => handleChange("system", "hospitalFullName", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="e.g. โรงพยาบาลกมลาไสย"
                      />
                    </div>

                    {/* API Key */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                          <a href="https://appksn.moph.go.th/opoh/" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold text-[11px]">OPOH</a> API Key <span className="text-slate-500 font-normal text-[11px]">(ไม่จำเป็นต้องกำหนด)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={generateApiKey}
                            className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded font-medium transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Generate
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          value={config.system.apiKey}
                          onChange={(e) => handleChange("system", "apiKey", e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="••••••••"
                        />
                        <div className="absolute inset-y-0 right-1 flex items-center pr-1.5">
                          <button
                            type="button"
                            onClick={handleCopyApiKey}
                            disabled={!config.system.apiKey}
                            className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors disabled:opacity-40"
                            title="คัดลอก Key"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OPOH Base URL */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-teal-600" />
                        <a href="https://appksn.moph.go.th/opoh/" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold text-[11px]">OPOH</a> URL Endpoint
                      </label>
                      <input
                        type="text"
                        value={config.system.opohBaseUrl}
                        onChange={(e) => handleChange("system", "opohBaseUrl", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="https://appksn.moph.go.th/opoh/api/v1"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Host / IP Address</label>
                        <input
                          type="text"
                          value={config[activeTab].host}
                          onChange={(e) => handleChange(activeTab, "host", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder={activeTab === 'hosxp' ? "10.250.100.200 or 192.168.1.x" : "127.0.0.1"}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Port</label>
                        <input
                          type="text"
                          value={config[activeTab].port}
                          onChange={(e) => handleChange(activeTab, "port", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="3306"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Database Name</label>
                      <input
                        type="text"
                        value={config[activeTab].database}
                        onChange={(e) => handleChange(activeTab, "database", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder={activeTab === 'hosxp' ? "hos (or hosxp)" : "db_opoh"}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Username</label>
                        <input
                          type="text"
                          value={config[activeTab].user}
                          onChange={(e) => handleChange(activeTab, "user", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder={activeTab === 'hosxp' ? "select (readonly user)" : "root"}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Password</label>
                        <input
                          type="password"
                          value={config[activeTab].password}
                          onChange={(e) => handleChange(activeTab, "password", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {activeTab === "local" && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-teal-600" />
                              โครงสร้างฐานข้อมูล (Schema)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              ไฟล์ <code>db_opoh.sql</code> สำหรับติดตั้งตารางใน MariaDB/MySQL
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleCopySql}
                              className="h-8 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center shadow-sm"
                            >
                              {copiedSql ? <Check className="w-3.5 h-3.5 mr-1 text-teal-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />}
                              {copiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
                            </button>
                            <a
                              href="/api/db-schema?download=true"
                              download="db_opoh.sql"
                              className="h-8 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-medium transition-colors flex items-center shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              ดาวน์โหลด
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Debug Status Console */}
                {activeTab !== 'system' && currentTestResult.status !== 'idle' && (
                  <div className={`mt-3 rounded-xl border p-3.5 transition-all duration-300 ${currentTestResult.status === 'success' ? 'bg-teal-50/80 border-teal-200' :
                    currentTestResult.status === 'error' ? 'bg-rose-50/80 border-rose-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="flex items-start gap-2.5">
                      {currentTestResult.status === 'testing' && <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0 mt-0.5" />}
                      {currentTestResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
                      {currentTestResult.status === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}

                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold ${currentTestResult.status === 'success' ? 'text-teal-800' :
                          currentTestResult.status === 'error' ? 'text-rose-800' :
                            'text-slate-700'
                          }`}>
                          {currentTestResult.status === 'testing' ? 'กำลังทดสอบการเชื่อมต่อ...' :
                            currentTestResult.status === 'success' ? 'การเชื่อมต่อฐานข้อมูลสำเร็จ' :
                              'การเชื่อมต่อล้มเหลว'}
                        </h4>

                        {(currentTestResult.status === 'error' || currentTestResult.status === 'success') && (
                          <div className="mt-1.5 flex items-start gap-2 bg-black/5 rounded-lg p-2 overflow-x-auto">
                            <TerminalSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${currentTestResult.status === 'success' ? 'text-teal-600' : 'text-rose-600'
                              }`} />
                            <code className={`text-xs whitespace-pre-wrap break-words font-mono ${currentTestResult.status === 'success' ? 'text-teal-700' : 'text-rose-700'
                              }`}>
                              {currentTestResult.message}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            {activeTab !== 'system' ? (
              <button
                type="button"
                onClick={() => handleTestConnection(activeTab)}
                disabled={loading || currentTestResult.status === 'testing'}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 border border-slate-200 shadow-sm"
              >
                {currentTestResult.status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-teal-600" />}
                ทดสอบการเชื่อมต่อฐานข้อมูล
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ระบบบันทึกลง <code>.env</code> อัตโนมัติ
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || currentTestResult.status === 'testing'}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {(loading && currentTestResult.status === 'idle') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
