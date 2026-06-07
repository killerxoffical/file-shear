import React, { useState } from "react";
import { X, Mail, Lock, Key, AlertCircle } from "lucide-react";
import { loginWithEmail, registerWithEmail, resetPassword, loginWithGoogle } from "./firebase";

export const AuthModal = ({ onClose, theme }: { onClose: () => void, theme: string }) => {
  const [tab, setTab] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    if (!email) {
      setError("Email is required.");
      return;
    }
    
    if (tab !== "forgot" && !password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
        onClose();
      } else if (tab === "signup") {
        await registerWithEmail(email, password);
        onClose();
      } else if (tab === "forgot") {
        await resetPassword(email);
        setSuccessMsg("Password reset email sent if an account exists.");
        setTab("login");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError("Google Login was closed or failed. Please try Email login instead.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col gap-6 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 text-white shadow-black/80" : "bg-white border border-slate-100 text-slate-900"}`}>
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">
            {tab === "login" ? "Sign In" : tab === "signup" ? "Create Account" : "Reset Password"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {tab === "login" ? "Welcome back. Log in to your space." : tab === "signup" ? "Get started with your secure space." : "We'll send you reset instructions."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className={`flex p-1 rounded-xl w-full ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}>
          <button 
            type="button"
            onClick={() => { setTab("login"); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tab === "login" ? (theme === "dark" ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500"}`}
          >
            Login
          </button>
          <button 
            type="button"
            onClick={() => { setTab("signup"); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tab === "signup" ? (theme === "dark" ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500"}`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold text-left border ${theme === "dark" ? "bg-rose-950/30 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
            <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold text-left border ${theme === "dark" ? "bg-green-950/30 border-green-900/30 text-green-300" : "bg-green-50 border-green-100 text-green-800"}`}>
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${theme === "dark" ? "bg-slate-950 border-slate-800 placeholder-slate-600" : "bg-white border-slate-200 placeholder-slate-400"}`}
                required
              />
            </div>
            
            {tab !== "forgot" && (
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${theme === "dark" ? "bg-slate-950 border-slate-800 placeholder-slate-600" : "bg-white border-slate-200 placeholder-slate-400"}`}
                  required
                />
              </div>
            )}
          </div>
          
          {tab === "login" && (
            <button 
              type="button" 
              onClick={() => { setTab("forgot"); setError(null); }}
              className="text-[11px] font-bold text-blue-500 hover:text-blue-600 self-end transition-colors"
            >
              Forgot Password?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md mt-2 disabled:opacity-50"
          >
            {loading ? "Processing..." : tab === "login" ? "Log In" : tab === "signup" ? "Create Account" : "Send Reset Email"}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 dark:text-slate-500">OR</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-bold border transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.07-5.322c3.275 0 5.626-2.296 5.626-5.698 0-.422-.053-.825-.132-1.2h-5.494v2.18h3.21c-.132 1.09-.925 2.053-2.18 2.658L10.93 16.678zm-4.732-2.585a5.5 5.5 0 0 1 0-4.186l-2.615-2.006a8.88 8.88 0 0 0 0 8.198l2.615-2.006z" clipRule="evenodd"/>
            <path stroke="none" fill="#4285F4" d="M21.5 12.23c0-.79-.07-1.55-.2-2.28H12v4.32h5.33a4.57 4.57 0 0 1-1.98 3l3.2 2.47c1.86-1.72 2.95-4.25 2.95-7.51z"/>
            <path stroke="none" fill="#34A853" d="M12 22c2.67 0 4.9-.88 6.53-2.39l-3.2-2.47c-.88.6-2 .95-3.33.95-2.57 0-4.74-1.74-5.52-4.08H3.21l-2.47 1.9C3.15 20.67 7.23 22 12 22z"/>
            <path stroke="none" fill="#FBBC05" d="M6.48 14.01a5.7 5.7 0 0 1 0-3.64l-2.47-1.9a8.9 8.9 0 0 0 0 7.43l2.47-1.9z"/>
            <path stroke="none" fill="#EA4335" d="M12 6.29c1.45 0 2.76.5 3.79 1.48l2.84-2.84C16.9 3.29 14.67 2.4 12 2.4 7.23 2.4 3.15 3.73 1.48 8.08l2.48 1.93c.78-2.34 2.95-4.08 5.52-4.08z"/>
          </svg>
          Continue with Google
        </button>

      </div>
    </div>
  );
};
