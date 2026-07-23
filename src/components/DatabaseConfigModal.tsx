"use client";

import { useState, useEffect } from "react";
import { X, Database, Save, Activity, Server, Loader2, CheckCircle2, XCircle, TerminalSquare, Settings, Download, Copy, Check } from "lucide-react";
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
  
  const [testResults, setTestResults] = useState<{ hosxp: TestResult, local: TestResult }>({
    hosxp: { status: 'idle' },
    local: { status: 'idle' }
  });
  
  const [config, setConfig] = useState({
    hosxp: { host: "", port: "", user: "", password: "", database: "" },
    local: { host: "", port: "", user: "", password: "", database: "" },
    system: { hospitalName: "", hospitalCode: "", hospitalFullName: "" },
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
        setConfig(data);

        // Auto test initial tab if it has data
        if (activeTab === 'hosxp' || activeTab === 'local') {
          const dbConfig = data[activeTab];
          if (dbConfig.host && dbConfig.user && dbConfig.database) {
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
          [type]: { status: 'success', message: 'เชื่อมต่อฐานข้อมูลสำเร็จ (Connection Successful)' }
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
          title: "บันทึกสำเร็จ",
          text: "การเชื่อมต่อถูกบันทึกเรียบร้อยแล้ว",
          customClass: { container: '!z-[99999]' },
          timer: 3000,
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
          // Fallback for non-HTTPS environments or if Clipboard API fails
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

  const currentTestResult = activeTab !== 'system' ? testResults[activeTab] : { status: 'idle' };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Database className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold">ตั้งค่าการเชื่อมต่อฐานข้อมูลและระบบ</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Tabs */}
          <div className="flex p-1 mb-6 space-x-1 bg-slate-100/80 rounded-lg overflow-x-auto">
            <button
              onClick={() => handleTabChange("hosxp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === "hosxp" 
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              HOSxP Database
            </button>
            <button
              onClick={() => handleTabChange("local")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === "local" 
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              Local Database
            </button>
            <button
              onClick={() => handleTabChange("system")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === "system" 
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              ข้อมูลระบบ (System)
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
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">รหัสโรงพยาบาล (Hospital Code)</label>
                      <input
                        type="text"
                        value={config.system.hospitalCode}
                        onChange={(e) => handleChange("system", "hospitalCode", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="e.g., 11078"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">ชื่อย่อโรงพยาบาล (Hospital Name)</label>
                      <input
                        type="text"
                        value={config.system.hospitalName}
                        onChange={(e) => handleChange("system", "hospitalName", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="e.g., KAMALASAI"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">ชื่อเต็มโรงพยาบาล (Hospital Full Name)</label>
                      <input
                        type="text"
                        value={config.system.hospitalFullName}
                        onChange={(e) => handleChange("system", "hospitalFullName", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="e.g., โรงพยาบาลกมลาไสย"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Host (IP Address)</label>
                        <input
                          type="text"
                          value={config[activeTab].host}
                          onChange={(e) => handleChange(activeTab, "host", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="e.g., 192.168.1.100 or 127.0.0.1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Port</label>
                        <input
                          type="text"
                          value={config[activeTab].port}
                          onChange={(e) => handleChange(activeTab, "port", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="e.g., 3306"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Database Name</label>
                      <input
                        type="text"
                        value={config[activeTab].database}
                        onChange={(e) => handleChange(activeTab, "database", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        placeholder="e.g., hosxp or db_opoh"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Username</label>
                        <input
                          type="text"
                          value={config[activeTab].user}
                          onChange={(e) => handleChange(activeTab, "user", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="e.g., root"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Password</label>
                        <input
                          type="password"
                          value={config[activeTab].password}
                          onChange={(e) => handleChange(activeTab, "password", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {activeTab === "local" && (
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center">
                              <Database className="w-4 h-4 mr-2 text-teal-600" />
                              โครงสร้างฐานข้อมูล (Database Schema)
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              ไฟล์ db_opoh.sql สำหรับนำไปติดตั้งใน Local Database (MariaDB/MySQL)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleCopySql}
                              className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold transition-colors flex items-center shadow-sm"
                            >
                              {copiedSql ? <Check className="w-4 h-4 mr-1.5 text-teal-600" /> : <Copy className="w-4 h-4 mr-1.5 text-slate-400" />}
                              {copiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
                            </button>
                            <a
                              href="/api/db-schema?download=true"
                              download="db_opoh.sql"
                              className="h-9 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-md text-xs font-semibold transition-colors flex items-center shadow-sm"
                            >
                              <Download className="w-4 h-4 mr-1.5" />
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
                  <div className={`mt-4 rounded-md border p-4 transition-all duration-300 ${
                    currentTestResult.status === 'success' ? 'bg-teal-50 border-teal-200' :
                    currentTestResult.status === 'error' ? 'bg-rose-50 border-rose-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {currentTestResult.status === 'testing' && <Loader2 className="w-5 h-5 text-slate-500 animate-spin shrink-0 mt-0.5" />}
                      {currentTestResult.status === 'success' && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />}
                      {currentTestResult.status === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold mb-1 ${
                          currentTestResult.status === 'success' ? 'text-teal-800' :
                          currentTestResult.status === 'error' ? 'text-rose-800' :
                          'text-slate-700'
                        }`}>
                          {currentTestResult.status === 'testing' ? 'กำลังทดสอบการเชื่อมต่อ...' :
                           currentTestResult.status === 'success' ? 'การเชื่อมต่อสำเร็จ' :
                           'การเชื่อมต่อล้มเหลว'}
                        </h4>
                        
                        {(currentTestResult.status === 'error' || currentTestResult.status === 'success') && (
                          <div className="mt-2 flex items-start gap-2 bg-black/5 rounded p-2.5 overflow-x-auto">
                            <TerminalSquare className={`w-4 h-4 shrink-0 mt-0.5 ${
                               currentTestResult.status === 'success' ? 'text-teal-600' : 'text-rose-600'
                            }`} />
                            <code className={`text-sm whitespace-pre-wrap break-words font-sans ${
                               currentTestResult.status === 'success' ? 'text-teal-700' : 'text-rose-700'
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

          <div className="mt-8 flex items-center justify-between">
            {activeTab !== 'system' ? (
              <button
                type="button"
                onClick={() => handleTestConnection(activeTab)}
                disabled={loading || currentTestResult.status === 'testing'}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 border border-slate-200"
              >
                {currentTestResult.status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                ทดสอบการเชื่อมต่อ {activeTab.toUpperCase()}
              </button>
            ) : (
              <div></div> // Empty div for spacing when test button is hidden
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || currentTestResult.status === 'testing'}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {(loading && currentTestResult.status === 'idle') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
