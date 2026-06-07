import React from "react";
import { motion } from "motion/react";
import { Sparkles, Shield, Zap, Lock } from "lucide-react";

export const LandingPage = ({ onGetStarted, theme }: { onGetStarted: () => void, theme: string }) => {
  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950"}`}>
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            IF
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block">Instant Share</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl"
        >
          Login
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200 dark:border-blue-800">
            <Sparkles className="h-3 w-3" />
            Fastest way to share files
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            Secure File Transfer, <br className="hidden sm:block" />
            <span className="text-blue-600">Reimagined.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Drop files, get a code, and download everywhere. A temporary memory safe-room with instant sync, local limits, and absolute privacy.
          </p>
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.2 }}
        >
          <button 
            onClick={onGetStarted}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-bold rounded-2xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 text-lg shadow-lg shadow-blue-500/30 scale-100 hover:scale-105"
          >
            Get Started Now
            <svg
              className="w-5 h-5 ml-2 transition-transform duration-200 transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full pt-12"
        >
          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-bold">Instant Sync</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Live WebSockets push your files across devices in milliseconds.</p>
          </div>
          
          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-bold">Self-Destructing</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Set limits for downloads. Everything burns completely after exactly 1 hour.</p>
          </div>

          <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-bold">Passcode Secured</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Lock specific files or entire rooms behind PIN verification requirements.</p>
          </div>
        </motion.div>
      </main>
      
      <footer className="py-6 text-center text-sm font-mono text-slate-500 dark:text-slate-600">
        &copy; {new Date().getFullYear()} Instant Share. Secure transmission channel.
      </footer>
    </div>
  );
};
