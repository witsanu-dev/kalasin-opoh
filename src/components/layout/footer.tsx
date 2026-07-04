import { Terminal, Monitor } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-3 px-6 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4 md:gap-0">
        
        {/* Left Side */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[10px] font-semibold text-slate-500 tracking-wider">VERSION 69.6.1.13</span>
          </div>
          
          <div className="hidden sm:block h-7 w-px bg-slate-200"></div>
          
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left leading-tight">
            <span className="font-semibold text-slate-600">กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลกมลาไสย</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              OPOH <span className="text-teal-600 uppercase">{process.env.NEXT_PUBLIC_HOSPITAL_NAME || "KALASIN"}</span> &copy; {new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-teal-600 stroke-[2.5px]" />
          <span className="font-medium tracking-wide">
            DEVELOPED BY <span className="text-teal-600 font-semibold">นายวิษณุ ศรีโยธา</span> <span className="text-slate-300 mx-1">|</span> นักวิชาการคอมพิวเตอร์
          </span>
        </div>

      </div>
    </footer>
  );
}
