import React from "react";
import { motion } from "motion/react";
import { Sparkles, Shield, Zap, Lock, ChevronRight, Globe, Fingerprint, Activity, Radio, HardDrive } from "lucide-react";

export const LandingPage = ({ onGetStarted, theme }: { onGetStarted: () => void, theme: string }) => {
  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-hidden relative transition-colors duration-500 ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* Premium Background Elements */}
      {theme === "dark" ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Futuristic ambient glowing meshes */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" style={{ animationDuration: "12s" }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[140px] animate-pulse" style={{ animationDuration: "8s" }} />
          <div className="absolute top-[30%] left-[40%] w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[120px]" />
          
          {/* Subtle tech background grids */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Sophisticated light mode flows */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-100/50 blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[130px]" />
          <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-50/50 blur-[100px]" />
          
          {/* Soft noise and sleek pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 pointer-events-none mix-blend-overlay"></div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="px-6 py-5 max-w-7xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-xl shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
            <span className="text-lg italic tracking-wider font-extrabold text-white">SZ</span>
            {/* Glowing spot */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold tracking-tight text-base leading-none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-white dark:to-slate-300">
              sz cloud Data bridge
            </span>
            <span className="text-[9px] font-mono font-black text-blue-500 tracking-widest mt-0.5 flex items-center gap-1">
              <Radio className="h-2 w-2 animate-pulse text-blue-500" /> SIGNAL ACTIVE
            </span>
          </div>
        </div>
        
        <button 
          onClick={onGetStarted}
          className={`text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all border shadow-sm cursor-pointer select-none ${
            theme === "dark" 
              ? "bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:border-slate-700 hover:text-white" 
              : "bg-slate-950 border-slate-950 text-white hover:bg-slate-800 hover:border-slate-800"
          } hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
        >
          Access Portal
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto z-10 w-full pt-10 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 flex flex-col items-center w-full"
        >
          {/* Sparkles pill badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xs backdrop-blur-md ${
            theme === "dark" 
              ? "bg-blue-950/40 text-blue-400 border-blue-900/50" 
              : "bg-blue-50 text-blue-700 border-blue-200/60"
          }`}>
            <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-spin" style={{ animationDuration: "3s" }} />
            Zero-Friction File Bridge
          </div>
          
          <h1 className="text-5.5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.03] max-w-4xl">
            Limitless Sharing, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 drop-shadow-xs">
              Absolute Privacy.
            </span>
          </h1>
          
          <p className={`text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed md:px-0 px-4 font-medium transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Drop your heavy payloads into a secure, ephemeral memory vault. Instant room synchronization across devices in milliseconds, completely incinerated after 1 hour.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-5 justify-center w-full max-w-md">
            <button 
              onClick={onGetStarted}
              className="group relative inline-flex items-center justify-center px-8 py-4.5 font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl hover:brightness-110 focus:outline-none text-base shadow-xl shadow-blue-650/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto cursor-pointer"
            >
              <span>Initialize Sharing Stream</span>
              <ChevronRight className="w-5 h-5 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            
            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${
              theme === "dark" 
                ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                : "bg-white border-slate-200 text-slate-500 shadow-sm"
            }`}>
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              <span className="text-xs font-bold tracking-wide">100 Credits / Room</span>
            </div>
          </div>
        </motion.div>

        {/* Feature Grid with Frosted Glassmorphism Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-28"
        >
          {/* Card 1 */}
          <div className={`flex flex-col items-start gap-5 p-8 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group ${
            theme === "dark" 
              ? "bg-slate-900/40 border-slate-800/80 hover:border-blue-700/50 hover:bg-slate-900/60 shadow-black/40" 
              : "bg-white/70 border-slate-200/70 hover:border-blue-300/60 hover:bg-white/90 shadow-xl shadow-slate-200/15"
          }`}>
            <div className={`p-4.5 rounded-2.5xl transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-950 border border-slate-800 text-blue-400 group-hover:text-blue-300 bg-gradient-to-br from-blue-950/40 to-transparent" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
            }`}>
              <Globe className="h-7 w-7" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-xl mb-2.5 tracking-tight">Sync WebSockets</h3>
              <p className={`text-xs sm:text-sm leading-relaxed font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Transmit textual links, active variables, and files instantly. Remote nodes are detected automatically with active ping beacons.
              </p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className={`flex flex-col items-start gap-5 p-8 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group ${
            theme === "dark" 
              ? "bg-slate-900/40 border-slate-800/80 hover:border-rose-700/50 hover:bg-slate-900/60 shadow-black/40" 
              : "bg-white/70 border-slate-200/70 hover:border-rose-300/60 hover:bg-white/90 shadow-xl shadow-slate-200/15"
          }`}>
            <div className={`p-4.5 rounded-2.5xl transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-950 border border-slate-800 text-rose-400 group-hover:text-rose-300 bg-gradient-to-br from-rose-950/40 to-transparent" : "bg-rose-50 text-rose-600 group-hover:bg-rose-100"
            }`}>
              <Shield className="h-7 w-7" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-xl mb-2.5 tracking-tight">Incineration Routine</h3>
              <p className={`text-xs sm:text-sm leading-relaxed font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Configurable download count caps. Session and stored segments undergo military-grade erasure automatically after 1 hour or immediate manually forced purges.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`flex flex-col items-start gap-5 p-8 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group ${
            theme === "dark" 
              ? "bg-slate-900/40 border-slate-800/80 hover:border-emerald-700/50 hover:bg-slate-900/60 shadow-black/40" 
              : "bg-white/70 border-slate-200/70 hover:border-emerald-300/60 hover:bg-white/90 shadow-xl shadow-slate-200/15"
          }`}>
            <div className={`p-4.5 rounded-2.5xl transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-950 border border-slate-800 text-emerald-400 group-hover:text-emerald-300 bg-gradient-to-br from-emerald-950/40 to-transparent" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
            }`}>
              <Fingerprint className="h-7 w-7" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-xl mb-2.5 tracking-tight">Locked Portals</h3>
              <p className={`text-xs sm:text-sm leading-relaxed font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Protect separate file payloads with secret passcodes or seal the entire stream bridge behind complex encryption keys.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 max-w-7xl w-full mx-auto px-6 text-center text-xs font-mono font-bold tracking-wider opacity-40 z-10 border-t border-slate-200/10 dark:border-slate-800/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} SZ CLOUD DATA BRIDGE. ALL EPHEMERAL VAULTS SEALED SECURELY.</span>
        <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 animate-pulse text-emerald-500" /> SECURE TUNNEL ONLINE</span>
      </footer>
    </div>
  );
};

