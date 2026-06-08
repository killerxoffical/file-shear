import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { RoomState } from "../types";
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
  Brain,
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  UploadCloud, 
  FileCode,
  ArrowDownToLine,
  RefreshCw,
  Info
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
  liveParticipants: Record<string, { uid: string; email: string; name: string; deviceId: string; lastSeen: number; isInVoiceCall?: boolean; isMuted?: boolean; isTalking?: boolean }>;
  handleLocalCodeChange: (val: string) => void;
  showStatus: (text: string, type: "success" | "error" | "info") => void;
  roomData: RoomState | null;
  deviceId: string;
  guestNickname: string;
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
  showStatus,
  roomData,
  deviceId,
  guestNickname
}: LiveCodingWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(true);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myUserId = currentUser?.uid || deviceId;
  const isOwner = myUserId === liveOwnerId;
  const myPermission = livePermissions[myUserId];
  
  // Can current user edit? (Owner can always edit. Guest can edit if not locked AND they aren't explicitly restricted)
  const canEdit = isOwner || (!liveIsLocked && myPermission?.edit !== false);

  // Local state for voice status (synchronized with Firestore presence)
  const meAsParticipant = liveParticipants[myUserId];
  const isInVoiceCall = !!meAsParticipant?.isInVoiceCall;
  const isMuted = meAsParticipant?.isMuted !== false; // default to muted for safety

  const languagesList = [
    { id: "javascript", label: "JavaScript (.js)" },
    { id: "typescript", label: "TypeScript (.ts)" },
    { id: "html", label: "HTML (.html)" },
    { id: "css", label: "CSS (.css)" },
    { id: "python", label: "Python (.py)" },
    { id: "cpp", label: "C++ (.cpp)" },
    { id: "java", label: "Java (.java)" }
  ];

  // Simulated active speech interval when unmuted and in a call
  useEffect(() => {
    if (!isInVoiceCall || isMuted || !currentRoomCode) return;

    const speechSimulation = setInterval(() => {
      // 55% chance they speak during each interval to simulate a live speaking waveform
      const isSpeakingNow = Math.random() > 0.45;
      const docRef = doc(db, "liveCoding", currentRoomCode);
      updateDoc(docRef, {
        [`participants.${myUserId}.isTalking`]: isSpeakingNow
      }).catch(() => {});
    }, 1500);

    return () => {
      clearInterval(speechSimulation);
      // Clean up speaking status when leaving call or muting
      const docRef = doc(db, "liveCoding", currentRoomCode);
      updateDoc(docRef, {
        [`participants.${myUserId}.isTalking`]: false
      }).catch(() => {});
    };
  }, [isInVoiceCall, isMuted, currentRoomCode, myUserId]);

  // Handle voice actions: Join / Leave Call
  const toggleVoiceCallRole = async () => {
    if (!currentRoomCode) return;
    const docRef = doc(db, "liveCoding", currentRoomCode);
    const nextCallState = !isInVoiceCall;
    
    try {
      await updateDoc(docRef, {
        [`participants.${myUserId}.isInVoiceCall`]: nextCallState,
        [`participants.${myUserId}.isMuted`]: nextCallState ? true : false, // Join muted by default
        [`participants.${myUserId}.isTalking`]: false
      });
      
      const msg = nextCallState 
        ? (language === "bn" ? "ভয়েস চ্যানেলে যুক্ত হয়েছেন! গান বা কথা বলতে মাইক আনমিউট করুন।" : "Joined live voice room! Unmute your mic to talk.")
        : (language === "bn" ? "ভয়েস চ্যানেল ত্যাগ করেছেন।" : "Disconnected from live voice room.");
      showStatus(msg, "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Mute / Unmute toggler
  const toggleCallMute = async () => {
    if (!currentRoomCode || !isInVoiceCall) return;
    const docRef = doc(db, "liveCoding", currentRoomCode);
    const nextMuteState = !isMuted;
    
    try {
      await updateDoc(docRef, {
        [`participants.${myUserId}.isMuted`]: nextMuteState,
        [`participants.${myUserId}.isTalking`]: nextMuteState ? false : true
      });
      
      const msg = nextMuteState 
        ? (language === "bn" ? "মাইক্রোফোন মিউট করা হয়েছে।" : "Microphone muted.")
        : (language === "bn" ? "মাইক্রোফোন সচল (আনমিউট) করা হয়েছে!" : "Microphone is now active!");
      showStatus(msg, nextMuteState ? "info" : "success");
    } catch (err) {
      console.error(err);
    }
  };

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

  // Upload static physical file and dump directly into editor draft
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canEdit) {
      showStatus(
        language === "bn" ? "কোড এডিটরটি লক করা আছে! ফাইল ইমপোর্ট করা যাবে না।" : "Editor is locked! Cannot upload file content.",
        "error"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text !== undefined) {
        handleLocalCodeChange(text);
        
        // Auto-detect extension to dynamically shift language if found
        let detectedLang = "javascript";
        const filename = file.name.toLowerCase();
        if (filename.endsWith(".html") || filename.endsWith(".htm")) detectedLang = "html";
        else if (filename.endsWith(".css")) detectedLang = "css";
        else if (filename.endsWith(".py")) detectedLang = "python";
        else if (filename.endsWith(".cpp") || filename.endsWith(".cc") || filename.endsWith(".h")) detectedLang = "cpp";
        else if (filename.endsWith(".java")) detectedLang = "java";
        else if (filename.endsWith(".ts") || filename.endsWith(".tsx")) detectedLang = "typescript";

        if (isOwner && detectedLang !== liveLanguage) {
          const docRef = doc(db, "liveCoding", currentRoomCode);
          updateDoc(docRef, { language: detectedLang }).catch(() => {});
        }

        showStatus(
          language === "bn" 
            ? `সফলভাবে '${file.name}' ফাইলটির কোড ক্যানভাসে ইমপোর্ট করা হয়েছে!` 
            : `Successfully imported code from '${file.name}' local file!`, 
          "success"
        );
      }
    };
    reader.readAsText(file);
    // Reset file input back
    e.target.value = "";
  };

  // Import static file uploaded in the room files list repository over API
  const importSharedRoomFile = async (fileId: string, fileName: string) => {
    if (!canEdit) {
      showStatus(
        language === "bn" ? "কোড এডিটরটি লক করা আছে! ফাইল ইমপোর্ট করা যাবে না।" : "Editor is locked! Cannot download file content.",
        "error"
      );
      return;
    }

    try {
      const downloadUrl = `/api/download/${currentRoomCode}/${fileId}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Could not fetch file content.");
      const fileText = await res.text();
      
      handleLocalCodeChange(fileText);
      setIsImportDropdownOpen(false);

      // Auto-change programming language if owner
      let detectedLang = "javascript";
      const nameL = fileName.toLowerCase();
      if (nameL.endsWith(".html") || nameL.endsWith(".htm")) detectedLang = "html";
      else if (nameL.endsWith(".css")) detectedLang = "css";
      else if (nameL.endsWith(".py")) detectedLang = "python";
      else if (nameL.endsWith(".cpp") || nameL.endsWith(".cc")) detectedLang = "cpp";
      else if (nameL.endsWith(".java")) detectedLang = "java";
      else if (nameL.endsWith(".ts") || nameL.endsWith(".tsx")) detectedLang = "typescript";

      if (isOwner && detectedLang !== liveLanguage) {
        const docRef = doc(db, "liveCoding", currentRoomCode);
        await updateDoc(docRef, { language: detectedLang });
      }

      showStatus(
        language === "bn" 
          ? `রুম ফাইল '${fileName}' সফলভাবে এডিটরে লোড করা হয়েছে!` 
          : `Room file '${fileName}' loaded successfully into the collaborative canvas!`, 
        "success"
      );
    } catch (err) {
      console.error(err);
      showStatus(
        language === "bn" 
          ? "ফাইলটি লোড করা সম্ভব হয়নি। ফাইলটি সম্ভবত ট্যাক্সট ফরম্যাট এ নয়।" 
          : "Failed to read file. Please ensure it is a plain-text source file.", 
        "error"
      );
    }
  };

  // Get active editors currently typing (excluding current user)
  const activeTypingUsers = Object.entries(liveActiveEditors)
    .filter(([uid, meta]) => uid !== myUserId && meta.isEditing && (Date.now() - meta.updatedAt < 5000))
    .map(([_, meta]) => meta.name);

  // Filter out actual participants to show in the permissions list (excluding the owner themselves)
  const guestParticipants = Object.values(liveParticipants).filter(p => p.uid !== liveOwnerId);

  // Filter participants active on the live Voice session 
  const voiceChannelMembers = Object.values(liveParticipants).filter(p => !!p.isInVoiceCall);

  return (
    <div className="flex flex-col gap-6 w-full text-left" id="live-coding-suite-root">
      
      {/* SECTION 1: Dynamic Secured voice dashboard */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-305 ${
        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-205 text-slate-900"
      }`} id="live-voice-presence-hub">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex items-center justify-center relative ${
              voiceChannelMembers.length > 0 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-blue-500/10 text-blue-500 border border-blue-500/10"
            }`}>
              <Volume2 className={`h-5 w-5 ${voiceChannelMembers.length > 0 ? "animate-pulse" : ""}`} />
              {voiceChannelMembers.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase block">
                {language === "bn" ? "রিয়েল-টাইম কনফারেন্স রুম" : "SIMULATED REAL-TIME VOICE ROOM"}
              </span>
              <h4 className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                {language === "bn" ? "লাইভ কোলাবোরেটিভ ভয়েস চ্যাট" : "Live Group Voice Channel"}
                <span className={`inline-block py-0.5 px-2 text-[9px] rounded-full font-bold ${voiceChannelMembers.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-400/20 text-slate-400"}`}>
                  {voiceChannelMembers.length} active
                </span>
              </h4>
            </div>
          </div>

          {/* Action Trigger Buttons for Call participation */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Join or Leave Call Toggle */}
            <button
              onClick={toggleVoiceCallRole}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl font-bold text-xs uppercase cursor-pointer tracking-wider transition-all border ${
                isInVoiceCall 
                  ? "bg-rose-500 hover:bg-rose-600 border-rose-600 text-white shadow-sm"
                  : "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-md shadow-blue-500/10"
              }`}
            >
              {isInVoiceCall ? (
                <>
                  <PhoneOff className="h-3.5 w-3.5" />
                  <span>{language === "bn" ? "ভয়েস ত্যাগ করুন" : "Disconnect"}</span>
                </>
              ) : (
                <>
                  <Phone className="h-3.5 w-3.5" />
                  <span>{language === "bn" ? "ভয়েস কলে যোগ দিন" : "Join Channel"}</span>
                </>
              )}
            </button>

            {/* Mute Mic toggler (Only shows if joined) */}
            {isInVoiceCall && (
              <button
                onClick={toggleCallMute}
                className={`p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer ${
                  isMuted 
                    ? "bg-amber-500 hover:bg-amber-600 border-amber-600 text-white" 
                    : "bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 animate-pulse" />}
              </button>
            )}
          </div>
        </div>

        {/* Audio Active Members Presences Grid Layout */}
        <div className="pt-4">
          {voiceChannelMembers.length === 0 ? (
            <div className="flex items-center gap-2.5 text-xs text-slate-400 opacity-70 p-2 border border-dashed rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
              <Info className="h-4 w-4 text-blue-500" />
              <span>
                {language === "bn" 
                  ? "ভয়েস চ্যানেলে কেউ যুক্ত নেই। যোগ দিন এবং টিম মেম্বারদের সাথে কথা বলা শুরু করুন!" 
                  : "No one is in the voice room format yet. Click 'Join Channel' to hook up with team members."}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {voiceChannelMembers.map(member => (
                <div 
                  key={member.uid} 
                  className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all relative ${
                    member.isTalking && !member.isMuted
                      ? "border-emerald-500 bg-emerald-500/5 shadow-xs shadow-emerald-500/10 ring-1 ring-emerald-500/35"
                      : theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-150"
                  }`}
                >
                  {/* Status Ring Aura Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black relative shrink-0 ${
                    member.isTalking && !member.isMuted
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900"
                      : "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                  }`}>
                    {member.name ? member.name[0].toUpperCase() : "U"}
                    
                    {/* Talking Equalizer Wave animation bubble in the avatar corner */}
                    {member.isTalking && !member.isMuted && (
                      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border border-white dark:border-slate-900 flex items-center justify-center p-0.5">
                        <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-[11px] font-black block truncate leading-tight text-slate-800 dark:text-slate-100">
                      {member.name || member.email.split("@")[0]}
                    </span>
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1 leading-none mt-1">
                      {member.isMuted ? (
                        <span className="text-rose-500 flex items-center gap-0.5">
                          <MicOff className="h-2 w-2" /> Muted
                        </span>
                      ) : (
                        <span className="text-emerald-500 flex items-center gap-1 font-bold animate-pulse">
                          {member.isTalking ? "Speaking..." : "Unmuted"}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Talking active mic frequency spikes */}
                  {member.isTalking && !member.isMuted && (
                    <div className="flex items-center gap-0.5 shrink-0 pr-1 h-3">
                      <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Collaborative Code Canvas + File Loaders */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative flex flex-col gap-4 shadow-sm ${
        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-205 text-slate-900"
      }`} id="collaborative-code-canvas">
        
        {/* Workspace Headers and Controllers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-950/40 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Terminal className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                {language === "bn" ? "রিয়েল-টাইম এডিটর" : "COLLABORATIVE REAL-TIME CANVAS"}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-black tracking-tight text-slate-850 dark:text-white">
                  {languagesList.find(l => l.id === liveLanguage)?.label || "JavaScript (.js)"}
                </span>
                {liveIsLocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Unlock className="h-2.5 w-2.5" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Code Utility Tools: Upload File, Import dropdown, Copy, Download */}
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
            
            {/* Import Room File button with expandable checklist dropdown */}
            {roomData && Object.keys(roomData.files).length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                  disabled={!canEdit}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isImportDropdownOpen
                      ? "bg-amber-600 text-white border-amber-600"
                      : theme === "dark" ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                  title="Import from shared room repository files"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>{language === "bn" ? "রুম ফাইল ইম্পোর্ট" : "Load Room File"}</span>
                </button>

                {isImportDropdownOpen && (
                  <div className={`absolute right-0 top-11 w-64 rounded-2xl border p-2 shadow-xl z-30 transition-all ${
                    theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-850 text-left">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        {language === "bn" ? "রুমের ফাইলসমূহ সিলেক্ট করুন" : "Select Room Document to Edit"}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto mt-1 space-y-1">
                      {Object.values(roomData.files).map(file => (
                        <button
                          key={file.id}
                          onClick={() => importSharedRoomFile(file.id, file.name)}
                          className={`w-full text-left p-2 rounded-xl hover:bg-blue-600/10 text-xs font-semibold flex items-center justify-between gap-2 overflow-hidden truncate transition-colors ${
                            theme === "dark" ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-950"
                          }`}
                        >
                          <span className="truncate flex-1 block">{file.name}</span>
                          <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden Input selector for Local source code files upload */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLocalFileUpload} 
              className="hidden" 
              accept=".js,.ts,.html,.htm,.css,.py,.cpp,.cc,.h,.java,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canEdit}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                theme === "dark" ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
              title="Import plain-text/source file from your machine directly into canvas"
            >
              <UploadCloud className="h-3.5 w-3.5 text-blue-500" />
              <span>{language === "bn" ? "লোকাল ফাইল" : "Load Local File"}</span>
            </button>

            {/* Language Selection Select (Host only) */}
            {isOwner ? (
              <select
                value={liveLanguage}
                onChange={handleLanguageChange}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-mono border focus:outline-none cursor-pointer ${
                  theme === "dark" 
                    ? "bg-slate-950 border-slate-800 text-slate-300" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                {languagesList.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400">
                Host: <span className="text-blue-500 font-bold">{liveOwnerName || "Anonymous"}</span>
              </span>
            )}

            {/* Safe locked status lock click */}
            {isOwner && (
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

        {/* Live HTML/JS render preview toggle controller */}
        {liveLanguage === "html" && (
          <div className="flex items-center justify-between pb-1 gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-extrabold select-none">
              <FileCode className="h-4 w-4 text-amber-500" />
              <span>{language === "bn" ? "এইচটিএমএল কোডিং স্যান্ডবক্স সক্রিয় আছে" : "Active HTML sandbox workspace detected!"}</span>
            </div>
            <button
              onClick={() => setShowHtmlPreview(!showHtmlPreview)}
              className={`text-xs font-bold py-1 px-3 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                showHtmlPreview
                  ? "bg-amber-500/10 text-amber-500 border-amber-500"
                  : theme === "dark" ? "bg-slate-800 text-slate-400 border-slate-705 hover:bg-slate-750" : "bg-slate-50 text-slate-600 border-slate-250 hover:bg-slate-100"
              }`}
            >
              {showHtmlPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>{language === "bn" ? "প্রিভিউ হাইড করুন" : "Hide Live Preview"}</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>{language === "bn" ? "লাইভ প্রিভিউ দেখুন" : "View Live Rendering"}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Split screen content pane: left code block / right HTML visualizer */}
        <div className={`grid grid-cols-1 ${liveLanguage === "html" && showHtmlPreview ? "lg:grid-cols-2" : ""} gap-4 w-full`} id="canvas-split-section">
          
          {/* Column A: Coding Canvas Area */}
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
              className={`w-full min-h-[385px] p-5 font-mono text-sm text-left focus:outline-none resize-y leading-relaxed scrollbar-thin transition-colors duration-300 ${
                !canEdit 
                  ? "bg-slate-100/50 dark:bg-slate-950/40 text-slate-400 select-all" 
                  : theme === "dark" ? "bg-slate-950 text-emerald-400 cursor-text" : "bg-slate-50 text-slate-850 cursor-text"
              }`}
              style={{ tabSize: 2 }}
            />

            {/* Locked Badge Overlay */}
            {!canEdit && (
              <div className="absolute inset-0 bg-slate-900/10 pointer-events-none backdrop-blur-[0.5px] transition-all flex items-center justify-center">
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

          {/* Column B: Sandbox Live Rendering Engine (Only if HTML active and checked) */}
          {liveLanguage === "html" && showHtmlPreview && (
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 min-h-[385px]" id="live-html-visualizer-pane">
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center px-4">
                <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 dark:text-slate-400 uppercase flex items-center gap-2 select-none">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {language === "bn" ? "স্যান্ডবক্স লাইভ রেন্ডারিং" : "SANDBOX LIVE RENDER"}
                </span>
                <button 
                  onClick={() => {
                    const iframe = document.getElementById("live-render-iframe") as HTMLIFrameElement;
                    if (iframe) iframe.srcdoc = localCode;
                  }}
                  className="text-[10px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                  title="Force re-rendering frame"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{language === "bn" ? "রিফ্রেশ" : "Refresh Frame"}</span>
                </button>
              </div>
              <iframe
                id="live-render-iframe"
                title="HTML Code Render Preview"
                sandbox="allow-scripts allow-modals"
                referrerPolicy="no-referrer"
                srcDoc={localCode}
                className="w-full flex-1 min-h-[320px] bg-white border-none"
              />
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

      {/* SECTION 3: Workspace guest permissions list (Owner configuration dashboard) */}
      {isOwner && (
        <div className={`p-5 rounded-2xl border transition-all duration-300 relative flex flex-col gap-4 shadow-sm ${
          theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-205 text-slate-900"
        }`} id="owner-permissions-desk">
          
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-950/40 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                  {language === "bn" ? "অ্যাক্সেস মেম্বারস পারমিশন কন্ট্রোল" : "Workspace Access Permissions"}
                </span>
                <span className="text-sm font-black tracking-tight mt-0.5 animate-pulse">
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
                    <div key={member.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0 text-left">
                      
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
