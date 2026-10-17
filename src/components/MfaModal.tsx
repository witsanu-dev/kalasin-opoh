"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Shield,
  QrCode,
  KeyRound,
  Smartphone,
  Lock,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import Swal from "sweetalert2";

interface MfaModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onStatusChange?: (isEnabled: boolean) => void;
}

export default function MfaModal({ isOpen, onClose, user, onStatusChange }: MfaModalProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [mfaStatus, setMfaStatus] = useState<{
    isEnabled: boolean;
    enabledAt?: string | null;
  }>({
    isEnabled: false,
    enabledAt: null,
  });

  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
    recoveryCodes?: string[];
  } | null>(null);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setErrorMsg("");
      fetchMfaStatus();
    }
  }, [isOpen]);

  const fetchMfaStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/status");
      const data = await res.json();
      if (data.success) {
        setMfaStatus({
          isEnabled: Boolean(data.isEnabled),
          enabledAt: data.enabledAt || null,
        });

        if (onStatusChange) {
          onStatusChange(Boolean(data.isEnabled));
        }

        // If not enabled, automatically prepare QR code setup
        if (!data.isEnabled) {
          await loadSetupData();
        }
      }
    } catch (err) {
      console.error("Failed to fetch MFA status", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSetupData = async () => {
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSetupData({
          secret: data.secret,
          qrCodeUrl: data.qrCodeUrl,
          otpauthUrl: data.otpauthUrl,
          recoveryCodes: data.recoveryCodes || [],
        });
      }
    } catch (err) {
      console.error("Failed to load MFA setup data", err);
    }
  };

  const handleCopyAllRecoveryCodes = async () => {
    if (!setupData?.recoveryCodes || setupData.recoveryCodes.length === 0) return;
    try {
      const text = setupData.recoveryCodes.join("\n");
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedAllCodes(true);
      setTimeout(() => setCopiedAllCodes(false), 2000);
    } catch (err) {
      console.warn("Copy recovery codes failed", err);
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(setupData.secret);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = setupData.secret;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setErrorMsg("กรุณากรอกรหัส 6 หลักจากแอปพลิเคชัน");
      return;
    }

    setVerifying(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setMfaStatus({
          isEnabled: true,
          enabledAt: new Date().toISOString(),
        });
        if (onStatusChange) onStatusChange(true);

        Swal.fire({
          icon: "success",
          title: "เปิดใช้งานสำเร็จ",
          text: "การยืนยันตัวตน 2 ขั้นตอนพร้อมใช้งานแล้ว",
          customClass: {
            container: "!z-[99999]",
            popup: "rounded-md",
            confirmButton: "rounded-md bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium"
          },
        });
      } else {
        setErrorMsg(data.message || "รหัสยืนยันไม่ถูกต้อง");
      }
    } catch (err) {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการปิดใช้งาน?",
      text: "ระบบจะไม่ถามรหัสยืนยันตัวตน 2 ขั้นตอนเมื่อคุณเข้าสู่ระบบในครั้งต่อไป",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันปิดการใช้งาน",
      cancelButtonText: "ยกเลิก",
      customClass: {
        container: "!z-[99999]",
        popup: "rounded-md",
        confirmButton: "rounded-md text-sm font-medium",
        cancelButton: "rounded-md text-sm font-medium"
      },
    });

    if (result.isConfirmed) {
      setDisabling(true);
      try {
        const res = await fetch("/api/auth/mfa/disable", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setMfaStatus({ isEnabled: false, enabledAt: null });
          if (onStatusChange) onStatusChange(false);
          await loadSetupData();
          Swal.fire({
            icon: "success",
            title: "ปิดการใช้งานเรียบร้อย",
            text: "ระบบความปลอดภัย 2 ขั้นตอนถูกยกเลิกแล้ว",
            customClass: {
              container: "!z-[99999]",
              popup: "rounded-md",
              confirmButton: "rounded-md bg-teal-600 text-white text-sm"
            },
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: data.message || "ไม่สามารถปิดการใช้งานได้",
            customClass: {
              container: "!z-[99999]",
              popup: "rounded-md"
            },
          });
        }
      } catch (err) {
        console.error("Disable MFA failed", err);
      } finally {
        setDisabling(false);
      }
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfa-modal-title"
    >
      <div
        className="bg-white rounded-md shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/10 text-teal-600 rounded-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="mfa-modal-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                ความปลอดภัย 2 ขั้นตอน
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Multi-Factor Authentication (MFA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
              <p className="text-xs">กำลังตรวจสอบสถานะความปลอดภัย...</p>
            </div>
          ) : mfaStatus.isEnabled ? (
            /* State 1: MFA is Active */
            <div className="space-y-5">
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-5 flex items-start gap-3.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0 mt-0.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-emerald-900">
                      เปิดใช้งาน MFA แล้ว
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-emerald-200/80 text-emerald-800 rounded-md">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    บัญชีของคุณได้รับการยืนยันตัวตน 2 ขั้นตอนแล้ว ทุกครั้งที่เข้าสู่ระบบจะต้องใช้รหัสผ่านและรหัส OTP 6 หลัก
                  </p>
                  {mfaStatus.enabledAt && (
                    <p className="text-[11px] text-emerald-600/90 mt-2 font-mono">
                      เปิดใช้งานเมื่อ: {new Date(mfaStatus.enabledAt).toLocaleString("th-TH")}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    แอปพลิเคชันที่รองรับ
                  </span>
                  <span className="font-semibold text-slate-700">Google / Microsoft Authenticator</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    รูปแบบการยืนยัน
                  </span>
                  <span className="font-semibold text-slate-700">Time-based OTP (6 หลัก / 30 วินาที)</span>
                </div>
              </div>

              <div className="rounded-md border border-amber-200/80 bg-amber-50/60 p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">กรณีทำโทรศัพท์หายหรือใช้งาน Authenticator ไม่ได้</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    ท่านสามารถเข้าสู่ระบบด้วยรหัสกู้คืนฉุกเฉิน (Recovery Code) ได้ที่หน้าล็อกอิน หรือติดต่อผู้ดูแลระบบ (Administrator) เพื่อทำการ <b>รีเซ็ต MFA</b> ที่เมนู <b>ตั้งค่าระบบ</b>
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={disabling}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                  ปิดการใช้งาน MFA
                </button>
              </div>
            </div>
          ) : (
            /* State 2: MFA Setup Process */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-teal-50/70 border border-teal-200/80 p-3 rounded-md">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  เพิ่มความปลอดภัยให้บัญชีโดยการใช้รหัส 6 หลักจาก Google Authenticator
                </span>
              </div>

              {/* Step 1: Install App */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  ขั้นตอนที่ 1 : สแกน QR Code ด้วย Google Authenticator
                </span>
                <p className="text-xs text-slate-600">
                  เปิดแอป Google Authenticator หรือแอปอื่นๆ ที่รองรับ TOTP แล้วสแกน QR Code
                </p>
              </div>

              {/* QR Code & Secret Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                <div className="bg-white p-2 rounded-md border border-slate-200 shadow-sm shrink-0">
                  {setupData?.qrCodeUrl ? (
                    <img
                      src={setupData.qrCodeUrl}
                      alt="Google Authenticator QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8 animate-pulse text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2 text-left">
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-teal-600" />
                    หรือระบุรหัส Secret Key ด้วยตนเอง
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={setupData?.secret || ""}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono text-slate-700 tracking-wider select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md transition-colors shrink-0 shadow-sm"
                      title="คัดลอก Secret Key"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Time-based (TOTP) ความยาว 6 หลัก
                  </p>
                </div>
              </div>

              {/* Emergency Recovery Codes Box */}
              {setupData?.recoveryCodes && setupData.recoveryCodes.length > 0 && (
                <div className="space-y-2 p-3 bg-teal-50/50 border border-teal-200/80 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      รหัสกู้คืนสำรองฉุกเฉิน (Recovery Codes)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAllRecoveryCodes}
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 bg-white border border-teal-200 px-2 py-0.5 rounded shadow-sm transition-colors"
                    >
                      {copiedAllCodes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      {copiedAllCodes ? "คัดลอกแล้ว" : "คัดลอกทั้งหมด"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px] text-slate-700 text-center">
                    {setupData.recoveryCodes.map((rc, i) => (
                      <span key={i} className="bg-white border border-slate-200 px-1 py-1 rounded select-all font-bold text-slate-800 tracking-wider">
                        {rc}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-teal-700/80 leading-normal">
                    * โปรดบันทึกรหัส 8 ชุดนี้เก็บไว้ ใช้สำหรับเข้าสู่ระบบและรีเซ็ต MFA เมื่อโทรศัพท์หายหรือรับ OTP ไม่ได้
                  </p>
                </div>
              )}

              {/* Step 2: Verification Input */}
              <form onSubmit={handleVerify} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    ขั้นตอนที่ 2 : กรอกรหัสยืนยัน 6 หลัก
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setCode(val);
                        setErrorMsg("");
                      }}
                      placeholder="000000"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-center text-lg font-mono font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={verifying || code.trim().length !== 6}
                      className="h-10 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      เปิดใช้งาน
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errorMsg}
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            มาตรฐานการเข้ารหัสปลอดภัย
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-medium text-xs"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
