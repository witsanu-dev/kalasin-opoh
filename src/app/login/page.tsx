"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Loader2, Hospital, Activity, Terminal, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import DatabaseConfigModal from '@/components/DatabaseConfigModal';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const router = useRouter();

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
                  placeholder="ชื่อผู้ใช้งาน (Username)"
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
                  placeholder="รหัสผ่าน (Password)"
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

            {/* Divider */}
            <div className="relative mt-6 mb-2 pt-2">
              <div className="absolute inset-0 flex items-center mt-2">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium tracking-wide">หรือเข้าสู่ระบบด้วย</span>
              </div>
            </div>

            {/* Provider ID SSO Button */}
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
          </form>
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
            © {new Date().getFullYear()} • VERSION 69.6.1.19
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
        onClose={() => setIsConfigModalOpen(false)} 
      />
    </div>
  );
}
