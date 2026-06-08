import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { 
  Terminal, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Download, 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Settings,
  Brain
} from "lucide-react";

interface LiveCodingWorkspaceProps {
  currentRoomCode: string;
  currentUser: User | null;
  theme: "light" | "dark";
  language: "en" | "bn";
  liveCode: string;
  localCode: string;
  liveLanguage: string;
  liveIsLocked: boolean;
  liveOwnerId: string;
  liveOwnerName: string;
  liveOwnerEmail: string;
  livePermissions: Record<string, { edit?: boolean; download?: boolean; email?: string; name?: string }>;
  liveActiveEditors: Record<string, { name: string; isEditing: boolean; updatedAt: number }>;
  liveParticipants: Record<string, { uid: string; email: string; name: string; deviceId: string; lastSeen: number }>;
  handleLocalCodeChange: (val: string) => void;
  showStatus: (text: string, type: "success" | "error" | "info") => void;
}

export default function LiveCodingWorkspace({
  currentRoomCode,
  currentUser,
  theme,
  language,
  liveCode,
  localCode,
  liveLanguage,
  liveIsLocked,
  liveOwnerId,
  liveOwnerName,
  liveOwnerEmail,
  livePermissions,
  liveActiveEditors,
  liveParticipants,
  handleLocalCodeChange,
  showStatus
}: LiveCodingWorkspaceProps) {
  const [copied, setCopied] = React.useState(false);

  const isOwner = currentUser?.uid === liveOwnerId;
  const myPermission = livePermissions[currentUser?.uid || ""];
  
  // Can current user edit? (Owner can always edit. Guest can edit if not locked AND they aren't explicitly restricted)
  const canEdit = isOwner || (!liveIsLocked && myPermission?.edit !== false);

  const languagesList = [
    { id: "javascript", label: "JavaScript (.js)" },
    { id: "typescript", label: "TypeScript (.ts)" },
    { id: "html", label: "HTML (.html)" },
    { id: "css", label: "CSS (.css)" },
    { id: "python", label: "Python (.py)" },
    { id: "cpp", label: "C++ (.cpp)" },
    { id: "java", label: "Java (.java)" }
  ];

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isOwner) {
      showStatus(
        language === "bn" 
          ? "শুধুমাত্র ওনার ল্যাঙ্গুয়েজ পরিবর্তন করতে পারবেন।" 
          : "Only the owner can change the language.", 
        "error"
      );
      return;
    }
    const docRef = doc(db, "liveCoding", currentRoomCode);
    try {
      await updateDoc(docRef, { language: e.target.value });
      showStatus(
        language === "bn" 
          ? `কোডিং ল্যাঙ্গুয়েজ পরিবর্তন করা হয়েছে: ${e.target.value}` 
          : `Language updated to ${e.target.value}`, 
        "success"
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleLockToggle = async () => {
    if (!isOwner) {
      showStatus(
        language === "bn" 
          ? "শুধুমাত্র ওনার লক অ্যাক্টিভেট করতে পারবেন।" 
          : "Only the owner can activate the lock control.", 
        "error"
      );
      return;
    }
    const docRef = doc(db, "liveCoding", currentRoomCode);
    try {
      const nextLockState = !liveIsLocked;
      await updateDoc(docRef, { isLocked: nextLockState });
      showStatus(
        nextLockState 
          ? (language === "bn" ? "রুম এডিটর লক করা হয়েছে! অন্য মেম্বার এডিট করতে পারবে না।" : "Editor Locked! Guests can no longer make changes.")
          : (language === "bn" ? "রুম এডিটর আনলক করা হয়েছে!" : "Editor Unlocked! Guests can now format code."),
        nextLockState ? "info" : "success"
      );
    } catch (err) {
      console.error(err);
    }
  };

  const toggleParticipantPermission = async (targetUid: string, type: "edit" | "download", currentVal: boolean) => {
    if (!isOwner) return;
    const docRef = doc(db, "liveCoding", currentRoomCode);
    try {
      await updateDoc(docRef, {
        [`permissions.${targetUid}.${type}`]: !currentVal
      });
      showStatus(
        language === "bn" 
          ? "পারমিশন সফলভাবে পরিবর্তন করা হয়েছে!" 
          : "Participant access updated successfully!", 
        "success"
      );
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(localCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showStatus(language === "bn" ? "কোড কপি করা হয়েছে!" : "Code copied to clipboard!", "success");
      })
      .catch(() => {
        showStatus(language === "bn" ? "কপি করা সম্ভব হয়নি।" : "Failed to copy code.", "error");
      });
  };

  const downloadCodeAsFile = () => {
    const extMap: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      html: "html",
      css: "css",
      python: "py",
      cpp: "cpp",
      java: "java"
    };
    const extension = extMap[liveLanguage] || "txt";
    const filename = `workspace_code_${currentRoomCode}.${extension}`;

    const blob = new Blob([localCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus(
      language === "bn" 
        ? `কোড ফাইলটি ডাউনলোড করা হয়েছে: ${filename}` 
        : `Downloaded source code as ${filename}`, 
      "success"
    );
  };

  // Get active editors currently typing (excluding current user)
  const activeTypingUsers = Object.entries(liveActiveEditors)
    .filter(([uid, meta]) => uid !== currentUser?.uid && meta.isEditing && (Date.now() - meta.updatedAt < 5000))
    .map(([_, meta]) => meta.name);

  // Filter out actual participants to show in the permissions list (excluding the owner themselves)
  const guestParticipants = Object.values(liveParticipants).filter(p => p.uid !== liveOwnerId);

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* Editor Main Canvas Board */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 relative flex flex-col gap-4 shadow-sm ${
        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-205 text-slate-900"
      }`}>
        
        {/* Workspace Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-950/40 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Terminal className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                {language === "bn" ? "রিয়েল-টাইম এডিটর" : "Real-time editor"}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-black tracking-tight">
                  {languagesList.find(l => l.id === liveLanguage)?.label || "JavaScript (.js)"}
                </span>
                {liveIsLocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                    <Unlock className="h-2.5 w-2.5" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controller Group */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Owner settings: Language & Wonder Lock */}
            {isOwner ? (
              <>
                <select
                  value={liveLanguage}
                  onChange={handleLanguageChange}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-300" 
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {languagesList.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>

                <button
                  onClick={handleLockToggle}
                  className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                    liveIsLocked 
                      ? "bg-rose-500 text-white border-rose-600 shadow-sm" 
                      : theme === "dark" 
                      ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-400" 
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                  }`}
                  title={liveIsLocked ? "Unlock Editor for Members" : "Lock Editor for Members"}
                >
                  {liveIsLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </button>
              </>
            ) : (
              <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400">
                Host: <span className="text-blue-500 font-bold">{liveOwnerName || "Anonymous"}</span>
              </span>
            )}

            {/* General client: Copy & Download source code code draft */}
            <button
              onClick={copyToClipboard}
              className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                theme === "dark" 
                  ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-350" 
                  : "bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-600"
              }`}
              title="Copy Code"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={downloadCodeAsFile}
              className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                theme === "dark" 
                  ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-350" 
                  : "bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-600"
              }`}
              title="Save Code as File"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Text Code Editing Canvas (Interactive Block wrapper with relative state locked banner if needed) */}
        <div className="relative w-full rounded-2xl overflow-hidden font-mono text-sm border border-slate-200/60 dark:border-slate-800">
          
          <textarea
            value={localCode}
            onChange={(e) => handleLocalCodeChange(e.target.value)}
            disabled={!canEdit}
            placeholder={
              liveIsLocked 
                ? (language === "bn" ? "ওনার এই ক্যানভাসটি লক করেছেন! শুধুমাত্র রিড-অনলি মোডে দেখতে পারবেন।" : "Owner locked editing. View-only mode.")
                : (language === "bn" ? "সার্ভার ড্রাফটে এখানে আপনার রিয়েল-টাইম কোড লেখা শুরু করুন..." : "Enter your collaborative code draft here...")
            }
            className={`w-full min-h-[320px] p-5 font-mono text-sm text-left focus:outline-none resize-y leading-relaxed scrollbar-thin transition-colors duration-300 ${
              !canEdit 
                ? "bg-slate-100/50 dark:bg-slate-950/40 text-slate-400 select-all" 
                : theme === "dark" ? "bg-slate-950 text-emerald-400 cursor-text" : "bg-slate-50 text-slate-850 cursor-text"
            }`}
            style={{ tabSize: 2 }}
          />

          {/* Locked Badge Overlay */}
          {!canEdit && (
            <div className={`absolute inset-0 bg-slate-900/10 pointer-events-none backdrop-blur-[0.5px] transition-all flex items-center justify-center`}>
              <div className={`p-4 rounded-2xl flex items-center gap-3 shadow-xl border select-none ${
                theme === "dark" ? "bg-slate-900 border-slate-800 text-rose-400" : "bg-white border-slate-200 text-rose-500"
              }`}>
                <Lock className="h-4 w-4 animate-bounce" />
                <span className="text-xs font-bold tracking-tight">
                  {language === "bn" ? "ওনার এডিট অপশন লক করেছেন" : "No Edit Permission"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Typing Indicators Bottom Info row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            {activeTypingUsers.length > 0 ? (
              <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold font-sans">
                  {activeTypingUsers.join(", ")} {activeTypingUsers.length > 1 ? "are" : "is"} {language === "bn" ? "কোড এডিট করছে..." : "editing code..."}
                </span>
              </div>
            ) : (
              <span className="opacity-60">
                {language === "bn" ? "কোনো মেম্বার বর্তমানে টাইপ করছে না" : "All editors synced."}
              </span>
            )}
          </div>

          <span className="text-[10px] uppercase opacity-50 tracking-wider">
            {language === "bn" ? "কোড ড্রাফট রিয়েল-টাইমে সেভ হবে" : "Changes auto-saved instantly via firestore"}
          </span>
        </div>

      </div>

      {/* Permissions and Connected Attendees Hub */}
      {isOwner && (
        <div className={`p-5 rounded-2xl border transition-all duration-300 relative flex flex-col gap-4 shadow-sm ${
          theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-205 text-slate-900"
        }`}>
          
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-950/40 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                  {language === "bn" ? "অ্যাক্সেস মেম্বারস পারমিশন কন্ট্রোল" : "Workspace Access Permissions"}
                </span>
                <span className="text-sm font-black tracking-tight mt-0.5">
                  {language === "bn" ? "লাইভ কানেক্টেড ইউজারস" : `Connected Members (${guestParticipants.length})`}
                </span>
              </div>
            </div>
            
            <div className={`p-1.5 rounded-lg border flex items-center justify-center opacity-60 ${theme === "dark" ? "border-slate-800 bg-slate-950" : "border-slate-100 bg-slate-50"}`}>
              <Shield className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>

          {/* Members list */}
          <div className="flex flex-col gap-3">
            {guestParticipants.length === 0 ? (
              <div className="text-center py-6 opacity-60 flex flex-col items-center gap-1.5">
                <Brain className="h-6 w-6 text-slate-400 animate-pulse" />
                <p className="text-xs">
                  {language === "bn" ? "রকমে অন্য কোনো মেম্বার অ্যাক্টিভ নেই।" : "No other guests joined this interactive workspace yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                {guestParticipants.map((member) => {
                  const perm = livePermissions[member.uid] || {};
                  const canMemberEdit = perm.edit !== false;
                  const canMemberDownload = perm.download !== false;

                  return (
                    <div key={member.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0">
                      
                      {/* Name & Account Email */}
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black uppercase text-blue-500 border bg-blue-500/10 border-blue-500/20`}>
                          {member.name ? member.name[0] : member.email[0]}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold leading-non font-sans">{member.name || member.email.split("@")[0]}</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">{member.email}</span>
                        </div>
                      </div>

                      {/* Granular Checks */}
                      <div className="flex items-center gap-2">
                        {/* 1. Code Edit Perm */}
                        <button
                          onClick={() => toggleParticipantPermission(member.uid, "edit", canMemberEdit)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer hover:scale-103 active:scale-97 ${
                            canMemberEdit 
                              ? "bg-emerald-500/10 border-emerald-550/30 text-emerald-500" 
                              : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
                          }`}
                        >
                          {canMemberEdit ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          <span>{canMemberEdit ? (language === "bn" ? "কোড এডিটর: অন" : "Edit: ON") : (language === "bn" ? "কোড এডিটর: অফ" : "Edit: OFF")}</span>
                        </button>

                        {/* 2. File Download Perm */}
                        <button
                          onClick={() => toggleParticipantPermission(member.uid, "download", canMemberDownload)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer hover:scale-103 active:scale-97 ${
                            canMemberDownload 
                              ? "bg-emerald-500/10 border-emerald-550/30 text-emerald-500" 
                              : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
                          }`}
                        >
                          {canMemberDownload ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          <span>{canMemberDownload ? (language === "bn" ? "ডাউনলোড: অন" : "Download: ON") : (language === "bn" ? "ডাউনলোড: অফ" : "Download: OFF")}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
