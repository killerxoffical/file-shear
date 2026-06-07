import React from "react";
import { motion } from "motion/react";
import { Sparkles, Shield, Zap, Lock, ChevronRight, Globe, Fingerprint } from "lucide-react";

export const LandingPage = ({ onGetStarted, theme }: { onGetStarted: () => void, theme: string }) => {
  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-hidden relative ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* Premium Background Elements */}
      {theme === "dark" ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/40 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="px-6 py-5 flex items-center justify-between z-10 border-b border-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            IF
          </div>
          <span className="font-extrabold tracking-tight text-lg hidden sm:block">Instant Share</span>
        </div>
        <button 
          onClick={onGetStarted}
          className={`text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm ${theme === "dark" ? "bg-white text-slate-950 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"}`}
        >
          Access Portal
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto z-10 w-full pt-10 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 flex flex-col items-center w-full"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border shadow-sm backdrop-blur-sm ${
            theme === "dark" 
              ? "bg-blue-900/20 text-blue-400 border-blue-800/50" 
              : "bg-blue-50 text-blue-700 border-blue-200/50"
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            Zero-Friction File Bridge
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1]">
            Limitless Sharing, <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
              Absolute Privacy.
            </span>
          </h1>
          
          <p className={`text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium md:px-0 px-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Drop your heavy files into a secure memory safe-room. Get an instant access code, synchronize across devices in milliseconds, and watch it all completely burn after 1 hour.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={onGetStarted}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-blue-600 rounded-2xl hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-600/30 text-lg shadow-xl shadow-blue-600/20 hover:shadow-blue-500/40 hover:-translate-y-1 w-full sm:w-auto"
            >
              Initialize Node
              <ChevronRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <span className={`text-sm font-semibold tracking-wide flex items-center gap-2 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
              <Zap className="w-4 h-4 text-amber-500" /> 100 Credits / Room
            </span>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24"
        >
          {/* Card 1 */}
          <div className={`flex flex-col items-start gap-4 p-8 rounded-3xl border backdrop-blur-md transition-transform hover:-translate-y-1 ${
            theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white/70 border-slate-200/60 shadow-xl shadow-slate-200/20"
          }`}>
            <div className={`p-4 rounded-2xl ${theme === "dark" ? "bg-blue-950/50 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Globe className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Live WebSockets</h3>
              <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Drop a file and it instantly reflects on any connected device worldwide with zero perceptible latency. 
              </p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className={`flex flex-col items-start gap-4 p-8 rounded-3xl border backdrop-blur-md transition-transform hover:-translate-y-1 ${
            theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white/70 border-slate-200/60 shadow-xl shadow-slate-200/20"
          }`}>
            <div className={`p-4 rounded-2xl ${theme === "dark" ? "bg-rose-950/50 text-rose-400" : "bg-rose-50 text-rose-600"}`}>
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Self-Destructing</h3>
              <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Configurable download limits per file. Complete room incineration perfectly timed at exactly 1 hour. No trace left behind.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`flex flex-col items-start gap-4 p-8 rounded-3xl border backdrop-blur-md transition-transform hover:-translate-y-1 ${
            theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white/70 border-slate-200/60 shadow-xl shadow-slate-200/20"
          }`}>
            <div className={`p-4 rounded-2xl ${theme === "dark" ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <Fingerprint className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Military Grade Access</h3>
              <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Lock specific payload transfers or seal the entire bridge behind secure PIN requirements.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-xs font-mono font-medium opacity-50 z-10 border-t border-slate-200/10">
        &copy; {new Date().getFullYear()} Instant Share. Secure transmission channel ready.
      </footer>
    </div>
  );
};
