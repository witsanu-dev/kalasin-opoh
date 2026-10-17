"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Loader2, Hospital, Activity, Terminal, Database, HospitalIcon, ArrowLeft, Smartphone, KeyRound, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import DatabaseConfigModal from '@/components/DatabaseConfigModal';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'connecting' | 'offline' | 'checking'>('checking');
  const [dbDetails, setDbDetails] = useState<any>(null);
  const router = useRouter();

  const checkDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/db-config/test');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.status || 'offline');
        setDbDetails(data);
      } else {
        setDbStatus('offline');
      }
    } catch {
      setDbStatus('offline');
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  useEffect(() => {
    // Load remembered credentials on mount
    const savedUsername = localStorage.getItem('opoh_username');
    const savedPassword = localStorage.getItem('opoh_password');
    if (savedUsername && savedPassword) {
      setUsername(atob(savedUsername));
      setPassword(atob(savedPassword));
      setRememberMe(true);
    }
  }, []);

  const showAlert = (message: string, icon: 'error' | 'success' | 'warning' = 'error') => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-md',
      }
    });
  };

  const [requireMfa, setRequireMfa] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaUserFullName, setMfaUserFullName] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showAlert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.requireMfa) {
          setRequireMfa(true);
          setMfaToken(data.mfaToken);
          setMfaUserFullName(data.fullName || data.username);
          setMfaOtp('');
          return;
        }

        // Save or clear credentials based on rememberMe
        if (rememberMe) {
          localStorage.setItem('opoh_username', btoa(username));
          localStorage.setItem('opoh_password', btoa(password));
        } else {
          localStorage.removeItem('opoh_username');
          localStorage.removeItem('opoh_password');
        }

        router.push('/');
        router.refresh();
      } else {
        showAlert(data.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showAlert('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaOtp || mfaOtp.trim().length !== 6) {
      showAlert('กรุณากรอกรหัส 6 หลักจาก Google Authenticator', 'warning');
      return;
    }

    setMfaLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, token: mfaOtp.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('opoh_username', btoa(username));
          localStorage.setItem('opoh_password', btoa(password));
        } else {
          localStorage.removeItem('opoh_username');
          localStorage.removeItem('opoh_password');
        }
        router.push('/');
        router.refresh();
      } else {
        showAlert(data.message || 'รหัสยืนยันไม่ถูกต้อง', 'error');
      }
    } catch {
      showAlert('เกิดข้อผิดพลาดในการตรวจสอบรหัส MFA', 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = recoveryCode.trim();
    if (!cleanCode) {
      showAlert('กรุณากรอกรหัสกู้คืนฉุกเฉิน (Recovery Code)', 'warning');
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/recovery-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, recoveryCode: cleanCode }),
      });

      const data = await res.json();
      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('opoh_username', btoa(username));
          localStorage.setItem('opoh_password', btoa(password));
        } else {
          localStorage.removeItem('opoh_username');
          localStorage.removeItem('opoh_password');
        }

        await Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          text: 'ระบบได้รีเซ็ต MFA ให้คุณเข้าใช้งานได้แล้ว กรุณาไปที่เมนูตั้งค่าความปลอดภัยเพื่อผูกแอป Authenticator ใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#0d9488',
          customClass: { popup: 'rounded-md' }
        });

        router.push('/');
        router.refresh();
      } else {
        showAlert(data.message || 'รหัสกู้คืนไม่ถูกต้อง หรือถูกใช้งานไปแล้ว', 'error');
      }
    } catch {
      showAlert('เกิดข้อผิดพลาดในการตรวจสอบรหัสกู้คืน', 'error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] font-sans selection:bg-teal-100 selection:text-teal-900 relative px-4 py-12">

      {/* Main Container */}
      <div className="w-full max-w-sm z-10 flex flex-col">

        {/* Top Header Logo & Text */}
        <div className="flex flex-col items-center mb-8 z-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 uppercase">
            OPOH <span className="text-[#0d9488]">{process.env.NEXT_PUBLIC_HOSPITAL_NAME || "KALASIN"}</span>
          </h1>
          <div className="mt-2.5">
            <span className="bg-teal-50/80 text-teal-700 border border-teal-100/80 text-sm px-4 py-2 font-bold rounded-md tracking-wider uppercase flex items-center gap-2">
              <img
                src="https://bdh.moph.go.th/site/wp-content/uploads/2022/12/cropped-logo-MOPH.png"
                alt="MOPH Logo"
                className="h-5 w-5 object-contain"
              />
              One Province One Hospital
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-7 sm:p-8 flex flex-col">
          {requireMfa ? (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setRequireMfa(false);
                    setIsRecoveryMode(false);
                  }}
                  className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  ย้อนกลับ
                </button>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md border border-teal-200">
                  {isRecoveryMode ? 'MFA Recovery' : '2-Step MFA'}
                </span>
              </div>

              {isRecoveryMode ? (
                /* Recovery Code Form */
                <div className="space-y-4">
                  <div className="text-center py-1">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-sm">
                      <KeyRound className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      เข้าสู่ระบบฉุกเฉินด้วยรหัสกู้คืน
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      ระบุรหัสกู้คืนสำรอง (Recovery Code) เช่น <span className="font-mono font-semibold text-slate-700">XXXX-XXXX</span>
                    </p>
                  </div>

                  <form onSubmit={handleRecoveryLogin} className="space-y-3">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        maxLength={12}
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        autoFocus
                        disabled={recoveryLoading}
                        className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-md text-center text-lg font-mono font-bold tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] focus:bg-white transition-all"
                      />
                      <p className="text-[11px] text-center text-slate-400">
                        เมื่อใช้รหัสกู้คืน ระบบจะรีเซ็ต MFA ให้เข้าสู่ระบบได้ทันที
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading || !recoveryCode.trim()}
                      className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    >
                      {recoveryLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      <span>ยืนยันและรีเซ็ต MFA</span>
                    </button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setIsRecoveryMode(false)}
                        className="text-xs text-slate-500 hover:text-teal-700 font-medium transition-colors"
                      >
                        ← สลับกลับไปใช้รหัส 6 หลักจาก Authenticator
                      </button>
                    </div>

                    {/* Notice for contacting admin if codes are lost */}
                    <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-md text-[11px] text-amber-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1 text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        หากไม่มีรหัสกู้คืน หรือเผลอลบแอป:
                      </p>
                      <p className="text-amber-700 leading-relaxed">
                        โปรดติดต่อผู้ดูแลระบบ (Admin) เพื่อทำรายการ <b>"รีเซ็ต MFA"</b> ให้ที่หน้าเมนูตั้งค่าระบบ
                      </p>
                    </div>
                  </form>
                </div>
              ) : (
                /* Normal TOTP 6-digit Form */
                <>
                  <div className="text-center py-1">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center mx-auto mb-2 border border-teal-100 shadow-sm">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      ยืนยันตัวตนด้วย Google Authenticator
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      กรุณากรอกรหัสยืนยัน 6 หลักสำหรับบัญชี <span className="font-semibold text-slate-700">{mfaUserFullName || username}</span>
                    </p>
                  </div>

                  <form onSubmit={handleVerifyMfaLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaOtp}
                        onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        autoFocus
                        disabled={mfaLoading}
                        className="w-full py-3 bg-slate-50 border border-slate-300 rounded-md text-center text-2xl font-mono font-bold tracking-[0.35em] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] focus:bg-white transition-all"
                      />
                      <p className="text-[11px] text-center text-slate-400">
                        รหัสจะเปลี่ยนใหม่ทุก 30 วินาทีในแอปพลิเคชัน
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={mfaLoading || mfaOtp.length !== 6}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#0f766e] to-[#0d9488] hover:from-[#0d9488] hover:to-[#14b8a6] text-white rounded-md font-bold shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 group"
                    >
                      {mfaLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                      <span className="text-[15px] tracking-wide">ยืนยันรหัส OTP</span>
                    </button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryMode(true);
                          setRecoveryCode('');
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800 hover:underline font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        ไม่สามารถเข้าถึงแอปได้? เข้าสู่ระบบด้วยรหัสกู้คืน
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-center">
                <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200/80 inline-flex items-center gap-1.5 shadow-sm">
                  <Hospital className="w-3.5 h-3.5 text-teal-600" /> เข้าสู่ระบบด้วยบัญชี HOSxP
                </span>
              </div>

              <form onSubmit={handleLogin} className="w-full space-y-4">

                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] focus:bg-white transition-all text-sm font-medium"
                      placeholder="ชื่อผู้ใช้งาน"
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 mb-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] focus:bg-white transition-all text-sm font-medium"
                      placeholder="รหัสผ่าน"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center mt-3 mb-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                        disabled={loading}
                      />
                      <div className="w-4 h-4 border-2 border-slate-300 rounded-[4px] peer-checked:bg-[#0d9488] peer-checked:border-[#0d9488] transition-all bg-white flex items-center justify-center">
                        <svg className="w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                      จดจำชื่อผู้ใช้และรหัสผ่าน
                    </span>
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#0f766e] to-[#0d9488] hover:from-[#0d9488] hover:to-[#14b8a6] text-white rounded-md font-bold shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Activity className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    )}
                    <span className="text-[15px] tracking-wide">เข้าสู่ระบบ</span>
                  </button>
                </div>
              </form>
            </>
          )}

            {/* Provider ID SSO Button (Hidden temporarily as requested) */}
            {/*
            <div className="relative mt-6 mb-2 pt-2">
              <div className="absolute inset-0 flex items-center mt-2">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium tracking-wide">หรือเข้าสู่ระบบด้วย</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-slate-700 rounded-md font-medium shadow-sm transition-all flex items-center justify-center gap-2 group"
                onClick={() => {
                  Swal.fire({
                    icon: 'info',
                    title: 'อยู่ระหว่างพัฒนา',
                    text: 'ฟังก์ชันเข้าสู่ระบบด้วย Provider ID จะเปิดให้ใช้งานเร็วๆ นี้',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#0d9488',
                    customClass: {
                      popup: 'rounded-2xl',
                      confirmButton: 'rounded-md'
                    }
                  });
                }}
              >
                <img
                  src="https://provider.id.th/assets/Plogo-f6506bc1.png"
                  alt="Provider ID"
                  className="h-10 object-contain"
                />
              </button>
            </div>
            */}
        </div>

        {/* Quick Database Setup Link & Status Badge */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-teal-700 bg-white hover:bg-teal-50/80 border border-slate-200 hover:border-teal-200 px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>ตั้งค่าการเชื่อมต่อฐานข้อมูล</span>
          </button>

          {/* Database Connection Status Badge (แสดงไว้หลังปุ่มตั้งค่าฐานข้อมูล โดยใช้ rounded-lg) */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            title={
              dbStatus === 'online'
                ? `เชื่อมต่อสมบูรณ์ทั้ง 2 ฐาน (Online)\n- HOSxP: ${dbDetails?.hosxp?.host || '10.250.100.200'} (${dbDetails?.hosxp?.database || 'hos'})\n- Local DB: ${dbDetails?.local?.host || '127.0.0.1'} (${dbDetails?.local?.database || 'db_opoh'})\nคลิกเพื่อดูการตั้งค่า`
                : dbStatus === 'connecting'
                  ? `เชื่อมต่อสำเร็จ 1 จาก 2 ฐาน (Connecting...)\n- HOSxP: ${dbDetails?.hosxp?.online ? 'Online' : 'Offline'}\n- Local DB: ${dbDetails?.local?.online ? 'Online' : 'Offline'}\nคลิกเพื่อตั้งค่า`
                  : 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Offline)\nคลิกเพื่อตั้งค่าการเชื่อมต่อ'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm hover:scale-105 cursor-pointer ${dbStatus === 'online'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300'
              : dbStatus === 'connecting'
                ? 'bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300'
                : dbStatus === 'offline'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100 hover:border-rose-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
          >
            {dbStatus === 'online' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : dbStatus === 'connecting' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : dbStatus === 'offline' ? (
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-spin relative inline-flex rounded-full h-2 w-2 border border-slate-400 border-t-transparent"></span>
              </span>
            )}

            <span className="tracking-wide">
              {dbStatus === 'online'
                ? 'Online'
                : dbStatus === 'connecting'
                  ? 'Connecting...'
                  : dbStatus === 'offline'
                    ? 'Offline'
                    : 'Checking...'}
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 mb-4">
            <div className="w-6 h-px bg-slate-200"></div>
            <div className="bg-[#0d9488]/10 text-[#0d9488] p-1 rounded-md">
              <Terminal className="w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            DEVELOPMENT BY
            <div className="w-6 h-px bg-slate-200"></div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600 flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[#0d9488]">วิษณุ ศรีโยธา</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500">นักวิชาการคอมพิวเตอร์</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลกมลาไสย จังหวัดกาฬสินธุ์
            </p>
          </div>

          <div className="mt-6 text-[10px] font-bold tracking-widest text-slate-300 uppercase">
            © {new Date().getFullYear()} • VERSION 69.10.1.18
          </div>

          <div className="mt-4">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-slate-300 hover:text-teal-600 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-teal-50"
              title="ตั้งค่าฐานข้อมูล"
            >
              <Database className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <DatabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          checkDatabaseStatus();
        }}
      />
    </div>
  );
}
