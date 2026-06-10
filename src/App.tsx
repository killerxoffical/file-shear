import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
import { auth, loginWithGoogle, logout, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { LandingPage } from "./LandingPage";
import { AuthModal } from "./AuthModal";
import { 
  FileUp, 
  Download, 
  Trash2, 
  Plus, 
  QrCode, 
  Copy, 
  Check, 
  LogOut, 
  Sparkles, 
  AlertCircle, 
  AlertTriangle,
  Zap,
  ZapOff,
  FileCheck, 
  Smartphone, 
  Monitor, 
  Languages, 
  RefreshCw,
  Loader2,
  HelpCircle,
  X,
  Camera,
  Sun,
  Moon,
  Share2,
  Lock,
  Unlock,
  Key,
  Shield,
  Activity,
  Send,
  Mic,
  Square,
  Image as ImageIcon,
  Volume2,
  HardDrive,
  MessageSquare,
  Clock,
  FileSearch,
  Upload,
  Terminal,
  Users,
  Settings
} from "lucide-react";
import { FileMeta, RoomState } from "./types";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatBytes, getFileIcon, formatTimeRemaining, formatRelativeTime } from "./utils";

// Play standard high-quality subtle chime sound using browser Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(volume, start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Elegant dual chime chord resonance (D5 and A5 synth design)
    playTone(587.33, now, 0.35, 0.07);
    playTone(880.00, now + 0.08, 0.45, 0.05);
  } catch (error) {
    console.warn("Audio chime playback blocked or unavailable:", error);
  }
};

export default function App() {
  // Device Presence Helpers
  const deviceId = useMemo(() => {
    let id = localStorage.getItem("share_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("share_device_id", id);
    }
    return id;
  }, []);

  const deviceName = useMemo(() => {
    const ua = navigator.userAgent;
    let os = "Device";
    if (ua.match(/iPhone/i)) os = "iPhone";
    else if (ua.match(/iPad/i)) os = "iPad";
    else if (ua.match(/Android/i)) os = "Android Phone";
    else if (ua.match(/Windows/i)) os = "Windows PC";
    else if (ua.match(/Macish/i) || ua.match(/Macintosh/i)) os = "Mac workstation";
    else if (ua.match(/Linux/i)) os = "Linux Machine";

    let browser = "Browser";
    if (ua.match(/Chrome/i)) browser = "Chrome";
    else if (ua.match(/Safari/i) && !ua.match(/Chrome/i)) browser = "Safari";
    else if (ua.match(/Firefox/i)) browser = "Firefox";
    else if (ua.match(/Edge/i)) browser = "Edge";

    return `${os} (${browser})`;
  }, []);

  const guestNickname = useMemo(() => {
    let saved = localStorage.getItem("share_guest_nickname");
    if (!saved) {
      const adjectives = ["Ruby", "Sapphire", "Emerald", "Amber", "Slate", "Cobalt", "Topaz", "Jade"];
      const nouns = ["Coder", "Developer", "Creator", "Hacker", "Designer", "Innovator", "Architect"];
      const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
      saved = `${randAdj} ${randNoun}`;
      localStorage.setItem("share_guest_nickname", saved);
    }
    return saved;
  }, []);

  // App navigation state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<"rooms" | "users">("rooms");

  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomState | null>(null);
  const [isSyncActive, setIsSyncActive] = useState<boolean>(true);

  // Auth & Credit listener
  useEffect(() => {
    let unsubscribeCredits: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoaded(true);

      if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // One-time check / initialization to avoid write loops inside real-time listener
        getDoc(userRef).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.credits === undefined) {
              setDoc(userRef, { credits: 500, createdAt: Date.now() }, { merge: true });
            } else {
              // Just update log and email, preserving existing credits
              updateDoc(userRef, {
                email: user.email || "Unknown",
                lastLog: Date.now()
              }).catch(err => console.error("Error updating log state:", err));
            }
          } else {
            // Document doesn't exist, create it with 500 credits
            setDoc(userRef, {
              email: user.email || "Unknown",
              credits: 500,
              createdAt: Date.now(),
              lastLog: Date.now()
            }).catch(err => console.error("Error creating user doc:", err));
          }

          // Real-time synchronization only for reading (NO writing here)
          unsubscribeCredits = onSnapshot(userRef, (docSnap) => {
            setIsSyncActive(true);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.credits !== undefined) {
                setCredits(data.credits);
              }
            }
          }, (error) => {
            console.error("Error on user credits snapshot:", error);
            setIsSyncActive(false);
          });
        }).catch(err => console.error("Error reading user doc:", err));
      } else {
        setCredits(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCredits) unsubscribeCredits();
    };
  }, []);
  
  // Forms & Inputs
  const [roomIdInput, setRoomIdInput] = useState<string>("");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Passcode states
  const [createPasscode, setCreatePasscode] = useState("");
  const [usePasscode, setUsePasscode] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isCheckingPasscode, setIsCheckingPasscode] = useState(false);

  // Upload mechanics
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [autoDeleteOnDownload, setAutoDeleteOnDownload] = useState<boolean>(true); // Default true for user requested unlimited style
  
  // Staged Upload Options & Local Previews
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedMaxDownloads, setStagedMaxDownloads] = useState<number>(1); // Default to 1-time download
  const [stagedExpiresIn, setStagedExpiresIn] = useState<number>(60); // Default to 60 mins (1 hour)
  const [stagedPasscode, setStagedPasscode] = useState<string>("");
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [stagedTextContent, setStagedTextContent] = useState<string | null>(null);
  
  // File Download Passcode Lock states
  const [pendingDownloadFile, setPendingDownloadFile] = useState<FileMeta | null>(null);
  const [inputFilePasscode, setInputFilePasscode] = useState<string>("");
  const [filePasscodeError, setFilePasscodeError] = useState<string | null>(null);
  const [isVerifyingFilePasscode, setIsVerifyingFilePasscode] = useState<boolean>(false);

  // Live Chat inside Active Room State & Recording mechanisms
  const [chatInputText, setChatInputText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [transcriptionText, setTranscriptionText] = useState<string>("");
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const transcriptionRef = useRef<string>("");
  const audioChunksRef = useRef<Blob[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // Distinguishable node identifier for live chat bubble placement
  const [sessionSenderId] = useState<string>(() => {
    const saved = localStorage.getItem("chat_sender_id");
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 11);
    localStorage.setItem("chat_sender_id", newId);
    return newId;
  });

  // Live Coding & Collaborative Editor Workspace States
  const [activeTab, setActiveTab] = useState<"files">("files");
  const [createRoomType] = useState<"share">("share");
  const [liveCode, setLiveCode] = useState<string>("");
  const [localCode, setLocalCode] = useState<string>("");
  const [liveLanguage, setLiveLanguage] = useState<string>("javascript");
  const [liveIsLocked, setLiveIsLocked] = useState<boolean>(false);
  const [liveOwnerId, setLiveOwnerId] = useState<string>("");
  const [liveOwnerName, setLiveOwnerName] = useState<string>("");
  const [liveOwnerEmail, setLiveOwnerEmail] = useState<string>("");
  const [livePermissions, setLivePermissions] = useState<Record<string, { edit?: boolean; download?: boolean; email?: string; name?: string }>>({});
  const [liveActiveEditors, setLiveActiveEditors] = useState<Record<string, { name: string; isEditing: boolean; updatedAt: number }>>({});
  const [liveParticipants, setLiveParticipants] = useState<Record<string, { uid: string; email: string; name: string; deviceId: string; lastSeen: number }>>({});
  const lastTypedRef = useRef<number>(0);

  // Collaborative Room Listener
  useEffect(() => {
    if (!currentRoomCode) {
      setLiveCode("");
      setLocalCode("");
      setLivePermissions({});
      setLiveActiveEditors({});
      setLiveParticipants({});
      return;
    }

    const docRef = doc(db, "liveCoding", currentRoomCode);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsSyncActive(true);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveLanguage(data.language || "javascript");
        setLiveIsLocked(!!data.isLocked);
        setLiveOwnerId(data.ownerId || "");
        setLiveOwnerName(data.ownerName || "");
        setLiveOwnerEmail(data.ownerEmail || "");
        setLivePermissions(data.permissions || {});
        setLiveActiveEditors(data.activeEditors || {});
        setLiveParticipants(data.participants || {});

        const codeVal = data.code ?? "";
        setLiveCode(codeVal);

        // Crucial: Only update local edit box if someone else edited it and we are not recently typing,
        // or if localCode is empty, to safeguard cursor position!
        const now = Date.now();
        const weAreTyping = now - lastTypedRef.current < 2500;
        const myUserId = currentUser?.uid || deviceId;
        if (data.updatedByUid !== myUserId || !weAreTyping) {
          setLocalCode(codeVal);
        }
      } else {
        // Create initial live coding document if it doesn't exist
        const initialObj = {
          code: `// Welcome to Live Collaborative Workspace\n// Start coding in real-time with your team here!\n\nfunction main() {\n  console.log("Hello, World!");\n}`,
          language: "javascript",
          isLocked: false,
          ownerId: currentUser?.uid || deviceId || "anonymous",
          ownerName: currentUser?.displayName || currentUser?.email?.split('@')[0] || guestNickname,
          ownerEmail: currentUser?.email || "guest@no-email.com",
          permissions: {},
          activeEditors: {},
          participants: {},
          updatedAt: Date.now()
        };
        setDoc(docRef, initialObj).catch((e) => console.error("Error creating initial liveCoding:", e));
        setLiveLanguage("javascript");
        setLiveIsLocked(false);
        setLiveOwnerId(currentUser?.uid || deviceId || "anonymous");
        setLiveOwnerName(currentUser?.displayName || currentUser?.email?.split('@')[0] || guestNickname);
        setLiveOwnerEmail(currentUser?.email || "guest@no-email.com");
        setLiveCode(initialObj.code);
        setLocalCode(initialObj.code);
      }
    }, (error) => {
      console.error("Error in liveCoding snapshot:", error);
      setIsSyncActive(false);
    });

    return () => unsubscribe();
  }, [currentRoomCode, currentUser, deviceId, guestNickname]);

  // Handle local participant presence registration inside Live Coding collection
  useEffect(() => {
    if (currentRoomCode) {
      const myUserId = currentUser?.uid || deviceId;
      const myUserName = currentUser?.displayName || currentUser?.email?.split("@")[0] || guestNickname;
      const myUserEmail = currentUser?.email || `Guest (${guestNickname})`;
      const docRef = doc(db, "liveCoding", currentRoomCode);
      const userKey = `participants.${myUserId}`;
      updateDoc(docRef, {
        [userKey]: {
          uid: myUserId,
          email: myUserEmail,
          name: myUserName,
          deviceId: deviceId,
          lastSeen: Date.now()
        }
      }).catch(err => {});
    }
  }, [currentRoomCode, currentUser, activeTab, deviceId, guestNickname]);

  // 2s Idle Typing Timer to reset client-side edit flag
  useEffect(() => {
    if (!currentRoomCode) return;
    const myUserId = currentUser?.uid || deviceId;

    const timer = setInterval(() => {
      const weAreIdle = Date.now() - lastTypedRef.current > 3000;
      if (weAreIdle && liveActiveEditors[myUserId]?.isEditing) {
        const docRef = doc(db, "liveCoding", currentRoomCode);
        updateDoc(docRef, {
          [`activeEditors.${myUserId}.isEditing`]: false
        }).catch(err => {});
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [currentRoomCode, currentUser, liveActiveEditors, deviceId]);
  
  // UI states
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showAppQrModal, setShowAppQrModal] = useState<boolean>(false);
  const [showBulkDownloadConfirm, setShowBulkDownloadConfirm] = useState<boolean>(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState<{
    currentFileName: string;
    currentIndex: number;
    totalFiles: number;
    percent: number;
  } | null>(null);
  const [appQrCodeDataUrl, setAppQrCodeDataUrl] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [language, setLanguage] = useState<"en" | "bn">("en"); // Default to English as requested
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" >(() => {
    const saved = localStorage.getItem("app-theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  // QR scanner states
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"checking" | "active" | "blocked">("checking");
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  
  // Timer ticking for countdown remaining
  const [tick, setTick] = useState<number>(0);

  const [useRelativeChatTime, setUseRelativeChatTime] = useState<boolean>(() => {
    const saved = localStorage.getItem("app-relative-time");
    return saved ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("app-relative-time", String(useRelativeChatTime));
  }, [useRelativeChatTime]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const seenFileIdsRef = useRef<Set<string>>(new Set());
  const activeRoomRef = useRef<string | null>(null);

  // Monitor files and trigger custom chime alert when a transfer arrives
  useEffect(() => {
    if (!currentRoomCode) {
      seenFileIdsRef.current.clear();
      activeRoomRef.current = null;
      return;
    }

    // If joining or opening a fresh room, track pre-existing files without chiming
    if (activeRoomRef.current !== currentRoomCode) {
      activeRoomRef.current = currentRoomCode;
      seenFileIdsRef.current = new Set(roomData ? Object.keys(roomData.files || {}) : []);
      return;
    }

    if (!roomData || !roomData.files) return;

    const currentFileIds = Object.keys(roomData.files);
    let hasNewFile = false;

    // Detect if we have any newly arrived files in the buffer
    for (const id of currentFileIds) {
      if (!seenFileIdsRef.current.has(id)) {
        seenFileIdsRef.current.add(id);
        hasNewFile = true;
      }
    }

    if (hasNewFile) {
      playNotificationSound();
    }
  }, [roomData, currentRoomCode]);

  // Track and synchronize chat message log auto-scrolling
  useEffect(() => {
    if (roomData?.messages && roomData.messages.length > 0) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [roomData?.messages?.length]);

  // Clean recording timers on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Toggle chat message reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentRoomCode) return;

    // Optimistic UI Update: locally toggle the reaction for instant feedback
    if (roomData && roomData.messages) {
      const updatedMessages = roomData.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = [...(currentReactions[emoji] || [])];
        const userIdx = users.indexOf(sessionSenderId);
        if (userIdx > -1) {
          users.splice(userIdx, 1);
        } else {
          users.push(sessionSenderId);
        }
        if (users.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = users;
        }
        return { ...m, reactions: currentReactions };
      });
      setRoomData({ ...roomData, messages: updatedMessages });
    }

    try {
      const response = await fetch(`/api/chat/${currentRoomCode}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-room-passcode": currentPasscode || "",
        },
        body: JSON.stringify({
          messageId,
          emoji,
          senderId: sessionSenderId,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.messages && roomData) {
          setRoomData({ ...roomData, messages: json.messages });
        }
      } else {
        const err = await response.json().catch(() => ({}));
        showStatus(err.error || "Failed to update reaction.", "error");
        fetchRoomInfo(currentRoomCode, true);
      }
    } catch (e) {
      showStatus("Connection error updating reaction.", "error");
      fetchRoomInfo(currentRoomCode, true);
    }
  };

  // Live Chat Delivery integration endpoint Caller
  const sendChatMessage = async (type: "text" | "voice" | "image" | "file_request" = "text", customContent?: string, extraData?: any) => {
    if (!currentRoomCode) return;
    
    const contentToSend = customContent !== undefined ? customContent : chatInputText;
    if (type === "text" && !contentToSend.trim()) return;

    try {
      const response = await fetch(`/api/chat/${currentRoomCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-room-passcode": currentPasscode,
        },
        body: JSON.stringify({
          senderId: sessionSenderId,
          senderName: deviceName || "Anonymous Node",
          type,
          content: contentToSend,
          transcription: extraData?.transcription,
        }),
      });

      if (response.ok) {
        if (type === "text") {
          setChatInputText("");
        }
        // Force silent refreshes
        fetchRoomInfo(currentRoomCode, true);
        
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        const err = await response.json().catch(() => ({}));
        showStatus(err.error || "Failed to transmit message on bridge.", "error");
      }
    } catch (e) {
      showStatus("Connection error transmitting chat message.", "error");
    }
  };

  // Browser-native Mic hardware audio recording engine
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Start Web Speech API Recognition
      transcriptionRef.current = "";
      setTranscriptionText("");
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "bn" ? "bn-BD" : "en-US";
        
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
             currentTranscript += event.results[i][0].transcript;
          }
          transcriptionRef.current = currentTranscript;
          setTranscriptionText(currentTranscript);
        };
        
        recognition.onerror = (e: any) => console.log("Speech recognition error", e);
        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendChatMessage("voice", base64Audio, { transcription: transcriptionRef.current });
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
        
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      showStatus(language === "bn" ? "ভয়েস রেকর্ড হচ্ছে..." : "Recording voice clip...", "info");
    } catch (err) {
      console.error("Audio recording error:", err);
      showStatus(language === "bn" ? "মাইক্রোফোন চালু করতে ব্যর্থ!" : "Failed to access microphone hardware.", "error");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTranscriptionText("");
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    }
  };

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        sendChatMessage("image", event.target.result as string);
        showStatus(language === "bn" ? "সংযুক্ত ইমেজ পাঠানো হয়েছে!" : "Attached image sent successfully!", "success");
      }
    };
    reader.readAsDataURL(file);
    if (chatImageInputRef.current) {
      chatImageInputRef.current.value = "";
    }
  };

  // Synchronize theme with localstorage and documentElement
  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Check URL params for joining via QR code scan automatically
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const passParam = params.get("passcode");
    if (roomParam && /^\d{4}$/.test(roomParam)) {
      if (passParam) {
        localStorage.setItem(`room_pass_${roomParam}`, passParam);
        setCurrentPasscode(passParam);
      }
      joinRoom(roomParam);
      // Clean up URL so they can navigate normally
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Poll for room updates when inside a room
  useEffect(() => {
    if (!currentRoomCode) return;

    // Load saved passcode for this room from local storage if state is empty
    const savedPasscode = localStorage.getItem(`room_pass_${currentRoomCode}`) || "";
    if (savedPasscode && !currentPasscode) {
      setCurrentPasscode(savedPasscode);
    }

    const activePass = currentPasscode || savedPasscode;

    // Initial fetch
    fetchRoomInfo(currentRoomCode, false, activePass);

    const interval = setInterval(() => {
      fetchRoomInfo(currentRoomCode, true, activePass);
    }, 2500); // Poll every 2.5 seconds for instant file updates across devices

    return () => clearInterval(interval);
  }, [currentRoomCode, currentPasscode]);

  // Expiration Clock tick (every second)
  useEffect(() => {
    const clock = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Listen to browser network online/offline events for connection status
  useEffect(() => {
    const handleOnline = () => setIsSyncActive(true);
    const handleOffline = () => setIsSyncActive(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync initial online status
    if (!navigator.onLine) {
      setIsSyncActive(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Generate QR code dynamically when room changes
  useEffect(() => {
    if (currentRoomCode) {
      // Build absolute join link containing ?room=XXXX
      const joinUrl = `${window.location.origin}/?room=${currentRoomCode}`;
      QRCode.toDataURL(joinUrl, { width: 300, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error("QR Code generation error:", err);
        });
    }
  }, [currentRoomCode]);

  // Generate QR code for the application itself to connect from secondary device
  useEffect(() => {
    const appUrl = window.location.origin;
    QRCode.toDataURL(appUrl, { width: 300, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((url) => {
        setAppQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error("App QR Code generation error:", err);
      });
  }, []);

  // Active QR Camera scanner effect
  useEffect(() => {
    if (!showScanner) {
      setScannerError(null);
      setIsTorchSupported(false);
      setIsTorchOn(false);
      scannerInstanceRef.current = null;
      return;
    }

    setCameraStatus("checking");
    let html5QrCode: Html5Qrcode | null = null;
    let isStopped = false;
    setIsTorchSupported(false);
    setIsTorchOn(false);

    // Use a small timeout to let the modal mount first
    const timer = setTimeout(() => {
      if (isStopped) return;
      try {
        html5QrCode = new Html5Qrcode("qr-scanner-viewport");
        scannerInstanceRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            let code = "";
            if (/^\d{4}$/.test(decodedText)) {
              code = decodedText;
            } else {
              try {
                const url = new URL(decodedText);
                const roomParam = url.searchParams.get("room");
                if (roomParam && /^\d{4}$/.test(roomParam)) {
                  code = roomParam;
                }
              } catch (e) {
                const match = decodedText.match(/\b\d{4}\b/);
                if (match) {
                  code = match[0];
                }
              }
            }

            if (code) {
              joinRoom(code);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                  setShowScanner(false);
                }).catch(err => {
                  console.error("Error stopping qr scanner:", err);
                  setShowScanner(false);
                });
              } else {
                setShowScanner(false);
              }
            } else {
              setScannerError(
                language === "bn" 
                  ? "সঠিক শেয়ার রুম কোড সনাক্ত করা যায়নি।" 
                  : "Could not find a valid 4-digit room code in the scanned QR."
              );
            }
          },
          () => {}
        ).then(() => {
          if (isStopped || !html5QrCode) return;
          setCameraStatus("active");
          // Inspect torch/flashlight availability with a small delay
          setTimeout(() => {
            if (isStopped || !html5QrCode) return;
            let hasTorch = false;
            try {
              const capabilities = html5QrCode.getRunningTrackCapabilities();
              if (capabilities && (capabilities as any).torch) {
                hasTorch = true;
              }
            } catch (e) {
              console.warn("getRunningTrackCapabilities torch check failed:", e);
            }

            if (!hasTorch) {
              // Try manual check on track
              try {
                const video = document.querySelector("#qr-scanner-viewport video") as HTMLVideoElement;
                if (video && video.srcObject) {
                  const stream = video.srcObject as MediaStream;
                  const track = stream.getVideoTracks()[0];
                  if (track && typeof track.getCapabilities === "function") {
                    const caps = track.getCapabilities();
                    if ("torch" in caps) {
                      hasTorch = true;
                    }
                  }
                }
              } catch (e) {
                console.warn("Manual track capability checks failed too:", e);
              }
            }
            setIsTorchSupported(hasTorch);
          }, 350);
        }).catch((err) => {
          console.error("Camera start failed:", err);
          setCameraStatus("blocked");
          setScannerError(
            language === "bn" 
              ? "ক্যামেরা চালু করা যায়নি বা পারমিশন দেয়া হয়নি।" 
              : "Camera access was denied or not found. Please verify permissions."
          );
        });
      } catch (err) {
        console.error("Failed to initialize Html5Qrcode:", err);
        setCameraStatus("blocked");
      }
    }, 150);

    return () => {
      isStopped = true;
      clearTimeout(timer);
      scannerInstanceRef.current = null;
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch((e) => console.error("Error stopping scanner on cleanup:", e));
        }
      }
    };
  }, [showScanner]);

  // Fetch Room information
  const fetchRoomInfo = async (code: string, isSilent: boolean = false, passcodeOverride?: string) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const passcodeToSend = passcodeOverride !== undefined ? passcodeOverride : currentPasscode;
      const response = await fetch(`/api/room/${code}?deviceId=${deviceId}&deviceName=${encodeURIComponent(deviceName)}&passcode=${passcodeToSend}`, {
        headers: {
          "x-room-passcode": passcodeToSend
        }
      });
      
      if (response.status === 401) {
        setPendingRoomCode(code);
        setPasscodeError(passcodeOverride ? "Incorrect passcode." : null);
        return false;
      }

      if (response.status === 404) {
        const err = await response.json().catch(() => ({}));
        setRoomError(err.error || "Room not found or expired. Create a new one!");
        setCurrentRoomCode(null);
        setRoomData(null);
        return false;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Room expired or unavailable.");
      }
      
      const data = await response.json();
      setRoomData(data);
      setRoomError(null);
      setIsSyncActive(true);
      
      if (passcodeToSend) {
        setCurrentPasscode(passcodeToSend);
        localStorage.setItem(`room_pass_${code}`, passcodeToSend);
      }
      
      return true;
    } catch (err: any) {
      console.error(err);
      setIsSyncActive(false);
      if (!isSilent) {
        setRoomError(err.message || "Failed to fetch room files.");
        setCurrentRoomCode(null);
        setRoomData(null);
      }
      return false;
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  };

  // Create active sharing room with optional passcode
  const createRoom = async () => {
    const cost = 100;
    if (credits === null || credits < cost) {
      const msg = language === "bn"
        ? `পর্যাপ্ত কয়েন নেই! এই রুম তৈরি করতে ${cost} টি কয়েন লাগবে (আপনার আছে: ${credits || 0})।`
        : `Not enough credits! Creating this room costs ${cost} credits (you have ${credits || 0}).`;
      showStatus(msg, "error");
      return;
    }

    try {
      // Deduct credits first using Firestore
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { credits: credits - cost });
      }

      const passcodeParam = usePasscode ? createPasscode.trim() : "";
      const response = await fetch("/api/room/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          passcode: passcodeParam,
          ownerId: currentUser?.uid,
          ownerEmail: currentUser?.email,
          ownerName: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Owner",
          roomType: "share"
        }),
      });
      const data = await response.json();
      if (data.success && data.code) {
        if (usePasscode && passcodeParam) {
          setCurrentPasscode(passcodeParam);
          localStorage.setItem(`room_pass_${data.code}`, passcodeParam);
        } else {
          setCurrentPasscode("");
        }
        
        setActiveTab("files");

        setCurrentRoomCode(data.code);
        setRoomError(null);
        setCreatePasscode("");
        setUsePasscode(false);
        
        const successMsg = language === "bn" ? `নতুন শেয়ার রুম সফলভাবে তৈরি হয়েছে! (-${cost} কয়েন)` : `New share room created successfully! (-${cost} credits)`;
        showStatus(successMsg, "success");
      }
    } catch (err) {
      console.error(err);
      showStatus("Could not create dynamic room.", "error");
    }
  };

  // Join existing room
  const joinRoom = async (codeToJoin?: string) => {
    const targetCode = codeToJoin || roomIdInput.trim();
    if (!targetCode) {
      setRoomError("Please enter a 4-digit code.");
      return;
    }
    if (!/^\d{4}$/.test(targetCode)) {
      setRoomError("Room code must be exactly 4 digits.");
      return;
    }

    const savedPass = localStorage.getItem(`room_pass_${targetCode}`) || "";

    setIsRefreshing(true);
    try {
      const success = await fetchRoomInfo(targetCode, false, savedPass);
      if (success) {
        setCurrentRoomCode(targetCode);
        setRoomIdInput("");
        setRoomError(null);
        showStatus("Successfully joined room!", "success");
      }
    } catch (err: any) {
      setRoomError(err.message || "Could not find that room. It may have expired.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Exit Room
  const leaveRoom = () => {
    setCurrentRoomCode(null);
    setRoomData(null);
    setQrCodeDataUrl("");
    setShowQrModal(false);
    setRoomError(null);
  };

  // Verify passcode input to join password protected room
  const handleVerifyPasscode = async () => {
    if (!pendingRoomCode) return;
    setIsCheckingPasscode(true);
    setPasscodeError(null);
    const success = await fetchRoomInfo(pendingRoomCode, false, inputPasscode);
    setIsCheckingPasscode(false);
    if (success) {
      setCurrentRoomCode(pendingRoomCode);
      setPendingRoomCode(null);
      setInputPasscode("");
      setPasscodeError(null);
      showStatus("Successfully entered passcode-protected room!", "success");
    } else {
      setPasscodeError("Incorrect passcode. Please try again.");
    }
  };

  // Download logic with individual file passcode verification
  const handleVerifyFilePasscode = async () => {
    if (!pendingDownloadFile || !currentRoomCode) return;
    setIsVerifyingFilePasscode(true);
    setFilePasscodeError(null);

    try {
      // Test the individual passcode with a preview check call
      const url = `/api/download/${currentRoomCode}/${pendingDownloadFile.id}?preview=true&filePasscode=${inputFilePasscode}`;
      const response = await fetch(url, {
        headers: currentPasscode ? { "x-room-passcode": currentPasscode } : {}
      });

      if (response.status === 200) {
        // Correct passcode! Open full download in new tab
        const ioUrl = `/api/download/${currentRoomCode}/${pendingDownloadFile.id}?filePasscode=${inputFilePasscode}${currentPasscode ? `&roomPasscode=${currentPasscode}` : ""}`;
        window.open(ioUrl, "_blank");

        showStatus(
          language === "bn" 
            ? "পাসওয়ার্ড সঠিক! ডাউনলোড সফলভাবে শুরু হচ্ছে।" 
            : "Authorized passcode! Initiating secure download stream.", 
          "success"
        );

        setTimeout(() => {
          fetchRoomInfo(currentRoomCode);
        }, 2200);

        setPendingDownloadFile(null);
        setInputFilePasscode("");
        setFilePasscodeError(null);
      } else {
        setFilePasscodeError(
          language === "bn" 
            ? "ভুল ফাইল পাসওয়ার্ড! আবার চেষ্টা করুন।" 
            : "Invalid file passcode. Try again."
        );
      }
    } catch (e) {
      setFilePasscodeError(
        language === "bn" 
          ? "পাসওয়ার্ড সংযোগে ত্রুটি দেখা দিয়েছে।" 
          : "Server connectivity error checking file passcode."
      );
    } finally {
      setIsVerifyingFilePasscode(false);
    }
  };

  const handleDownloadAction = (file: FileMeta) => {
    if (!currentRoomCode) return;

    // Check download permission
    const isRoomOwner = currentUser?.uid === liveOwnerId;
    const userPerm = livePermissions[currentUser?.uid || ""];
    const canDownload = isRoomOwner || userPerm?.download !== false;

    if (!canDownload) {
      showStatus(
        language === "bn"
          ? "আপনার এই রুমের ফাইল ডাউনলোড করার পারমিশন নেই। ওনারের সাথে যোগাযোগ করুন।"
          : "You do not have permission to download files in this room. Please contact the owner.",
        "error"
      );
      return;
    }

    if (file.hasPasscode) {
      setPendingDownloadFile(file);
      setInputFilePasscode("");
      setFilePasscodeError(null);
    } else {
      if (file.maxDownloads && file.maxDownloads > 0 && file.downloadCount >= file.maxDownloads) {
        showStatus(
          language === "bn" 
            ? "ডাউনলোড সীমা সমাপ্ত হয়ে গেছে।" 
            : "Download maximum limit has been reached for this file.", 
          "error"
        );
        return;
      }

      if (file.autoDelete || (file.maxDownloads && file.downloadCount + 1 >= file.maxDownloads)) {
        showStatus(
          language === "bn" 
            ? "ডাউনলোড শুরু হয়েছে! লিমিট পূরণ হওয়ায় ফাইল মুছে ফেলা হচ্ছে।" 
            : "Burning limit met! File is being purged after download completes.", 
          "info"
        );
        setTimeout(() => {
          fetchRoomInfo(currentRoomCode);
        }, 2500);
      }

      const downloadUrl = `/api/download/${currentRoomCode}/${file.id}${currentPasscode ? `?passcode=${currentPasscode}` : ""}`;
      window.open(downloadUrl, "_blank");
    }
  };

  const startBulkDownload = async (nonPasscodeFiles: FileMeta[]) => {
    if (!currentRoomCode) return;
    const currentFiles = Object.values(roomData?.files || {}) as FileMeta[];

    showStatus(
      language === "bn"
        ? `${nonPasscodeFiles.length}টি ফাইল ক্রমানুসারে ডাউনলোড করা হচ্ছে...`
        : `Downloading ${nonPasscodeFiles.length} file(s) sequentially...`,
      "info"
    );

    if (currentFiles.length > nonPasscodeFiles.length) {
      const lockedCount = currentFiles.length - nonPasscodeFiles.length;
      setTimeout(() => {
        showStatus(
          language === "bn"
            ? `${lockedCount}টি পাসওয়ার্ড-সুরক্ষিত ফাইল আলাদাভাবে ডাউনলোড করতে হবে।`
            : `${lockedCount} password-protected resource(s) must be downloaded individually.`,
          "info"
        );
      }, 1500);
    }

    for (let i = 0; i < nonPasscodeFiles.length; i++) {
      const file = nonPasscodeFiles[i];
      const downloadUrl = `/api/download/${currentRoomCode}/${file.id}${currentPasscode ? `?passcode=${currentPasscode}` : ""}`;
      
      if (i > 0) {
        // Smooth delay animation between files
        const totalSteps = 40; // 800ms
        for (let s = 1; s <= totalSteps; s++) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          const stepProgress = s / totalSteps;
          const prevPercent = ((i - 1) / nonPasscodeFiles.length) * 100;
          const targetPercent = (i / nonPasscodeFiles.length) * 100;
          const currentPercent = Math.round(prevPercent + (stepProgress * (targetPercent - prevPercent)));
          setBulkDownloadProgress(prev => prev ? {
            ...prev,
            percent: Math.min(100, currentPercent)
          } : null);
        }
      }

      setBulkDownloadProgress({
        currentFileName: file.name,
        currentIndex: i + 1,
        totalFiles: nonPasscodeFiles.length,
        percent: Math.round((i / nonPasscodeFiles.length) * 100)
      });

      try {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", file.name);
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Sequenced download failed", err);
      }
    }

    // Complete transition to 100% after last download is fired
    if (nonPasscodeFiles.length > 0) {
      const totalSteps = 25; // 500ms finish line transition
      for (let s = 1; s <= totalSteps; s++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const stepProgress = s / totalSteps;
        const prevPercent = ((nonPasscodeFiles.length - 1) / nonPasscodeFiles.length) * 100;
        const currentPercent = Math.round(prevPercent + (stepProgress * (100 - prevPercent)));
        setBulkDownloadProgress(prev => prev ? {
          ...prev,
          percent: Math.min(100, currentPercent)
        } : null);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setBulkDownloadProgress(null);

    const hasAnyAutoDelete = nonPasscodeFiles.some((f) => f.autoDelete || (f.maxDownloads && f.downloadCount + 1 >= f.maxDownloads));
    if (hasAnyAutoDelete) {
      setTimeout(() => {
        fetchRoomInfo(currentRoomCode);
      }, 3500);
    }
  };

  const handleDownloadAll = async () => {
    if (!currentRoomCode || !roomData?.files) return;

    // Check download permission
    const isRoomOwner = currentUser?.uid === liveOwnerId;
    const userPerm = livePermissions[currentUser?.uid || ""];
    const canDownload = isRoomOwner || userPerm?.download !== false;

    if (!canDownload) {
      showStatus(
        language === "bn"
          ? "আপনার এই রুমের ফাইল ডাউনলোড করার পারমিশন নেই। ওনারের সাথে যোগাযোগ করুন।"
          : "You do not have permission to download files in this room. Please contact the owner.",
        "error"
      );
      return;
    }
    const currentFiles = Object.values(roomData.files) as FileMeta[];
    if (currentFiles.length === 0) return;

    const nonPasscodeFiles = currentFiles.filter((f) => !f.hasPasscode);
    
    if (nonPasscodeFiles.length === 0) {
      showStatus(
        language === "bn"
          ? "রুমের সব ফাইল পাসওয়ার্ড-সুরক্ষিত! অনুগ্রহ করে প্রতিটি ফাইল আলাদাভাবে ডাউনলোড করুন।"
          : "All files in this room are password-protected! Please download them individually.",
        "error"
      );
      return;
    }

    if (currentFiles.length > 3) {
      setShowBulkDownloadConfirm(true);
      return;
    }

    await startBulkDownload(nonPasscodeFiles);
  };

  const extendRoomLife = async () => {
    if (!currentRoomCode || !roomData) return;
    if (credits === null || credits < 75) {
      showStatus(
        language === "bn"
          ? "পর্যাপ্ত কয়েন নেই! রুমের মেয়াদ বাড়ানোর জন্য ৭৫টি কয়েন প্রয়োজন।"
          : "Not enough credits! Extending room costs 75 credits.",
        "error"
      );
      return;
    }
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { credits: credits - 75 });
      }
      const res = await fetch(`/api/room/extend/${currentRoomCode}`, { method: "POST" });
      const json = await res.json();
      if (json.success && roomData) {
        setRoomData({ ...roomData, expiresAt: json.expiresAt });
        showStatus(
          language === "bn"
            ? "রুমের মেয়াদ ১ ঘণ্টা বাড়ানো হয়েছে! (-৭৫ কয়েন)"
            : "Room extended by 1 hour (-75 credits)",
          "success"
        );
      } else {
        showStatus(
          language === "bn" ? "মেয়াদ বর্ধিতকরণ ব্যর্থ হয়েছে।" : "Extend failed.",
          "error"
        );
      }
    } catch (err: any) {
      showStatus(
        language === "bn" ? "মেয়াদ বর্ধিতকরণ ব্যর্থ হয়েছে।" : "Extend failed.",
        "error"
      );
    }
  };

  const [isUpgradingStorage, setIsUpgradingStorage] = useState<boolean>(false);

  const upgradeRoomStorage = async (unitsToAdd: number, creditCost: number) => {
    if (!currentRoomCode || !roomData) return;
    if (credits === null || credits < creditCost) {
      showStatus(
        language === "bn"
          ? `পর্যাপ্ত কয়েন নেই! রুমের সাইজ বাড়ানোর জন্য ${creditCost}টি কয়েন প্রয়োজন।`
          : `Not enough credits! Upgrading storage costs ${creditCost} credits.`,
        "error"
      );
      return;
    }
    setIsUpgradingStorage(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { credits: credits - creditCost });
      }
      const res = await fetch(`/api/room/upgrade/${currentRoomCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-room-passcode": currentPasscode
        },
        body: JSON.stringify({ storageUnitsToAdd: unitsToAdd })
      });
      const json = await res.json();
      if (json.success && roomData) {
        setRoomData({ ...roomData, storageLimitBytes: json.storageLimitBytes });
        showStatus(
          language === "bn"
            ? `রুমের স্টোরেজ সীমা ${unitsToAdd}MB বৃদ্ধি করা হয়েছে! (-${creditCost} কয়েন)`
            : `Room storage upgraded by ${unitsToAdd} MB successfully! (-${creditCost} credits)`,
          "success"
        );
      } else {
        if (currentUser) {
          await updateDoc(doc(db, "users", currentUser.uid), { credits: credits });
        }
        showStatus(
          language === "bn" ? "আপগ্রেড ব্যর্থ হয়েছে।" : "Upgrade failed.",
          "error"
        );
      }
    } catch (err: any) {
      console.error(err);
      if (currentUser) {
        try {
          await updateDoc(doc(db, "users", currentUser.uid), { credits: credits });
        } catch (e) {}
      }
      showStatus(
        language === "bn" ? "আপগ্রেড ব্যর্থ হয়েছে।" : "Upgrade failed.",
        "error"
      );
    } finally {
      setIsUpgradingStorage(false);
    }
  };

  const toggleScannerTorch = async () => {
    if (!scannerInstanceRef.current) return;
    const nextTorchState = !isTorchOn;
    
    let success = false;
    try {
      await scannerInstanceRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState } as any]
      });
      success = true;
    } catch (e) {
      console.warn("applyVideoConstraints torch failed:", e);
    }

    if (!success) {
      try {
        const video = document.querySelector("#qr-scanner-viewport video") as HTMLVideoElement;
        if (video && video.srcObject) {
          const stream = video.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track && typeof track.applyConstraints === "function") {
            await track.applyConstraints({
              advanced: [{ torch: nextTorchState } as any]
            });
            success = true;
          }
        }
      } catch (e) {
        console.warn("Fallback track applyConstraints failed:", e);
      }
    }

    if (success) {
      setIsTorchOn(nextTorchState);
    } else {
      showStatus(
        language === "bn" 
          ? "ফ্ল্যাশলাইট অন/অফ করতে সমস্যা হয়েছে।" 
          : "Failed to toggle flashlight.",
        "error"
      );
    }
  };

  // Select helper to preview & open download parameters configurator before uploading
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || !currentRoomCode) return;
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
    const currentLimit = roomData?.storageLimitBytes || 100 * 1024 * 1024;
    const fileArray = Array.from(files);
    let totalNewSize = 0;

    for (const f of fileArray) {
      if (f.size > MAX_FILE_SIZE) {
        showStatus(
          language === "bn" 
            ? `ফাইল ${f.name} অনেক বড়! সর্বোচ্চ সাইজ ১০জিবি (10GB) অনুমোদিত।` 
            : `File ${f.name} limit exceeded. Max supported size is 10GB.`, 
          "error"
        );
        return;
      }
      totalNewSize += f.size;
    }

    if (totalBytesUsed + totalNewSize > currentLimit) {
      const limitMB = Math.round(currentLimit / (1024 * 1024));
      showStatus(
        language === "bn"
          ? `রুমের স্টোরেজ ফুল! সর্বোচ্চ ${limitMB} মেগাবাইট (${limitMB}MB) লিমিট রয়েছে।`
          : `Declined! Total files exceed remaining room quota (${limitMB}MB capacity limit).`,
        "error"
      );
      return;
    }

    setStagedFiles(fileArray);
    setStagedMaxDownloads(1);
    setStagedExpiresIn(60);
    setStagedPasscode("");

    if (fileArray.length === 1) {
      const file = fileArray[0];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setStagedPreviewUrl(url);
        setStagedTextContent(null);
      } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".json") || file.name.endsWith(".js") || file.name.endsWith(".ts")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setStagedTextContent((e.target.result as string).substring(0, 800));
          }
        };
        reader.readAsText(file);
        setStagedPreviewUrl(null);
      } else {
        setStagedPreviewUrl(null);
        setStagedTextContent(null);
      }
    } else {
      setStagedPreviewUrl(null);
      setStagedTextContent(null);
    }
  };

  const handleLocalCodeChange = async (val: string) => {
    setLocalCode(val);
    lastTypedRef.current = Date.now();

    if (!currentRoomCode) return;

    const myUserId = currentUser?.uid || deviceId;
    const myUserName = currentUser?.displayName || currentUser?.email?.split("@")[0] || guestNickname;
    const docRef = doc(db, "liveCoding", currentRoomCode);
    try {
      await updateDoc(docRef, {
        code: val,
        updatedAt: Date.now(),
        updatedByUid: myUserId,
        [`activeEditors.${myUserId}`]: {
          name: myUserName,
          isEditing: true,
          updatedAt: Date.now()
        }
      });
    } catch (e) {
      console.error("Failed to write live code change to Firestore:", e);
    }
  };

  const cancelStagedUpload = () => {
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFiles([]);
    setStagedPreviewUrl(null);
    setStagedTextContent(null);
    setStagedPasscode("");
  };

  const confirmAndUploadFile = async () => {
    if (stagedFiles.length === 0 || !currentRoomCode) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadFile = (file: File, index: number, total: number) => {
      return new Promise<void>((resolve, reject) => {
        setUploadingFileName(total > 1 ? `${file.name} (${index + 1}/${total})` : file.name);
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("autoDelete", String(stagedMaxDownloads === 1));
        formData.append("maxDownloads", String(stagedMaxDownloads));
        formData.append("expiresInMinutes", String(stagedExpiresIn));
        if (stagedPasscode.trim()) {
          formData.append("filePasscode", stagedPasscode.trim());
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/upload/${currentRoomCode}`);
        if (currentPasscode) {
          xhr.setRequestHeader("x-room-passcode", currentPasscode);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const filePercent = event.loaded / event.total;
            const overallPercentage = total > 1 ? Math.round(((index + filePercent) / total) * 100) : Math.round(filePercent * 100);
            setUploadProgress(Math.min(overallPercentage, 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.success) {
                resolve();
              } else {
                reject(new Error(res.error || "Upload failed"));
              }
            } catch {
              reject(new Error("Invalid response"));
            }
          } else if (xhr.status === 403) {
            reject(new Error("Invalid Passcode"));
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || "Upload failed."));
            } catch (e) {
              reject(new Error(language === "bn" ? "আপলোড ব্যর্থ হয়েছে!" : "An unknown issue interrupted the transfer."));
            }
          }
        };

        xhr.onerror = () => reject(new Error(language === "bn" ? "নেটওয়ার্ক ত্রুটি" : "Network error"));
        xhr.send(formData);
      });
    };

    try {
      let successCount = 0;
      for (let i = 0; i < stagedFiles.length; i++) {
        await uploadFile(stagedFiles[i], i, stagedFiles.length);
        successCount++;
      }
      showStatus(
        language === "bn" 
          ? `সফলভাবে ${successCount} টি ফাইল আপলোড হয়েছে!` 
          : `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`, 
        "success"
      );
      fetchRoomInfo(currentRoomCode);
    } catch (err: any) {
      if (err.message === "Invalid Passcode") {
        setPendingRoomCode(currentRoomCode);
      } else {
        showStatus(err.message || "Upload Failed", "error");
      }
    } finally {
      setIsUploading(false);
      setStagedFiles([]);
      if (stagedPreviewUrl) {
        URL.revokeObjectURL(stagedPreviewUrl);
        setStagedPreviewUrl(null);
      }
      setStagedTextContent(null);
      setStagedPasscode("");
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Immediate deletion handler
  const deleteFile = async (fileId: string, fileName: string) => {
    if (!currentRoomCode) return;

    try {
      const response = await fetch(`/api/delete/${currentRoomCode}/${fileId}`, {
        method: "DELETE",
        headers: {
          "x-room-passcode": currentPasscode
        }
      });
      if (response.ok) {
        showStatus(
          language === "bn" 
            ? `ফাইলটি ("${fileName}") চিরতরে মুছে ফেলা হয়েছে!` 
            : `File "${fileName}" was deleted instantly!`, 
          "success"
        );
        fetchRoomInfo(currentRoomCode);
      } else {
        throw new Error("Failed to delete file.");
      }
    } catch (err) {
      showStatus(language === "bn" ? "ফাইলটি মুছতে ত্রুটি হয়েছে।" : "Could not delete file.", "error");
    }
  };

  // Clipboard copy functions
  const copyRoomLink = () => {
    if (!currentRoomCode) return;
    const url = `${window.location.origin}/?room=${currentRoomCode}${currentPasscode ? `&passcode=${currentPasscode}` : ""}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedCode(true);
        showStatus("Room join link copied to clipboard!", "success");
        setTimeout(() => setCopiedCode(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy:", err);
      });
  };

  const shareRoomLink = () => {
    if (!currentRoomCode) return;
    const url = `${window.location.origin}/?room=${currentRoomCode}${currentPasscode ? `&passcode=${currentPasscode}` : ""}`;
    const desc = currentPasscode ? ` (Passcode: ${currentPasscode})` : "";
    const shareData = {
      title: "sz cloud Data bridge",
      text: `Join my live secure sync room: ${currentRoomCode}${desc}`,
      url: url,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => {
          showStatus("Shared successfully!", "success");
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            copyRoomLink();
          }
        });
    } else {
      copyRoomLink();
    }
  };

  const copyFileLink = (fileId: string, hasFilePasscode?: boolean) => {
    if (!currentRoomCode) return;
    const url = `${window.location.origin}/api/download/${currentRoomCode}/${fileId}${currentPasscode ? `?passcode=${currentPasscode}` : ""}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedFileId(fileId);
        if (hasFilePasscode) {
          showStatus(
            language === "bn" 
              ? "লিংক কপি হয়েছে! ফাইলটি পাসওয়ার্ড দ্বারা সুরক্ষিত।" 
              : "Direct link copied! This file is individual passcode protected.", 
            "info"
          );
        } else {
          showStatus("Direct file download link copied!", "success");
        }
        setTimeout(() => setCopiedFileId(null), 2000);
      })
      .catch((err) => {
        console.error("Could not copy:", err);
      });
  };

  // Helper temporary status flashes
  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Drag-and-drop support functions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Text contents by language
  const text = {
    title: { en: "sz cloud Data bridge", bn: "এসজে ক্লাউড ডেটা ব্রিজ" },
    tagline: { 
      en: "The fastest, single-use, high-privacy way to exchange files directly between your mobile and PC.", 
      bn: "মোবাইল এবং পিসির মধ্যে সরাসরি এবং অতি দ্রুত ফাইল আদান-প্রদান করার সবচেয়ে সহজ ও নিরাপদ মাধ্যম।" 
    },
    privacyAlert: {
      en: "Files are saved in highly secure server memory. You can download and instantly delete them so your space remains unlimited!",
      bn: "ফাইলগুলো নিরাপদ সার্ভার মেমোরিতে সাময়িক জমা থাকে। ফাইল ডাউনলোড করার সাথে সাথেই ডিলিট করে দিতে পারবেন, যার ফলে আনলিমিটেড স্টোরেজ সুবিধা পাবেন!"
    },
    createRoomBtn: { en: "Create Share Room", bn: "নতুন শেয়ার রুম তৈরি করুন" },
    orJoinHeadline: { en: "Join Existing Room", bn: "কোড দিয়ে রুমে প্রবেশ করুন" },
    codePlaceholder: { en: "Enter 4-digit code", bn: "৪ সংখ্যার রুম কোডটি লিখুন" },
    joinButton: { en: "Join Room", bn: "রুমে প্রবেশ করুন" },
    activeRoomTitle: { en: "Active Room Code", bn: "সক্রিয় রুম কোড" },
    copyJoinLink: { en: "Copy sharelink", bn: "শেয়ার লিংক কপি করুন" },
    viewQr: { en: "Show Mobile QR Code", bn: "মোবাইল স্ক্যান কিউআর কোড" },
    backHome: { en: "Exit Room", bn: "রুম থেকে প্রস্থান" },
    dragZoneTitle: { en: "Drag and drop your file here", bn: "এখানে ড্র্যাগ করে ফাইল রাখুন" },
    dragZoneSub: { en: "or click to select from file manager", bn: "অথবা আপনার ফাইল ম্যানেজার থেকে সিলেক্ট করতে ক্লিক করুন" },
    limitInfo: { en: "Supports files up to 10GB. Automatically deletes from directory in 1 hour.", bn: "সর্বোচ্চ ১০জিবি (10GB) সাইজের ফাইল সাপোর্ট করবে। ১ ঘণ্টা পর ফাইল স্বয়ংক্রিয়ভাবে মুছে যাবে।" },
    autoDeleteLabel: { 
      en: "Auto-delete file immediately after my first download", 
      bn: "ডাউনলোড শেষ হওয়ার সাথে সাথেই ফাইলটি স্বয়ংক্রিয়ভাবে মুছে ফেলুন (নিরাপদ ও আনলিমিটেড ইউজ)" 
    },
    filesHeader: { en: "Shared Files in this Room", bn: "শেয়ার করা ফাইলসমূহ" },
    noFilesText: { en: "No files in this room yet. Drag or select a file to start transferring!", bn: "এই রুমে এখনও কোনো ফাইল আপলোড করা হয়নি। যেকোনো ফাইল ড্রপ বা সিলেক্ট করতে ক্লিক করুন!" },
    howItWorksTitle: { en: "How it works", bn: "এটি কীভাবে কাজ করে?" },
    step1: { en: "Create a share room on any device, which generates a unique 4-digit connection code.", bn: "যেকোনো ডিভাইসে একটি শেয়ার রুম তৈরি করুন যা একটি ৪ সংখ্যার কোড তৈরি করবে।" },
    step2: { en: "Enter this 4-digit code or scan the QR code on your second device to connect instantly.", bn: "আপনার দ্বিতীয় ডিভাইসে এই ৪ সংখ্যার কোডটি লিখুন অথবা QR কোডটি স্ক্যান করে কানেক্ট হন।" },
    step3: { en: "Upload, transfer, and download files up to 10GB instantly. Clean room and delete files at any time.", bn: "১০জিবি সাইজ পর্যন্ত ফাইল মুহূর্তেই আপলোড এবং ডাউনলোড করুন। কাজ শেষে ফাইল যেকোনো সময় মুছে দিন।" },
    expiryLabelShort: { en: "expires in", bn: "বাকি সময়" },
    downloadBtn: { en: "Download", bn: "ডাউনলোড" },
    downloadAllBtn: { en: "Download All", bn: "সব ডাউনলোড করুন" },
    qrModalTitle: { en: "Scan QR to connect", bn: "কানেক্ট করতে QR স্ক্যান করুন" },
    qrModalDesc: { en: "Scan this QR code with your smartphone camera to connect to this room and start exchanging files instantly.", bn: "স্মার্টফোন ক্যামেরা দিয়ে এই QR কোডটি স্ক্যান করে সরাসরি এই রুমে প্রবেশ করুন এবং ফাইল আদান-প্রদান শুরু করুন।" },
    closeBtn: { en: "Close Dialog", bn: "বন্ধ করুন" },
    scanQrBtn: { en: "Scan QR", bn: "কিউআর স্ক্যান" },
    scanModalTitle: { en: "Scan Room QR Code", bn: "রুম কিউআর কোড স্ক্যান" },
    scanModalDesc: { en: "Align the room's QR code within the frame below to connect instantly without manual input.", bn: "রুমের কিউআর কোডটি নিচে ফ্রেমের সাথে মেলালেই সরাসরি রুমে প্রবেশ হবে, কোনো ম্যানুয়াল ইনপুট ছাড়াই।" },
    appQrModalTitle: { en: "Scan to Open App", bn: "অ্যাপ ওপেন করতে QR স্ক্যান" },
    appQrModalDesc: { en: "Scan this QR code with any secondary smartphone or tablet to open this application instantly and start bridging data.", bn: "যেকোনো স্মার্টফোন বা ডিভাইসের ক্যামেরা দিয়ে এই QR কোডটি স্ক্যান করে সেকেন্ডারিলি এই অ্যাপটি ওপেন করুন এবং শেয়ার শুরু করুন।" }
  };

  const fileList: FileMeta[] = roomData ? Object.values(roomData.files) : [];
  const totalBytesUsed = fileList.reduce((acc, f) => acc + f.size, 0);
  const maxBytes = 10 * 1024 * 1024 * 1024; // 10GB
  const bufferPercentage = Math.min(100, (totalBytesUsed / maxBytes) * 100);

  const storageDistribution = useMemo(() => {
    const categories: Record<string, { size: number; count: number; color: string; bg: string; nameEn: string; nameBn: string }> = {
      image: { size: 0, count: 0, color: "#3b82f6", bg: "bg-blue-500", nameEn: "Images", nameBn: "ছবি" },
      video: { size: 0, count: 0, color: "#a855f7", bg: "bg-purple-500", nameEn: "Videos", nameBn: "ভিডিও" },
      audio: { size: 0, count: 0, color: "#10b981", bg: "bg-emerald-500", nameEn: "Audio", nameBn: "অডিও" },
      document: { size: 0, count: 0, color: "#f59e0b", bg: "bg-amber-500", nameEn: "Documents", nameBn: "ডকুমেন্টস" },
      archive: { size: 0, count: 0, color: "#ec4899", bg: "bg-pink-500", nameEn: "Archives", nameBn: "আর্কাইভ" },
      other: { size: 0, count: 0, color: "#64748b", bg: "bg-slate-500", nameEn: "Others", nameBn: "অন্যান্য" },
    };

    fileList.forEach((file) => {
      const mime = (file.mimeType || "").toLowerCase();
      const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";

      if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
        categories.image.size += file.size;
        categories.image.count += 1;
      } else if (mime.startsWith("video/") || ["mp4", "mkv", "avi", "mov", "webm", "wmv", "3gp"].includes(ext)) {
        categories.video.size += file.size;
        categories.video.count += 1;
      } else if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext)) {
        categories.audio.size += file.size;
        categories.audio.count += 1;
      } else if (
        mime === "application/pdf" ||
        mime.startsWith("text/") ||
        ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "json", "md", "html", "css", "js", "ts", "xml"].includes(ext)
      ) {
        categories.document.size += file.size;
        categories.document.count += 1;
      } else if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
        categories.archive.size += file.size;
        categories.archive.count += 1;
      } else {
        categories.other.size += file.size;
        categories.other.count += 1;
      }
    });

    return Object.entries(categories)
      .map(([key, value]) => ({
        key,
        name: language === "bn" ? value.nameBn : value.nameEn,
        value: value.size,
        formattedSize: formatBytes(value.size),
        count: value.count,
        color: value.color,
        bg: value.bg,
      }))
      .filter((item) => item.count > 0);
  }, [fileList, language]);

  if (!isAuthLoaded) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}>
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowAuthModal(true)} theme={theme} />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} theme={theme} />}
      </>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden relative transition-colors duration-300 ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Dynamic Status / Floating Notification Flash */}
      {statusMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 p-4 rounded-xl shadow-xl border text-xs sm:text-sm max-w-md animate-bounce transition-all ${
            statusMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-100/40" 
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-100 text-rose-800 shadow-rose-100/40" 
              : "bg-blue-50 border-blue-150 text-blue-800 shadow-blue-100/40"
          }`}
          id="status-notification"
        >
          {statusMessage.type === "error" ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          ) : (
            <FileCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <span className="font-semibold leading-snug">{statusMessage.text}</span>
        </div>
      )}

      {/* Bulk Download Progress Toast Notification */}
      {bulkDownloadProgress && (
        <div 
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex flex-col gap-3 w-full max-w-sm transition-all duration-300 animate-fade-in ${
            theme === "dark" 
              ? "bg-slate-900/95 backdrop-blur-md border-slate-800 text-white shadow-black/85" 
              : "bg-white/95 backdrop-blur-md border-slate-205 text-slate-900 shadow-slate-100/60"
          }`}
          id="bulk-download-progress-toast"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                {bulkDownloadProgress.percent < 100 ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileCheck className="h-5 w-5 text-emerald-500 animate-bounce" />
                )}
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 leading-none">
                  {language === "bn" ? "ডাউনলোড প্রোগ্রেস" : "Downloading All Files"} ({bulkDownloadProgress.currentIndex}/{bulkDownloadProgress.totalFiles})
                </span>
                <span className="text-xs font-bold line-clamp-1 max-w-[200px] mt-1 text-slate-900 dark:text-white leading-tight">
                  {bulkDownloadProgress.currentFileName}
                </span>
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono font-black text-blue-500 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/10">
                {bulkDownloadProgress.percent}%
              </span>
            </div>
          </div>

          <div className="w-full">
            <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${bulkDownloadProgress.percent < 100 ? "bg-blue-600" : "bg-emerald-500"}`} 
                style={{ width: `${bulkDownloadProgress.percent}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modern Sidebar (Visible on desktop when room exists) */}
      {currentRoomCode && (
        <aside className="w-72 bg-slate-900 text-white flex flex-col shrink-0 hidden lg:flex border-r border-slate-950">
          <div className="p-6 flex flex-col h-full justify-between">
            <div>
              {/* App logo brand wrapper */}
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl italic text-white shadow-lg shadow-blue-500/20">
                  SZ
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight block text-slate-50">sz cloud Data bridge</span>
                  <span className="text-[10px] text-blue-400 font-mono tracking-widest font-semibold uppercase">BRIDGE LIVE</span>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Active Devices status display */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {language === "bn" ? "সংযুক্ত ডিভাইস" : "Active Devices"}
                  </p>
                  <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {roomData?.devices && roomData.devices.length > 0 ? (
                      roomData.devices.map((device, idx) => {
                        const isCurrent = device.id === deviceId;
                        return (
                          <div 
                            key={device.id || idx}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all shadow-xs ${
                              isCurrent 
                                ? "bg-slate-800/80 border-slate-700/80" 
                                : "bg-slate-900/40 border-slate-800 hover:border-slate-700/60"
                            }`}
                          >
                            <div className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 text-left">
                              <span className="text-xs font-semibold truncate text-slate-100 flex items-center gap-1.5">
                                {device.name}
                                {isCurrent && (
                                  <span className="text-[9px] bg-blue-900/40 text-blue-300 border border-blue-800 px-1 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono scale-90">
                                    YOU
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-400 italic font-medium font-mono">
                                {isCurrent ? "Active Device Connection" : `Connected Sync Node`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[11px] text-slate-400 italic py-2 text-center">
                        Detecting live companion devices...
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage usage statistics */}
                <div className="pt-6 border-t border-slate-800/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    {language === "bn" ? "লাইভ বাফার সাইজ" : "Live Buffer Usage"}
                  </p>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(3, bufferPercentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 font-mono text-[10px]">
                    <span className="text-blue-400 font-bold">{formatBytes(totalBytesUsed)} Used</span>
                    <span className="text-slate-400">10 GB Max</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-sans">
                    {language === "bn" 
                      ? "ফাইল ডাউনলোডের সাথে সাথেই মুছে দিয়ে সর্বোচ্চ স্পেস লাভ করুন, অথবা ১ ঘণ্টা নিষ্ক্রিয়তায় অটো-প্লেস ক্লিয়ার হবে।" 
                      : "Files are auto-purged from directory memory on direct manual purges or after 1 hour."}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Exit button bottom rail */}
            <div>
              <button 
                onClick={leaveRoom}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700/50"
                id="sidebar-logout-btn"
              >
                <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-400" />
                <span>{text.backHome[language]}</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* App Shell right master panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic Navigation Header */}
        <header className={`h-20 border-b flex items-center justify-between px-6 sm:px-8 shrink-0 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
          <div className="flex items-center gap-3">
            {/* Short logo for mobile header */}
            {!currentRoomCode && (
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-md shadow-blue-500/10 animate-fade-in">
                IF
              </div>
            )}
            <div>
              <h1 className={`text-md sm:text-lg font-extrabold tracking-tight flex items-center gap-1.5 leading-none transition-colors ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {currentRoomCode ? (
                  <>
                    <span>Live Data Bridge</span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </>
                ) : (
                  <span>{text.title[language]}</span>
                )}
              </h1>
              <p className={`text-xs sm:text-sm mt-1 leading-none font-medium transition-colors ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                {currentRoomCode 
                  ? (language === "bn" ? "আপনার বিভিন্ন ডিভাইসের সাথে ফাইল ইনস্ট্যান্ট ট্রান্সফার করুন" : "Sync files between your devices instantly")
                  : (language === "bn" ? "সবচেয়ে নিরাপদ ও দ্রুততম ফাইল এক্সচেঞ্জ নোড" : "Decentralized ephemeral bridging")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Auth panel */}
            {currentUser ? (
              <div className="flex items-center gap-2 mr-2">
                {currentUser.email === "smbadsha544@gmail.com" && (
                  <button onClick={async () => {
                    setShowAdminPanel(true);
                    setAdminTab("rooms");
                    fetch('/api/admin/system_state', {
                      headers: { 'x-admin-email': currentUser.email || "" }
                    }).then(res => res.json()).then(data => {
                      setAdminData(data.data.rooms);
                    });
                    try {
                      const querySnapshot = await getDocs(collection(db, "users"));
                      const usersList: any[] = [];
                      querySnapshot.forEach((doc) => {
                        usersList.push({ id: doc.id, ...doc.data() });
                      });
                      setAdminUsers(usersList);
                    } catch (error) {
                      console.error("Error fetching users:", error);
                    }
                  }} className="text-[10px] font-bold px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer uppercase tracking-wider shadow-sm transition-colors">
                    Admin
                  </button>
                )}
                <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {credits !== null && (
                    <div className="flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Credits:</span>
                      <span className="text-[10px] font-mono font-bold text-amber-500">{credits}</span>
                    </div>
                  )}
                  <span className="text-[10px] font-bold truncate max-w-[100px]">{currentUser.displayName || currentUser.email}</span>
                  <button onClick={logout} className="text-[10px] uppercase font-bold text-slate-500 hover:text-rose-500 cursor-pointer pl-2 border-l border-slate-300 dark:border-slate-600">Log Out</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center mr-2 gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                title="Login with Google"
              >
                Log In
              </button>
            )}

            {/* Theme switcher toggle button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                theme === "dark" 
                  ? "bg-slate-800 hover:bg-slate-700 text-yellow-400 border-slate-700 shadow-sm" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/50"
              }`}
              title={language === "bn" ? "থিম পরিবর্তন করুন" : "Toggle Theme Mode"}
              id="theme-toggler-btn"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-yellow-400" /> : <Moon className="h-3.5 w-3.5 text-slate-500" />}
              <span className="hidden sm:inline">
                {theme === "dark" 
                  ? (language === "bn" ? "লাইট" : "Light") 
                  : (language === "bn" ? "ডার্ক" : "Dark")}
              </span>
            </button>

            {/* Mobile language switch */}
            <button 
              onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/50"
              }`}
              title="Toggle Language translation"
              id="switch-language-btn"
            >
              <Languages className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden sm:inline">{language === "bn" ? "English (EN)" : "বাংলা (BN)"}</span>
              <span className="sm:hidden">{language === "bn" ? "EN" : "BN"}</span>
            </button>
            
            {/* Safe secure tunneling tags */}
            {currentRoomCode ? (
              <span className="hidden sm:inline-flex px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse border border-blue-100">
                Secure Tunnel Active
              </span>
            ) : null}

            {/* Real-time Connection Status Indicator */}
            {currentRoomCode ? (
              <div 
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider border transition-all select-none ${
                  isSyncActive 
                    ? (theme === "dark" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-150") 
                    : (theme === "dark" 
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse" 
                        : "bg-rose-50 text-rose-600 border-rose-150 animate-pulse")
                }`}
                title={
                  isSyncActive 
                    ? (language === "bn" ? "রিয়েল-টাইম ক্লাউড সিঙ্ক সক্রিয়" : "Real-time sync active and connected") 
                    : (language === "bn" ? "সিঙ্ক বিচ্ছিন্ন! আপনার স্থানীয় ডেটা আউট-অফ-সিঙ্ক হতে পারে।" : "Sync interrupted! Local room data may be out of sync.")
                }
                id="connection-status-indicator"
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  {isSyncActive ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </>
                  )}
                </span>
                <span>
                  {isSyncActive 
                    ? (language === "bn" ? "কানেক্টেড" : "Live Sync") 
                    : (language === "bn" ? "অসংযুক্ত" : "Offline / Out-of-sync")}
                </span>
              </div>
            ) : null}

            {/* Mobile back button when in a room */}
            {currentRoomCode && (
              <button
                onClick={leaveRoom}
                className="lg:hidden flex items-center justify-center p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100/50 cursor-pointer"
                id="mobile-close-btn"
                title={text.backHome[language]}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Content Panel Viewport */}
        <div className={`flex-1 overflow-y-auto p-6 sm:p-8 transition-colors duration-300 ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
          
          {/* LANDING ENTRANCE VIEW */}
          {!currentRoomCode ? (
            <div className="max-w-3xl mx-auto w-full py-4 flex flex-col gap-8">
              
              {/* Product Introduction banner */}
              <div className="text-center flex flex-col items-center gap-3.5">
                <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100/80 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                  <span>{language === "bn" ? "স্টোরেজ সীমা ব্যতীত ব্যবহার" : "High-Speed Buffer Stream"}</span>
                </div>
                <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-xl transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                  {language === "bn" ? "মোবাইল ⇄ পিসি ইনস্ট্যান্ট ডাটা ট্রান্সফার" : "Cross-Device Data bridge"}
                </h2>
                <p className={`sm:text-base max-w-xl leading-relaxed text-center transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  {text.tagline[language]}
                </p>

                {/* QR Code trigger for the application itself */}
                <button
                  onClick={() => setShowAppQrModal(true)}
                  className={`mt-1 flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer select-none ${
                    theme === "dark"
                      ? "bg-slate-900 hover:bg-slate-800 text-blue-400 border-slate-800 hover:border-slate-700 hover:shadow-md"
                      : "bg-white hover:bg-slate-50 text-blue-600 border-slate-200/50 hover:shadow-xs"
                  }`}
                  id="share-app-qr-btn"
                  title={language === "bn" ? "কিউআর কোড দিয়ে সহজেই অন্য ডিভাইসে অ্যাপ ওপেন করুন" : "Open on secondary device via QR Code"}
                >
                  <QrCode className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span>{language === "bn" ? "কিউআর কোড দিয়ে অন্য ডিভাইসে অ্যাপ ওপেন করুন" : "Open on Secondary Device (App QR Link)"}</span>
                </button>
              </div>

              {/* Secure Buffer Card Display description */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row gap-4 items-center sm:items-start justify-between">
                <div className="flex gap-4 items-start text-center sm:text-left flex-col sm:flex-row">
                  <div className="bg-blue-600 text-white rounded-xl p-3 flex items-center justify-center shadow-lg shadow-blue-500/20 self-center sm:self-start">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base tracking-tight">
                      {language === "bn" ? "কোনো লিমিট নেই ও ওয়ান-টাইম ডাউনলোড!" : "Ephemeral Buffer Memory & Zero Cost"}
                    </h4>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed max-w-lg">
                      {text.privacyAlert[language]}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50 text-[11px] font-mono text-blue-400 uppercase tracking-widest font-bold self-center">
                  10GB Limit per upload
                </div>
              </div>

              {/* Quick Start Action Panels */}
              <div className="grid md:grid-cols-2 gap-6 mt-2">
                
                {/* Panel left: Start sharing room */}
                <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch gap-5 transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg shadow-black/35" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
                  <div className="flex flex-col gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                      <Plus className="h-5.5 w-5.5 stroke-[2.5]" />
                    </div>
                    <h3 className={`text-lg font-extrabold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                      {language === "bn" ? "নতুন কানেক্ট কোড ও রুম বানান" : "Initialize Sharing Stream"}
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed font-medium transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-505"}`}>
                      {language === "bn" 
                        ? "একটি সিকিউর ৪ ডিজিট কোডের অ্যান্ড-টু-অ্যান্ড ইনক্রিপ্টেড রুম খুলুন। টাইপ বা ফাইল শেয়ারিং করুন রিয়ালে।" 
                        : "Open a temporary sharing or live coding workspace instantly with a 4-digit code."}
                    </p>
                  </div>

                  {/* Secure Room cost informational box */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-slate-50/60 border-slate-150"}`}>
                    <div className="flex items-center gap-2.5 text-left">
                      <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                        <HardDrive className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[12px] font-bold block leading-tight text-left">
                          {language === "bn" ? "ফাইল শেয়ারিং ব্রিজ" : "File Sharing Bridge"}
                        </span>
                        <span className={`text-[10px] font-medium block mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          {language === "bn" ? "রুম তৈরির এককালীন খরচ" : "One-time room generation fee"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-blue-500 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20">100 Credits</span>
                    </div>
                  </div>

                  {/* Passcode toggler and configuration input */}
                  <div className={`p-4 rounded-xl border transition-all ${theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-150"}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={usePasscode}
                        onChange={(e) => {
                          setUsePasscode(e.target.checked);
                          if (!e.target.checked) setCreatePasscode("");
                        }}
                        className={`rounded ${theme === "dark" ? "border-slate-800 bg-slate-900 accent-blue-500" : "border-slate-300 accent-blue-600"} h-4 w-4`}
                      />
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                        <Lock className="h-3.5 w-3.5 text-blue-500" />
                        {language === "bn" ? "রুম পাসকোড দিয়ে লক করুন" : "Protect Room with Passcode"}
                      </span>
                    </label>

                    <AnimatePresence>
                      {usePasscode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-1.5"
                        >
                          <span className={`text-[11px] text-left font-semibold block ${theme === "dark" ? "text-slate-400" : "text-slate-550"}`}>
                            Choose session password:
                          </span>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="password"
                              maxLength={16}
                              placeholder="e.g. MyPass123"
                              className={`w-full text-xs font-sans pl-9 pr-4 py-2 rounded-lg border transition-all outline-none focus:border-blue-500 ${theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"}`}
                              value={createPasscode}
                              onChange={(e) => setCreatePasscode(e.target.value)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={createRoom}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:shadow-blue-200 cursor-pointer text-xs uppercase tracking-wider"
                    id="create-room-btn"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{text.createRoomBtn[language]}</span>
                  </button>
                </div>

                {/* Panel right: Enter Code to connect */}
                <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch gap-6 transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg shadow-black/35" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
                  <div className="flex flex-col gap-3.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
                      <Smartphone className="h-5.5 w-5.5 stroke-[2]" />
                    </div>
                    <h3 className={`text-lg font-extrabold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                      {text.orJoinHeadline[language]}
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed font-medium transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {language === "bn"
                        ? "অন্য ডিভাইস এ ইতিমধ্যেই একটি রুম তৈরি থাকলে তার ৪ ডিজিটের কোডটি নিচে লিখে কানেক্ট করে নিন।"
                        : "Enter the code generated on your alternative device to bridge with its active downloads repository."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={4}
                          value={roomIdInput}
                          onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                          placeholder={text.codePlaceholder[language]}
                          className={`w-full px-4 pl-10 pr-10 py-3 border rounded-xl font-mono text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold transition-all ${
                            theme === "dark" 
                              ? "bg-slate-850 border-slate-700 text-white placeholder-slate-550" 
                              : "bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400"
                          }`}
                          id="room-code-input"
                        />
                        <button
                          onClick={() => setShowScanner(true)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                            theme === "dark" ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800" : "text-slate-500 hover:text-blue-600 hover:bg-slate-200"
                          }`}
                          title={text.scanQrBtn[language]}
                        >
                          <Camera className="h-4.5 w-4.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => setShowScanner(true)}
                        className={`px-4 py-3 rounded-xl font-bold border transition-all text-xs uppercase tracking-wider shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                          theme === "dark"
                            ? "bg-blue-950/40 hover:bg-blue-900/40 border-blue-900/60 text-blue-400"
                            : "bg-blue-50 hover:bg-blue-100 border-blue-100/50 text-blue-600"
                        }`}
                        id="scan-qr-trigger-btn"
                        title={text.scanQrBtn[language]}
                      >
                        <Camera className={`h-4 w-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                        <span className="hidden sm:inline">{text.scanQrBtn[language]}</span>
                      </button>
                      <button
                        onClick={() => joinRoom()}
                        className={`px-5 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                          theme === "dark"
                            ? "bg-white hover:bg-slate-100 text-slate-950 shadow-sm"
                            : "bg-slate-990 hover:bg-slate-900 text-white"
                        }`}
                        id="join-room-btn"
                      >
                        <span>{text.joinButton[language]}</span>
                      </button>
                    </div>
                    
                    {roomError && (
                      <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{roomError}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Instructions Guide */}
              <div className={`border rounded-2xl p-6 shadow-sm transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <h3 className={`text-base font-extrabold flex items-center gap-2 mb-5 uppercase tracking-wide transition-colors ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                  <HelpCircle className={`h-5 w-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                  <span>{text.howItWorksTitle[language]}</span>
                </h3>
                
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
                      1
                    </div>
                    <p className={`text-xs leading-relaxed font-semibold transition-colors ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {text.step1[language]}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
                      2
                    </div>
                    <p className={`text-xs leading-relaxed font-semibold transition-colors ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {text.step2[language]}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
                      3
                    </div>
                    <p className={`text-xs leading-relaxed font-semibold transition-colors ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {text.step3[language]}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            
            /* ACTIVE SHARING CONSOLE DASHBOARD VIEW */
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
              
              {/* Room Expiration Warning Banner (within 10 minutes) */}
              {roomData?.expiresAt && (roomData.expiresAt - Date.now() <= 10 * 60 * 1000) && (roomData.expiresAt - Date.now() > 0) && (
                <div 
                  className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 px-5 rounded-2xl border transition-all duration-300 animate-pulse text-left ${
                    theme === "dark" 
                      ? "bg-rose-950/20 border-rose-900 text-rose-200" 
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                  id="room-expiration-warning-banner"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${theme === "dark" ? "bg-rose-950 text-rose-400" : "bg-rose-100 text-rose-600"}`}>
                      <AlertTriangle className="h-4 w-4 text-rose-500 animate-bounce" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {language === "bn" ? "রুমের মেয়াদ শেষ হতে চলেছে!" : "Room Expiring Soon!"}
                      </span>
                      <span className="text-[11px] font-semibold opacity-90 mt-0.5">
                        {language === "bn"
                          ? `রুমটি ${formatTimeRemaining(roomData.expiresAt)} এর মধ্যে ডিলিট হয়ে যাবে! আপনার ফাইলগুলো সংরক্ষণ করুন অথবা মেয়াদ বাড়িয়ে নিন।`
                          : `This room will expire in ${formatTimeRemaining(roomData.expiresAt)}! Please save your files or extend the room life.`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
                    <button
                      onClick={extendRoomLife}
                      className="w-full sm:w-auto text-xs font-black px-4 py-2 uppercase tracking-wide rounded-xl shadow-sm cursor-pointer select-none border transition-all bg-rose-600 border-rose-600 text-white hover:bg-rose-500 hover:border-rose-500 active:scale-95"
                      id="extend-expiry-banner-btn"
                    >
                      {language === "bn" ? "মেয়াদ বাড়ান (৭৫ কয়েন)" : "Extend (+1H / 75C)"}
                    </button>
                  </div>
                </div>
              )}

              {/* Connected Header Strip (emulates mobile sidebar or live details) */}
              <div className={`border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch justify-between gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  
                  {/* Dynamic room identity code container */}
                  <div className={`relative border rounded-xl px-4 py-2.5 text-center sm:text-left flex flex-col items-center justify-center ${theme === "dark" ? "bg-blue-950/40 border-blue-900/50" : "bg-blue-50 border-blue-100"}`}>
                    <span className={`text-[9px] font-bold uppercase tracking-widest font-mono ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                      {text.activeRoomTitle[language]}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`font-display font-black text-2xl sm:text-3xl tracking-widest mono-code leading-none ${theme === "dark" ? "text-blue-400" : "text-blue-650"}`}>
                        {currentRoomCode}
                      </span>
                      <button 
                        onClick={shareRoomLink}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                          theme === "dark" 
                            ? "hover:bg-blue-900/50 text-blue-400 bg-blue-950/40" 
                            : "hover:bg-blue-100 text-blue-700 bg-blue-50/80"
                        }`}
                        title="Share room link"
                        id="inline-room-share-btn"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>

                    {roomData?.expiresAt && (
                      <div className="mt-3 flex items-center justify-between w-full border-t border-blue-200/50 dark:border-blue-900/50 pt-2.5 gap-4">
                        <div className="flex flex-col text-left">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-blue-400/70" : "text-blue-600/70"}`}>Expires In</span>
                          <span className={`text-xs font-mono font-bold ${roomData.expiresAt - Date.now() < 300000 ? "text-rose-500 animate-pulse" : (theme === "dark" ? "text-blue-300" : "text-blue-700")}`}>
                            {formatTimeRemaining(roomData.expiresAt)}
                          </span>
                        </div>
                        <button
                          onClick={extendRoomLife}
                          className={`text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded border shadow-sm transition-all cursor-pointer select-none ${theme === "dark" ? "bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700" : "bg-slate-100 border-blue-200 text-blue-700 hover:bg-slate-200"}`}
                        >
                          Extend (+1H)
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wide text-left ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      <span>
                        {roomData?.ownerName || roomData?.ownerEmail || liveOwnerName || liveOwnerEmail
                          ? `${roomData?.ownerName || liveOwnerName || roomData?.ownerEmail?.split('@')[0] || liveOwnerEmail?.split('@')[0]}'s Sync Space` 
                          : (language === "bn" ? "কানেক্টেড লাইভ বোর্ড" : "Connected Share Board")
                        }
                      </span>
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <p className={`text-xs mt-0.5 text-left max-w-sm sm:max-w-md ${theme === "dark" ? "text-slate-400" : "text-slate-505"}`}>
                      {language === "bn" 
                        ? "এই কোডটি অন্য ডিভাইসে লিখুন অথবা কিউআর কোডটি স্ক্যান করে ফাইল পাঠানো শুরু করুন" 
                        : "Ready for mobile input. Scan QR or share code below to open direct sync."}
                    </p>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-center sm:self-auto">
                  {/* Share button */}
                  <button
                    onClick={shareRoomLink}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 border rounded-xl font-bold text-xs transition-all cursor-pointer focus:outline-none select-none ${
                      theme === "dark" 
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-205" 
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    }`}
                    id="share-action-btn"
                  >
                    <Share2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>Share Room</span>
                  </button>

                  {/* Copy Link btn */}
                  <button
                    onClick={copyRoomLink}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 border rounded-xl font-bold text-xs transition-all cursor-pointer focus:outline-none select-none ${
                      theme === "dark" 
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-205" 
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    }`}
                    id="copy-room-link-btn"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-450" />}
                    <span>{copiedCode ? (language === "bn" ? "কপি হয়েছে!" : "Link Copied!") : text.copyJoinLink[language]}</span>
                  </button>

                  {/* QR view btn */}
                  <button
                    onClick={() => setShowQrModal(true)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 border rounded-xl font-bold text-xs transition-all cursor-pointer focus:outline-none select-none ${
                      theme === "dark"
                        ? "bg-blue-950/40 hover:bg-blue-900/40 border-blue-900/60 text-blue-400"
                        : "bg-blue-50 hover:bg-blue-105 border-blue-100 text-blue-700"
                    }`}
                    id="show-qr-btn"
                  >
                    <QrCode className={`h-3.5 w-3.5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                    <span>{text.viewQr[language]}</span>
                  </button>

                  {/* Force refresh */}
                  <button
                    onClick={() => fetchRoomInfo(currentRoomCode)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm select-none ${
                      theme === "dark"
                        ? "border-slate-800 text-slate-300 bg-slate-850 hover:bg-slate-800"
                        : "border-slate-200/80 text-slate-655 bg-white hover:bg-slate-50"
                    } ${isRefreshing ? "animate-spin" : ""}`}
                    title="Force refresh index"
                    id="force-refresh-btn"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic split interface: Bento layout containing Left Files/Uploader Column and Right Live Chat Column */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* 1. Left Section: File Operations and Quotas (7 / 12 width) */}
                <div className="xl:col-span-7 flex flex-col gap-6">


                  {/* Left segment content: File Operations and Quas (no tab needed) */}
                      {/* High Resolution Storage Quota Progress Card */}
                  {(() => {
                    const currentLimit = roomData?.storageLimitBytes || 100 * 1024 * 1024;
                    const limitMB = currentLimit / (1024 * 1024);
                    return (
                      <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-3 shadow-xs ${
                        theme === "dark" 
                          ? "bg-slate-900 border-slate-800 text-white" 
                          : "bg-white border-slate-205 text-slate-900"
                      }`}>
                        {/* Glowing design background accent */}
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-blue-500/10 to-transparent blur-xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                              theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-blue-50 border-blue-100"
                            }`}>
                              <HardDrive className={`h-5 w-5 ${totalBytesUsed > currentLimit * 0.8 ? "text-rose-500 animate-bounce" : "text-blue-500"}`} />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                                {language === "bn" ? "রুম মেমোরি স্টোরেজ" : "Active Session Storage"}
                              </span>
                              <span className="text-sm font-black tracking-tight mt-0.5">
                                {language === "bn" ? `${limitMB} মেগাবাইট সর্বোচ্চ সীমা` : `${limitMB} MB Maximum Capacity`}
                              </span>
                            </div>
                          </div>

                          {/* Percent Pill indicator */}
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                            totalBytesUsed >= currentLimit * 0.9 
                              ? "bg-rose-950/40 text-rose-450 border-rose-800/50 animate-pulse" 
                              : theme === "dark"
                              ? "bg-blue-950/40 text-blue-400 border-blue-900/40"
                              : "bg-blue-50 text-blue-700 border-blue-105"
                          }`}>
                            {Math.min(100, Math.round((totalBytesUsed / currentLimit) * 100))}%
                          </span>
                        </div>

                        {/* Progress slider bar gauge */}
                        <div className={`w-full h-2 rounded-full overflow-hidden transition-all duration-300 ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              totalBytesUsed >= currentLimit * 0.9
                                ? "bg-gradient-to-r from-rose-500 to-red-650"
                                : totalBytesUsed >= currentLimit * 0.6
                                ? "bg-gradient-to-r from-amber-500 to-amber-600"
                                : "bg-gradient-to-r from-blue-500 to-blue-600"
                            }`}
                            style={{ width: `${Math.max(1, Math.min(100, (totalBytesUsed / currentLimit) * 100))}%` }}
                          />
                        </div>

                        {/* Meta info sizes */}
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-550 pt-0.5 border-b pb-3 border-slate-100 dark:border-slate-850">
                          <span>{language === "bn" ? "ব্যবহার হয়েছে" : "Allocated"}: <strong className={`${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{formatBytes(totalBytesUsed)}</strong></span>
                          <span>{language === "bn" ? "বাকি আছে" : "Remaining Space"}: <strong className={`${totalBytesUsed >= currentLimit * 0.9 ? "text-rose-500" : (theme === "dark" ? "text-slate-200" : "text-slate-800")}`}>{formatBytes(Math.max(0, currentLimit - totalBytesUsed))}</strong></span>
                        </div>

                        {/* UPGRADE CAPACITY CONTROLLERS */}
                        <div className="flex flex-col gap-2.5 pt-1.5 text-left">
                          <span className="text-[10px] font-sans font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="h-3 w-3 fill-blue-500/10" />
                            {language === "bn" ? "স্পেস বর্ধিতকরণ ও আপগ্রেড" : "Expand Room Capacity"}
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-0.5">
                            {/* Standard package */}
                            <button
                              disabled={isUpgradingStorage}
                              onClick={() => upgradeRoomStorage(200, 1000)}
                              className={`p-3 border rounded-xl flex flex-col justify-start text-left relative overflow-hidden transition-all group cursor-pointer hover:border-amber-500/50 disabled:opacity-50 select-none ${
                                theme === "dark" 
                                  ? "bg-slate-950/40 border-slate-850 hover:bg-slate-950/60" 
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/50"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className="text-[11px] font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                  {language === "bn" ? "+২০০ মেগাবাইট প্যাকেজ" : "+200 MB Power Package"}
                                </span>
                                <span className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  1,000 Cr.
                                </span>
                              </div>
                              <span className="text-[10.5px] leading-relaxed text-slate-450 dark:text-slate-400 mt-0.5">
                                {language === "bn"
                                  ? "১,০০০ কয়েনের বিনিময়ে ১০০ ইউনিটের সাথে আরও অতিরিক্ত ১০০ ইউনিট স্টোরেজ স্পেস বোনাস পাবেন!"
                                  : "Get 100 storage units for 1,000 credits, with an additional 100 storage units available as bonus!"}
                              </span>
                            </button>

                            {/* Incremental 100 unit package if needed */}
                            <button
                              disabled={isUpgradingStorage}
                              onClick={() => upgradeRoomStorage(100, 500)}
                              className={`p-3 border rounded-xl flex flex-col justify-start text-left relative overflow-hidden transition-all group cursor-pointer hover:border-blue-500/50 disabled:opacity-50 select-none ${
                                theme === "dark" 
                                  ? "bg-slate-950/40 border-slate-850 hover:bg-slate-950/60" 
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/50"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className="text-[11px] font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                  {language === "bn" ? "+১০০ মেগাবাইট বুস্টার" : "+100 MB Capacity Boost"}
                                </span>
                                <span className="text-[10px] font-mono font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                  500 Cr.
                                </span>
                              </div>
                              <span className="text-[10.5px] leading-relaxed text-slate-450 dark:text-slate-400 mt-0.5">
                                {language === "bn"
                                  ? "৫০০ কয়েনের বিনিময়ে চ্যাট স্টোরেজ ১০০ মেগাবাইট বাড়িয়ে নিন নিখুঁত ট্রান্সফার গ্যারান্টি সহ।"
                                  : "Enable dynamic upgrades by increasing chat room memory by 100 units for credits."}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Storage Distribution Visual Chart Card */}
                  {fileList.length > 0 && (
                    <div 
                      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-4 shadow-xs ${
                        theme === "dark" 
                          ? "bg-slate-900 border-slate-800 text-white animate-none" 
                          : "bg-white border-slate-205 text-slate-900"
                      }`}
                      id="room-storage-distribution-card"
                    >
                      <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800/65">
                        <div className="flex items-center gap-2">
                          <Activity className={`h-4.5 w-4.5 text-blue-500`} />
                          <span className="text-xs font-black uppercase tracking-wider font-sans">
                            {language === "bn" ? "ফাইল মেমোরি বিশ্লেষণ" : "Storage Distribution"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-550">
                          {fileList.length} {fileList.length === 1 ? (language === "bn" ? "টি ফাইল" : "File") : (language === "bn" ? "টি ফাইলসমূহ" : "Files")}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center min-h-[160px]">
                        {/* Left: Recharts Donut Chart */}
                        <div className="w-[140px] h-[140px] flex items-center justify-center relative shrink-0" id="recharts-pie-container">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={storageDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={55}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {storageDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className={`p-2.5 rounded-xl border text-[10px] font-sans shadow-lg font-bold ${
                                        theme === "dark" 
                                          ? "bg-slate-950 border-slate-800 text-white" 
                                          : "bg-white border-slate-200 text-slate-905"
                                      }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
                                          <span className="text-slate-900 dark:text-slate-100 font-extrabold">{data.name}</span>
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-405 font-mono">{language === "bn" ? "সাইজ: " : "Size: "}{data.formattedSize}</div>
                                        <div className="text-slate-500 dark:text-slate-405 font-mono">{language === "bn" ? "টোটাল: " : "Count: "}{data.count}</div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Center floating stat label */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                            <span className="text-xs font-mono font-black select-none leading-none">
                              {formatBytes(totalBytesUsed)}
                            </span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-505 font-black uppercase tracking-wider scale-90 select-none mt-1">
                              {language === "bn" ? "ব্যবহৃত" : "Allocated"}
                            </span>
                          </div>
                        </div>

                        {/* Right: Custom Legend List */}
                        <div className="flex-1 flex flex-col gap-2 w-full text-left" id="storage-categories-legend">
                          {storageDistribution.map((item, index) => (
                            <div 
                              key={item.key || index}
                              className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                                theme === "dark"
                                  ? "bg-slate-950/30 border-slate-900/60 hover:border-slate-800"
                                  : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] font-extrabold truncate text-slate-900 dark:text-slate-100 leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono italic">
                                    {item.count} {item.count === 1 ? (language === "bn" ? "ফাইল" : "file") : (language === "bn" ? "ফাইলসমূহ" : "files")}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-350 shrink-0 ml-2">
                                {item.formattedSize}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning visual alert pop if room capacity almost loaded or exceeds */}
                  {(() => {
                    const currentLimit = roomData?.storageLimitBytes || 100 * 1024 * 1024;
                    const limitMB = currentLimit / (1024 * 1024);
                    const percentUsed = Math.round((totalBytesUsed / currentLimit) * 100);
                    if (totalBytesUsed < currentLimit * 0.9) return null;
                    return (
                      <div className={`p-4 rounded-xl border flex flex-col gap-3 text-left animate-fade-in ${
                        theme === "dark" 
                          ? "bg-rose-950/40 border-rose-900/40 text-rose-300" 
                          : "bg-rose-50 border-rose-150 text-rose-800"
                      }`} id="storage-limit-warning-block">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="flex flex-col w-full">
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-xs">
                                {language === "bn" ? "স্টোরেজ প্রায় সম্পূর্ণ!" : "Storage Space Warning!"}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-rose-500">
                                {percentUsed}%
                              </span>
                            </div>
                            <span className="text-[11px] leading-relaxed mt-1 opacity-85 font-medium">
                              {language === "bn" 
                                ? `আপনার রুমের সর্বোচ্চ ${limitMB} মেগাবাইট সাইজ লিমিটের প্রায় সবটুকুই ব্যবহৃত হয়েছে। নতুন ফাইল পোস্ট বা আপলোড করতে হলে ডিলিট আইকনে ট্যাপ করে পুরাতন ডাটা রিমুভ করুন।` 
                                : `Your ${limitMB}MB temporary room capacity is nearing its limit. Please clean up older files to continue uploading.`}
                            </span>
                          </div>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-rose-900/50' : 'bg-rose-200'}`}>
                          <div 
                            className="h-full bg-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, percentUsed)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Styled Drag & Drop Zone */}
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4 transition-all min-h-[200px] cursor-pointer ${
                      dragActive 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/45 scale-[0.98] shadow-inner" 
                        : theme === "dark"
                        ? "border-slate-800 hover:border-blue-500 bg-slate-900"
                        : "border-slate-200 hover:border-blue-400 bg-white"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                    id="drag-drop-zone-bento"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />

                    <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform ${
                      dragActive 
                        ? "bg-blue-100 text-blue-600 scale-110" 
                        : theme === "dark" 
                        ? "bg-blue-950/65 text-blue-400" 
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      <FileUp className="h-5.5 w-5.5 stroke-[2]" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className={`font-extrabold text-xs sm:text-sm leading-snug transition-colors duration-300 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                        {text.dragZoneTitle[language]}
                      </span>
                      <span className="text-slate-400 text-[10px] italic">
                        {text.dragZoneSub[language]}
                      </span>
                    </div>

                    <div className={`border-t pt-3 w-full max-w-[200px] text-[10px] text-slate-450 font-medium leading-normal transition-colors duration-300 ${theme === "dark" ? "border-slate-800 animate-none" : "border-slate-100"}`}>
                      {language === "bn" ? "সর্বোচ্চ ১০০ মেগাবাইট (100MB) ফাইল সাইজ সীমাবদ্ধতা" : "Allows secure buffers up to remaining free quota"}
                    </div>
                  </div>

                  {/* Config settings panel */}
                  <div className={`border rounded-2xl p-5 shadow-sm transition-colors duration-300 text-left ${theme === "dark" ? "bg-slate-900 border-slate-800 animate-none" : "bg-white border-slate-200"}`}>
                    <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest font-sans mb-3.5">
                      {language === "bn" ? "ডাউনলোড ও নিরাপত্তা নিয়ম" : "Buffer Purging Policy"}
                    </h4>
                    
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="auto-delete-checkbox-bento"
                        checked={autoDeleteOnDownload}
                        onChange={(e) => setAutoDeleteOnDownload(e.target.checked)}
                        className={`h-4 w-4 rounded focus:ring-blue-500 mt-0.5 cursor-pointer transition-colors ${theme === "dark" ? "bg-slate-850 border-slate-700 text-blue-500" : "bg-white border-slate-300 text-blue-600"}`}
                      />
                      <label 
                        htmlFor="auto-delete-checkbox-bento"
                        className={`text-xs select-none cursor-pointer leading-relaxed font-bold block transition-colors ${theme === "dark" ? "text-slate-300" : "text-slate-655"}`}
                      >
                        {text.autoDeleteLabel[language]}
                      </label>
                    </div>
                  </div>

                  {/* Active dynamic upload progress overlay */}
                  {isUploading && (
                    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-850 animate-pulse flex flex-col gap-3.5 text-left">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-300 truncate max-w-[70%]">
                          {uploadingFileName}
                        </span>
                        <span className="text-blue-400 font-mono font-extrabold text-xs">
                          {uploadProgress}%
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      <span className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                        {language === "bn" ? "মেমোরি টানেলে পাঠানো হচ্ছে..." : "Streaming bits into secure buffer partition..."}
                      </span>
                    </div>
                  )}

                  {/* Pending Downloads List Display Card */}
                  <div className={`border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    
                    {/* Panel metadata header */}
                    <div className={`px-5 py-4 border-b flex justify-between items-center transition-colors duration-300 text-left ${theme === "dark" ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}>
                      <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider flex items-center gap-2">
                        <span>{language === "bn" ? "ডাউনলোডের জন্য পেন্ডিং ফাইলসমূহ" : "Pending Buffer Downloads"}</span>
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${theme === "dark" ? "bg-slate-800 text-blue-400 border-blue-900/40" : "bg-blue-50 text-blue-600 border-blue-105"}`}>
                          {fileList.length} {language === "bn" ? "ফাইল" : "Files"}
                        </span>
                      </h3>

                      {fileList.length > 0 && (
                        <button
                          onClick={handleDownloadAll}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-xl font-bold text-[10px] transition-all cursor-pointer focus:outline-none select-none uppercase tracking-wider active:scale-95 ${
                            theme === "dark"
                              ? "bg-blue-950/40 hover:bg-blue-900/40 border-blue-900/60 text-blue-400"
                              : "bg-blue-50 hover:bg-blue-100 border-blue-105 text-blue-700"
                          }`}
                          id="download-all-files-btn"
                          title={language === "bn" ? "সব ফাইল ক্রমানুসারে ডাউনলোড করুন" : "Download all files sequentially"}
                        >
                          <Download className="h-3 w-3 stroke-[2.5]" />
                          <span>{text.downloadAllBtn[language]}</span>
                        </button>
                      )}
                    </div>

                    {/* File rows display */}
                    {fileList.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center justify-center gap-3.5 text-slate-500">
                        <div className={`h-12 w-12 rounded-full border flex items-center justify-center transition-colors ${theme === "dark" ? "bg-slate-850 border-slate-800 text-slate-500 animate-none" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                          <Smartphone className="h-5.5 w-5.5 stroke-[1.5]" />
                        </div>
                        <p className="max-w-[240px] text-xs leading-relaxed text-slate-400 font-semibold italic">
                          {text.noFilesText[language]}
                        </p>
                      </div>
                    ) : (
                      <div className={`divide-y transition-colors duration-300 ${theme === "dark" ? "divide-slate-800" : "divide-slate-100"}`}>
                        <AnimatePresence initial={false}>
                          {fileList.map((file) => {
                            const IconComponent = getFileIcon(file.name, file.mimeType);
                            const fileExt = file.name.split('.').pop()?.toLowerCase() || "";
                            const isImage = file.mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(fileExt);
                            
                            return (
                              <motion.div 
                                key={file.id} 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, height: 0, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all text-left ${theme === "dark" ? "hover:bg-slate-850" : "hover:bg-slate-50/50"}`}
                                id={`file-item-${file.id}`}>
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  
                                  {/* Sleek File Label Box or Ambient Image Thumbnail preview */}
                                  {isImage ? (
                                    <div className={`h-11 w-11 rounded-lg overflow-hidden border shrink-0 bg-slate-100 flex items-center justify-center relative group/thumb shadow-xs transition-transform duration-300 ${
                                      theme === "dark" ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
                                    }`}>
                                      <img
                                        src={`/api/download/${currentRoomCode}/${file.id}?preview=true`}
                                        alt={file.name}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-115 cursor-zoom-in"
                                        referrerPolicy="no-referrer"
                                        title={language === "bn" ? "পূর্ণ চিত্র দেখতে ডাউনলোড করুন" : "Click download below to view high-resolution"}
                                      />
                                      {/* Small image overlay badge */}
                                      <span className="absolute bottom-0 right-0 bg-black/60 text-white font-mono text-[7px] px-1 py-0.2 rounded-tl-sm uppercase scale-90">
                                        {fileExt.substring(0, 3)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] uppercase tracking-wider border transition-colors duration-300 ${
                                      theme === "dark" 
                                        ? "bg-slate-850 border-slate-800 text-blue-400" 
                                        : "bg-blue-50 border-blue-105 text-blue-600"
                                    }`}>
                                      {fileExt.substring(0, 3) || "RAW"}
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1 flex flex-col font-sans">
                                    <span 
                                      className={`font-semibold truncate text-[13px] sm:text-sm transition-colors cursor-pointer ${theme === "dark" ? "text-slate-100 hover:text-blue-400" : "text-slate-950 hover:text-blue-650"}`} 
                                      title={file.name}
                                    >
                                      {file.name}
                                    </span>
                                    
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-slate-450 font-medium">
                                      <span className={`font-bold font-mono px-1 py-0.2 rounded text-slate-500 border ${theme === "dark" ? "bg-slate-955 border-slate-850" : "bg-slate-100 border-slate-200"}`}>
                                        {formatBytes(file.size)}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {language === "bn" ? "আপলোড" : "Uploaded"}: {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>

                                      {file.hasPasscode && (
                                        <>
                                          <span>•</span>
                                          <span className="text-amber-650 font-extrabold bg-amber-500/10 dark:bg-amber-955/20 px-1.5 py-0.5 rounded text-[8px] uppercase border border-amber-200/40 flex items-center gap-0.5">
                                            <Lock className="h-2.5 w-2.5 text-amber-500 stroke-[3]" />
                                            <span>{language === "bn" ? "লক" : "Locked"}</span>
                                          </span>
                                        </>)
                                      }

                                      {file.maxDownloads && file.maxDownloads > 1 ? (
                                        <>
                                          <span>•</span>
                                          <span className="text-blue-650 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase border border-blue-200/40">
                                            {language === "bn" ? `সীমা: ${file.downloadCount}/${file.maxDownloads}` : `Limit: ${file.downloadCount}/${file.maxDownloads}`}
                                          </span>
                                        </>)
                                      : file.autoDelete ? (
                                        <>
                                          <span>•</span>
                                          <span className="text-rose-500 font-bold bg-rose-500/10 px-1 py-0.2 rounded text-[9px] uppercase border border-rose-250/20">
                                            {language === "bn" ? "১ বার ডাউনলোড" : "1-Time"}
                                          </span>
                                        </>)
                                      : null}
                                    </div>
                                  </div>
                                </div>

                                {/* Operations widget downloads */}
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100/5 dark:border-slate-850">
                                  
                                  {/* Countdown Expiry block label */}
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span className="text-slate-400">{text.expiryLabelShort[language]}</span>
                                    <span className={`font-mono font-bold ${file.expiresAt - Date.now() < 5 * 60000 ? "text-rose-500 animate-pulse bg-rose-500/10 px-1.5 py-0.5 rounded" : "text-blue-500 font-extrabold"}`}>
                                      {formatTimeRemaining(file.expiresAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    
                                    {/* Download file trigger link */}
                                    <button
                                      onClick={() => handleDownloadAction(file)}
                                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all shadow-xs shrink-0 cursor-pointer uppercase tracking-wide border border-blue-500 active:scale-95"
                                      title="Download asset File"
                                      id={`download-btn-${file.id}`}
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>{text.downloadBtn[language]}</span>
                                    </button>

                                    {/* Copy Downloadable shared Link */}
                                    <button
                                      onClick={() => copyFileLink(file.id, file.hasPasscode)}
                                      className={`p-1.5 rounded-lg transition-all cursor-pointer border ${theme === "dark" ? "text-slate-400 hover:text-blue-400 hover:bg-slate-900 border-slate-800" : "text-slate-500 hover:text-blue-650 hover:bg-slate-100 border-slate-200"}`}
                                      title="Copy raw download link tool"
                                      id={`copy-file-btn-${file.id}`}
                                    >
                                      {copiedFileId === file.id ? <Check className="h-3.5 w-3.5 text-emerald-500 font-extrabold" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>

                                    {/* Immediate purge action */}
                                    <button
                                      onClick={() => deleteFile(file.id, file.name)}
                                      className={`p-1.5 rounded-lg transition-all cursor-pointer border ${theme === "dark" ? "text-slate-400 hover:text-red-500 hover:bg-red-500/10 border-slate-800" : "text-slate-500 hover:text-red-500 hover:bg-red-50 border-slate-150"}`}
                                      title="Delete immediately right now"
                                      id={`delete-btn-${file.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                    </button>
                                  </div>

                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}

                  </div>



                </div>

                {/* 2. Right Section: Secure Real-time Live Chat Panel (5 / 12 width) */}
                <div className="xl:col-span-5 flex flex-col gap-4">
                  
                  <div className={`border rounded-2xl flex flex-col min-h-[500px] xl:h-[620px] shadow-xs relative transition-colors duration-300 select-none overflow-hidden ${
                    theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`} id="bento-live-chat-panel">
                    
                    {/* Chat Header */}
                    <div className={`px-5 py-4 border-b flex items-center justify-between transition-colors duration-300 ${
                      theme === "dark" ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
                    }`}>
                      <div className="flex items-center gap-2.5 text-left">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight flex items-center gap-1.5 uppercase">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                            {language === "bn" ? "লাইভ রুম চ্যাট (সুরক্ষিত)" : "Real-time Node Chat"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {language === "bn" ? "রুম শেষ হলে মেসেজগুলো ডিলিট হবে" : "Instant sync (Wiped on room end)"}
                          </span>
                        </div>
                      </div>
                      
                      {/* 1H Room limit marker count and Time Setting Toggle */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setUseRelativeChatTime(!useRelativeChatTime)}
                          className="flex items-center gap-1 font-mono text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 border dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                          title={language === "bn" ? "সময়ের ধরন পরিবর্তন করুন" : "Toggle Time Format"}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{useRelativeChatTime ? (language === "bn" ? "রিলেটিভ" : "REL") : (language === "bn" ? "অ্যাবসলিউট" : "ABS")}</span>
                        </button>
                        <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 border dark:border-slate-800 rounded-lg">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>1H LIMIT</span>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Messages list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scrollbar-thin scrollbar-thumb-slate-800 select-text">
                      {(!roomData?.messages || roomData.messages.length === 0) ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-center gap-3">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
                            <MessageSquare className="h-6 w-6 text-slate-400 stroke-[1.5]" />
                          </div>
                          <p className="text-[11px] leading-relaxed italic text-slate-450 max-w-[220px]">
                            {language === "bn" 
                              ? "চ্যাটে কোনো মেসেজ নেই। কুইক মেসেজ পাঠাতে নিচে টাইপ করুন বা রিমোট নোডের জন্য ভয়েস রেকর্ড পাঠান!"
                              : "Tunnel messaging is empty. Type instructions or transmit audio clips seamlessly!"}
                          </p>
                        </div>
                      ) : (
                        roomData.messages.map((msg) => {
                          const isMe = msg.senderId === sessionSenderId;
                          
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[85%] text-left ${isMe ? "self-end items-end" : "self-start items-start"} group relative`}
                            >
                              {/* Hover Reaction trigger / Picker */}
                              <div className={`absolute -top-3.5 z-15 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 ${
                                isMe ? "right-1" : "left-1"
                              }`}>
                                <div className={`flex items-center gap-1 p-1 rounded-full border shadow-md ${
                                  theme === "dark" 
                                    ? "bg-slate-950 border-slate-800"
                                    : "bg-white border-slate-200"
                                }`}>
                                  {["👍", "❤️", "😄", "😮", "😢", "🔥"].map((emoji) => {
                                    const hasSelfReacted = msg.reactions?.[emoji]?.includes(sessionSenderId);
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(msg.id, emoji)}
                                        className={`h-5 w-5 flex items-center justify-center text-xs rounded-full hover:scale-130 active:scale-95 transition-all ${
                                          hasSelfReacted 
                                            ? "bg-blue-500/10 scale-110" 
                                            : "hover:bg-slate-500/10"
                                        }`}
                                        title={emoji}
                                      >
                                        {emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Sender title name */}
                              <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1 tracking-tight">
                                {isMe ? (language === "bn" ? "আমার নোড (You)" : "My Node") : msg.senderName}
                              </span>

                              {/* Speech bubble contents */}
                              <div className={`p-3 rounded-2xl text-xs leading-relaxed break-all border ${
                                isMe 
                                  ? "bg-blue-600 border-blue-500 text-white rounded-tr-none" 
                                  : theme === "dark"
                                  ? "bg-slate-955 border-slate-800 text-slate-200 rounded-tl-none"
                                  : "bg-slate-50 border-slate-200 text-slate-800 rounded-tl-none"
                              }`}>
                                {msg.type === "text" && (
                                  <p className="whitespace-pre-wrap select-text font-medium leading-relaxed">{msg.content}</p>
                                )}

                                {msg.type === "image" && (
                                  <div className="relative overflow-hidden rounded-lg max-h-48 border border-neutral-800/10 bg-black/5 dark:bg-black/25">
                                    <img 
                                      src={msg.content} 
                                      className="max-h-44 object-contain rounded-md cursor-pointer hover:opacity-90 active:scale-98 transition-all" 
                                      alt="Chat attachment visual asset" 
                                      onClick={() => {
                                        const newTab = window.open();
                                        if (newTab) {
                                          newTab.document.write(`<img src="${msg.content}" style="max-width:100%; height:auto; display:block; margin:auto;" />`);
                                        }
                                      }}
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}

                                {msg.type === "voice" && (
                                  <div className="flex flex-col gap-1 inline-flex p-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-300">
                                      <Volume2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                      <span>Voice message</span>
                                    </div>
                                    <audio 
                                      src={msg.content} 
                                      controls 
                                      className="max-w-[195px] h-7 bg-slate-900 rounded-full scale-95 mt-1 focus:outline-none" 
                                      referrerPolicy="no-referrer"
                                    />
                                    {msg.transcription && (
                                      <div className={`mt-1.5 text-[10px] md:text-[11px] italic font-medium p-2 rounded-lg break-words ${isMe ? "bg-black/10 text-blue-100" : (theme === "dark" ? "bg-black/20 text-slate-300" : "bg-slate-200/50 text-slate-600")}`}>
                                        "{msg.transcription}"
                                      </div>
                                    )}
                                  </div>
                                )}

                                {msg.type === "file_request" && (
                                  <div className="flex flex-col gap-2 p-1.5 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-full ${isMe ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                        <FileSearch className={`h-4 w-4 ${isMe ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                                      </div>
                                      <span className="font-bold text-[11px] leading-tight">
                                        {isMe 
                                          ? (language === "bn" ? "আপনি ফাইল আপলোড করতে রিকোয়েস্ট পাঠিয়েছেন" : "Requested remote file upload") 
                                          : (language === "bn" ? "আপনার কাছে ফাইল আপলোডের রিকোয়েস্ট এসেছে" : "Requested you to upload a file")}
                                      </span>
                                    </div>
                                    
                                    {!isMe && (
                                      <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 border border-blue-500"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>{language === "bn" ? "ক্লিক করে ফাইল সিলেক্ট করুন" : "Select & Upload File"}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Display Active Reactions list below bubble */}
                              {msg.reactions && Object.keys(msg.reactions).some(emoji => ((msg.reactions as Record<string, string[]>)[emoji] || []).length > 0) && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                  {Object.entries(msg.reactions).map(([emoji, val]) => {
                                    const userIds = val as string[];
                                    if (!userIds || userIds.length === 0) return null;
                                    const hasReacted = userIds.includes(sessionSenderId);
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(msg.id, emoji)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
                                          hasReacted
                                            ? (theme === "dark" 
                                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300" 
                                                : "bg-blue-50 border-blue-200 text-blue-600")
                                            : (theme === "dark"
                                                ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                                                : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800")
                                        }`}
                                        title={`${userIds.length} reaction(s)`}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-[8px] font-mono font-bold">${userIds.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Formatted time stamp */}
                              <span className="text-[8px] text-slate-450 mt-0.5 px-1 font-mono">
                                {useRelativeChatTime 
                                  ? formatRelativeTime(msg.createdAt, language) 
                                  : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Recording Wave Indicator bar overlays */}
                    {isRecording && (
                      <div className="absolute inset-x-0 bottom-[64px] bg-red-600 px-4 py-3 border-t border-red-500/30 flex flex-col gap-2 text-white animate-fade-in z-10 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-bounce"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider font-mono">
                              {language === "bn" ? "ভয়েস রেকর্ড হচ্ছে..." : "Mic Stream Live"}
                            </span>
                            <span className="text-xs font-semibold font-mono bg-red-750 px-2 py-0.5 rounded border border-white/20">
                              {recordingDuration}s
                            </span>
                          </div>
                          <button 
                            onClick={stopVoiceRecording}
                            className="bg-white text-red-650 hover:bg-neutral-100 font-bold p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-md"
                            title="Stop and Send"
                          >
                            <Square className="h-4 w-4 fill-red-655 text-red-655" />
                          </button>
                        </div>
                        {transcriptionText && (
                          <div className="text-[10px] italic opacity-90 px-1 line-clamp-2">
                            "{transcriptionText}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat typing footer controls container */}
                    <div className={`p-3 border-t flex items-center gap-2 transition-colors duration-300 ${
                      theme === "dark" ? "border-slate-800 bg-slate-950/25" : "border-slate-150 bg-slate-50/50"
                    }`}>
                      {/* Hidden file input for picture picker */}
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={chatImageInputRef} 
                        onChange={handleChatImageSelect} 
                        className="hidden" 
                      />
                      
                      {/* Request File button */}
                      <button
                        onClick={() => sendChatMessage("file_request", "File Request")}
                        disabled={isRecording}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none disabled:opacity-40 shrink-0 ${
                          theme === "dark" 
                            ? "border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-slate-400" 
                            : "border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-505"
                        }`}
                        title={language === "bn" ? "অন্য ডিভাইস থেকে ফাইল চান" : "Request File Context"}
                      >
                        <FileSearch className="h-4 w-4 text-emerald-500" />
                      </button>

                      {/* Attach image asset button */}
                      <button
                        onClick={() => chatImageInputRef.current?.click()}
                        disabled={isRecording}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none disabled:opacity-40 shrink-0 ${
                          theme === "dark" 
                            ? "border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-slate-400" 
                            : "border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-505"
                        }`}
                        title={language === "bn" ? "ছবি নির্বাচন করুন" : "Attach Image"}
                      >
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                      </button>

                      {/* Mic recording button */}
                      <button
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none shrink-0 ${
                          isRecording 
                            ? "bg-red-650 text-white border-red-500 animate-pulse" 
                            : theme === "dark"
                            ? "border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-slate-400"
                            : "border-slate-200 bg-white hover:bg-slate-105 hover:border-slate-300 text-slate-505"
                        }`}
                        title={language === "bn" ? "ভয়েস রেকর্ড" : "Record Audio message"}
                      >
                        <Mic className={`h-4 w-4 ${isRecording ? "text-white" : "text-amber-500"}`} />
                      </button>

                      {/* Typing box */}
                      <input
                        type="text"
                        placeholder={language === "bn" ? "একটি মেসেজ বা প্রম্পট লিখুন..." : "Type text or prompt command..."}
                        className={`flex-1 text-xs sm:text-sm font-sans px-3.5 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950"
                        }`}
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendChatMessage();
                        }}
                        disabled={isRecording}
                      />

                      {/* Send submit arrow button */}
                      <button
                        onClick={() => sendChatMessage()}
                        disabled={!chatInputText.trim() || isRecording}
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 shadow shadow-blue-500/10 border border-blue-500"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Outer Page Footer (Matches Sleek Interface Specifications) */}
        <footer className={`px-6 sm:px-8 py-4 border-t flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-mono gap-3 shrink-0 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex gap-4 sm:gap-6 text-center sm:text-left flex-wrap justify-center">
            <span>Region: Asia-South (BD)</span>
            <span>Latency: ~18ms</span>
            <span className="hidden sm:inline">•</span>
            <span>Server Retention: 1 Hour Limit</span>
          </div>
          <div className="font-bold text-slate-500 tracking-wider">
            {currentRoomCode ? `Bridge ID: FLX-${currentRoomCode}` : "Bridge ID: Offline"}
          </div>
        </footer>

      </div>

      {/* QR Code scanned Modal backdrop */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="qr-modal-overlay">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80" : "bg-white border border-slate-100"}`}>
            
            <button 
              onClick={() => setShowQrModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="qr-modal-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-11 w-11 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-blue-950/50 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <QrCode className="h-5.5 w-5.5 stroke-[2.5]" />
            </span>

            <div className="flex flex-col">
              <h3 className={`text-lg font-extrabold transition-colors ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {text.qrModalTitle[language]}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                {text.qrModalDesc[language]}
              </p>
            </div>

            {/* QR block frame */}
            <div className={`p-4 rounded-2xl border flex items-center justify-center shadow-inner transition-colors ${theme === "dark" ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-100/85"}`}>
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="Room connection QR code scan link" 
                  className={`h-44 w-44 object-contain rounded-lg shadow-sm ${theme === "dark" ? "brightness-95 contrast-105" : ""}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-slate-400 font-semibold italic text-xs">
                  {language === "bn" ? "কিউআর কোড তৈরি হচ্ছে..." : "Building QR Code Image..."}
                </div>
              )}
            </div>

            {/* Room code representation representation */}
            <div className={`border rounded-xl px-4 py-2 text-center w-full shadow-sm ${theme === "dark" ? "bg-blue-950/45 border-blue-900/40" : "bg-blue-50 border-blue-105"}`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest font-mono block ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                {language === "bn" ? "কানেক্ট কোড" : "QUICK CONNECT CODE"}
              </span>
              <span className={`text-xl font-bold font-mono tracking-widest uppercase ${theme === "dark" ? "text-blue-350" : "text-blue-700"}`}>
                {currentRoomCode}
              </span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className={`w-full mt-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all ${theme === "dark" ? "bg-white hover:bg-slate-100 text-slate-950" : "bg-slate-950 hover:bg-slate-900 text-white"}`}
              id="qr-modal-close-action-btn"
            >
              {text.closeBtn[language]}
            </button>
          </div>
        </div>
      )}

      {/* App Share QR Code Modal backdrop */}
      {showAppQrModal && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="app-qr-modal-overlay">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80" : "bg-white border border-slate-100"}`}>
            
            <button 
              onClick={() => setShowAppQrModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="app-qr-modal-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-11 w-11 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-blue-950/50 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Share2 className="h-5.5 w-5.5 stroke-[2.5]" />
            </span>

            <div className="flex flex-col">
              <h3 className={`text-lg font-extrabold transition-colors ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {text.appQrModalTitle[language]}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                {text.appQrModalDesc[language]}
              </p>
            </div>

            {/* QR block frame */}
            <div className={`p-4 rounded-2xl border flex items-center justify-center shadow-inner transition-colors ${theme === "dark" ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-100/85"}`}>
              {appQrCodeDataUrl ? (
                <img 
                  src={appQrCodeDataUrl} 
                  alt="Application QR code scan link" 
                  className={`h-44 w-44 object-contain rounded-lg shadow-sm ${theme === "dark" ? "brightness-95 contrast-105" : ""}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-slate-400 font-semibold italic text-xs">
                  {language === "bn" ? "কিউআর কোড তৈরি হচ্ছে..." : "Building QR Code Image..."}
                </div>
              )}
            </div>

            {/* Application URL display with quick copy */}
            <div className="w-full flex flex-col gap-2">
              <div className={`border rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm ${theme === "dark" ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                <span className={`text-[10px] font-mono truncate select-all flex-1 text-left ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  {window.location.origin}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    showStatus(language === "bn" ? "অ্যাপ লিংক কপি হয়েছে!" : "App link copied to clipboard!", "success");
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${theme === "dark" ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-200 text-slate-500"}`}
                  title="Copy App Link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAppQrModal(false)}
              className={`w-full mt-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all ${theme === "dark" ? "bg-white hover:bg-slate-100 text-slate-950" : "bg-slate-950 hover:bg-slate-900 text-white"}`}
              id="app-qr-modal-close-action-btn"
            >
              {text.closeBtn[language]}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Download Confirmation Modal */}
      {showBulkDownloadConfirm && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="bulk-download-confirm-modal">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80" : "bg-white border border-slate-100"}`}>
            
            <button 
              onClick={() => setShowBulkDownloadConfirm(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="bulk-download-confirm-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-11 w-11 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-blue-950/50 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Download className="h-5.5 w-5.5 stroke-[2.5]" />
            </span>

            <div className="flex flex-col">
              <h3 className={`text-md font-extrabold transition-colors ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {language === "bn" ? "ডাউনলোডের নিশ্চিতকরণ" : "Confirm Bulk Download"}
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                {language === "bn" 
                  ? `রুমটিতে ৩টির বেশি ফাইল রয়েছে। আপনি কি সব ফাইল একত্রে ডাউনলোড করতে চান? এটি আপনার ব্রাউজারে একাধিক ডাউনলোড ট্রিগার করবে।`
                  : `This room has more than 3 files. Are you sure you want to download all files sequentially? This will trigger multiple downloads in your browser.`}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={async () => {
                  setShowBulkDownloadConfirm(false);
                  if (roomData?.files) {
                    const currentFiles = Object.values(roomData.files) as FileMeta[];
                    const nonPasscodeFiles = currentFiles.filter((f) => !f.hasPasscode);
                    await startBulkDownload(nonPasscodeFiles);
                  }
                }}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white border border-blue-500`}
                id="bulk-download-confirm-yes"
              >
                {language === "bn" ? "হ্যাঁ, ডাউনলোড করুন" : "Yes, Download All"}
              </button>
              <button
                onClick={() => setShowBulkDownloadConfirm(false)}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all ${theme === "dark" ? "bg-slate-850 hover:bg-slate-750 text-slate-300" : "bg-slate-100 hover:bg-slate-250 text-slate-700"}`}
                id="bulk-download-confirm-no"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera QR scanner modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            id="qr-scanner-modal-overlay"
          >
            <style>{`
              @keyframes qrlaser {
                0% { top: 0%; }
                50% { top: 100%; }
                100% { top: 0%; }
              }
              #qr-scanner-viewport video {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 1rem !important;
              }
            `}</style>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 35 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80" : "bg-white border border-slate-100"}`}
            >
            
            <button 
              onClick={() => setShowScanner(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="qr-scanner-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-11 w-11 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-blue-950/50 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <Camera className="h-5.5 w-5.5 stroke-[2.5]" />
            </span>

            {/* Camera Permissions Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border transition-all shadow-sm ${
              theme === "dark" 
                ? "bg-slate-950/40 border-slate-800" 
                : "bg-slate-50 border-slate-200"
            }`} id="camera-permission-status-badge">
              <span className="relative flex h-2 w-2 shrink-0">
                {cameraStatus === "active" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : cameraStatus === "checking" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                ) : (
                  <>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                  </>
                )}
              </span>
              <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
                {language === "bn" ? "ক্যামেরা পারমিশন: " : "Camera Status: "}
                <span className={`font-black ${
                  cameraStatus === "active" 
                    ? "text-emerald-500" 
                    : cameraStatus === "blocked" 
                      ? "text-rose-500" 
                      : "text-amber-500"
                }`}>
                  {cameraStatus === "active" 
                    ? (language === "bn" ? "সক্রিয়" : "Active & Glowing") 
                    : cameraStatus === "blocked" 
                      ? (language === "bn" ? "অবরুদ্ধ / এরর" : "Blocked / Error") 
                      : (language === "bn" ? "কানেক্ট করা হচ্ছে..." : "Connecting...")
                  }
                </span>
              </span>
            </div>

            <div className="flex flex-col">
              <h3 className={`text-lg font-extrabold transition-colors ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {text.scanModalTitle[language]}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                {text.scanModalDesc[language]}
              </p>
            </div>

            {/* Camera Viewfinder container */}
            <div className="w-full aspect-square max-w-[280px] bg-slate-950 rounded-2xl overflow-hidden relative shadow-inner border border-slate-800 flex items-center justify-center">
              
              {/* Actual scanning viewport target defined by html5-qrcode */}
              <div id="qr-scanner-viewport" className="w-full h-full object-cover"></div>
              
              {/* Laser overlay animation, only active if no error */}
              {!scannerError && (
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] pointer-events-none z-10" 
                  style={{ animation: 'qrlaser 2.5s ease-in-out infinite' }}
                />
              )}
              
              {/* Crosshair corners decorative overlay */}
              <div className="absolute inset-6 border border-white/20 pointer-events-none rounded-xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-md"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-md"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-md"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-md"></div>
              </div>
            </div>

            {/* Enable Flash / Torch Button */}
            {isTorchSupported && (
              <button
                onClick={toggleScannerTorch}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                  isTorchOn
                    ? "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-500/25"
                    : theme === "dark"
                      ? "bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
                id="toggle-torch-btn"
                title={language === "bn" ? "ফ্ল্যাশ লাইট অন বা অফ করুন" : "Toggle camera flash / light"}
              >
                {isTorchOn ? (
                  <>
                    <ZapOff className="h-4 w-4 animate-pulse text-white" />
                    <span>{language === "bn" ? "ফ্ল্যাশ বন্ধ করুন" : "Disable Flash"}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500/15" />
                    <span>{language === "bn" ? "ফ্ল্যাশ অন করুন" : "Enable Flash"}</span>
                  </>
                )}
              </button>
            )}

            {/* Error display if camera fails */}
            {scannerError && (
              <div className={`w-full flex items-center gap-2 p-3 rounded-xl text-xs font-semibold text-left border ${theme === "dark" ? "bg-rose-950/40 border-rose-900/40 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                <span className="leading-snug">{scannerError}</span>
              </div>
            )}

            <button
              onClick={() => setShowScanner(false)}
              className={`w-full mt-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all ${theme === "dark" ? "bg-white hover:bg-slate-100 text-slate-950" : "bg-slate-950 hover:bg-slate-900 text-white"}`}
              id="qr-scanner-close-action-btn"
            >
              {text.closeBtn[language]}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Premium Passcode Verification Modal */}
      {pendingRoomCode && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="passcode-verification-modal">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-5 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80 text-white" : "bg-white border border-slate-100 text-slate-900"}`}>
            
            <button 
              onClick={() => {
                setPendingRoomCode(null);
                setInputPasscode("");
                setPasscodeError(null);
              }}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="passcode-modal-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-12 w-12 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-amber-950/50 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
              <Lock className="h-5.5 w-5.5 stroke-[2.5]" />
            </span>

            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold tracking-tight">
                Secure Room Required
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                This room is locked with passcode protection. Enter the matching passcode to synchronize and open files.
              </p>
            </div>

            {/* Input field */}
            <div className="w-full space-y-4">
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter Room Passcode"
                  maxLength={16}
                  className={`w-full text-center text-sm font-sans pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-950"}`}
                  value={inputPasscode}
                  onChange={(e) => {
                    setInputPasscode(e.target.value);
                    setPasscodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyPasscode();
                  }}
                />
              </div>

              {passcodeError && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold text-left border ${theme === "dark" ? "bg-rose-950/30 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => {
                  setPendingRoomCode(null);
                  setInputPasscode("");
                  setPasscodeError(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all ${theme === "dark" ? "border-slate-800 text-slate-400 hover:bg-slate-850" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Cancel
              </button>
              
              <button
                onClick={handleVerifyPasscode}
                disabled={isCheckingPasscode}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isCheckingPasscode ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-3.5 w-3.5" />
                    <span>Verify & Join</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Staged File Custom Configuration & Local Preview Modal */}
      {stagedFiles.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="staged-file-modal">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-auto relative shadow-2xl flex flex-col gap-5 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 text-white shadow-black/80" : "bg-white border border-slate-150 text-slate-900 shadow-slate-350/20"}`}>
            
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-4 border-slate-800/10">
              <div className="flex flex-col text-left">
                <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                  {language === "bn" ? "ফাইল আপলোড কনফিগারেশন" : "File Upload Configurator"}
                </span>
                <h3 className="text-lg font-black tracking-tight mt-0.5">
                  {language === "bn" ? "নিরাপদ ফাইল আদান প্রদান" : "Secure File Properties"}
                </h3>
              </div>
              <button 
                onClick={cancelStagedUpload}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-150 text-slate-500"}`}
                id="close-staged-upload-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Local Preview Workspace */}
            <div className={`rounded-2xl p-4 flex flex-col items-center justify-center border ${theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
              {stagedPreviewUrl ? (
                <div className="relative max-h-40 w-full overflow-hidden rounded-xl flex items-center justify-center">
                  <img src={stagedPreviewUrl} className="max-h-36 object-contain rounded-lg shadow-sm" alt="Uploader preview image content" referrerPolicy="no-referrer" />
                </div>
              ) : stagedTextContent ? (
                <div className="w-full max-h-32 overflow-y-auto font-mono text-[10px] text-left p-3 bg-slate-950 text-emerald-400 rounded-xl leading-relaxed whitespace-pre-wrap select-none border border-emerald-950/40">
                  {stagedTextContent}
                  {stagedFiles[0].size > 800 && " ... [truncated preview]"}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs border ${theme === "dark" ? "bg-slate-900 border-slate-800 text-blue-400" : "bg-white border-slate-200 text-blue-600"}`}>
                    {stagedFiles.length > 1 ? "MULT" : (stagedFiles[0].name.split('.').pop() || "RAW").toUpperCase()}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-xs text-slate-400 font-mono">
                      {stagedFiles.length > 1 ? `${stagedFiles.length} files selected` : (language === "bn" ? "কোন প্রিভিউ উপলভ্য নেই" : "No live preview available")}
                    </span>
                    <span className="text-[10px] italic text-slate-500 mt-0.5">
                      {stagedFiles.length > 1 ? "Batched configuration" : (language === "bn" ? "আকার ও এক্সটেনশন যাচাই করুন" : "Verify metadata format specifications")}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Filename & Information details */}
              <div className="w-full mt-3 pt-3 border-t border-dashed border-slate-800/10 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-1">
                <span className="text-xs font-bold truncate max-w-[280px]" title={stagedFiles.length > 1 ? `${stagedFiles.length} Multiple Files Selected` : stagedFiles[0].name}>
                  {stagedFiles.length > 1 ? `${stagedFiles.length} Multiple Files Selected` : stagedFiles[0].name}
                </span>
                <span className="text-[10px] font-bold font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 border border-blue-800/50 rounded-md">
                  {stagedFiles.length > 1 
                    ? formatBytes(stagedFiles.reduce((acc, file) => acc + file.size, 0)) 
                    : formatBytes(stagedFiles[0].size)}
                </span>
              </div>
            </div>

            {/* Custom Control properties */}
            <div className="space-y-4 text-left">
              
              {/* 1. Download limits selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {language === "bn" ? "ডাউনলোড সীমা (কতবার ডাউনলোড করা যাবে)" : "Download Limit (How many times allowed)"}
                </span>
                
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 5, 10, 0].map((num) => {
                    const isSelected = stagedMaxDownloads === num;
                    let label = num === 0 ? "∞" : `${num}x`;
                    let desc = num === 1 ? (language === "bn" ? "ডিলিট" : "Burn") : num === 0 ? (language === "bn" ? "সীমাহীন" : "Unlimited") : `${num} বার`;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setStagedMaxDownloads(num)}
                        className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none transition-all ${
                          isSelected 
                            ? "bg-blue-600 border-blue-500 text-white font-bold scale-102 shadow-md shadow-blue-600/15" 
                            : theme === "dark"
                            ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-black leading-none">{label}</span>
                        <span className={`text-[8px] tracking-tight ${isSelected ? "text-blue-100 font-bold" : "text-slate-500"}`}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Expiration setup duration */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {language === "bn" ? "স্বয়ংক্রিয় মেয়াদ শেষ (কতক্ষণ পর ফাইলটি ডিলিট হবে)" : "Auto Delete Expiration (Custom Lifetime)"}
                </span>
                <select
                  value={stagedExpiresIn}
                  onChange={(e) => setStagedExpiresIn(Number(e.target.value))}
                  className={`w-full py-2.5 px-3 rounded-xl border transition-all text-xs font-bold font-sans outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-white" 
                      : "bg-slate-50 border-slate-250 text-slate-900"
                  }`}
                >
                  <option value={5}>{language === "bn" ? "৫ মিনিট (অতি গোপনীয়)" : "5 Minutes (Highly Temporary)"}</option>
                  <option value={15}>{language === "bn" ? "১৫ মিনিট (অস্থায়ী)" : "15 Minutes (Short-lived)"}</option>
                  <option value={60}>{language === "bn" ? "১ ঘণ্টা (স্ট্যান্ডার্ড)" : "1 Hour (Standard Default)"}</option>
                  <option value={240}>{language === "bn" ? "৪ ঘণ্টা" : "4 Hours (Extended)"}</option>
                  <option value={720}>{language === "bn" ? "১২ ঘণ্টা" : "12 Hours (Half Day)"}</option>
                  <option value={1440}>{language === "bn" ? "২৪ ঘণ্টা (সর্বোচ্চ)" : "24 Hours (Maximum Retention)"}</option>
                </select>
              </div>

              {/* 3. Lock with dynamic Password (Optional file-specific key) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {language === "bn" ? "ফাইলের ব্যক্তিগত পাসওয়ার্ড (ঐচ্ছিক)" : "File Lock Code / Password (Optional)"}
                </span>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={16}
                    placeholder={language === "bn" ? "ফাইলের পাসওয়ার্ড দিন (ডাউনলোডের জন্য লাগবে)" : "Set file password (required to download)"}
                    className={`w-full text-sm placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-950"
                    }`}
                    value={stagedPasscode}
                    onChange={(e) => setStagedPasscode(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={cancelStagedUpload}
                className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all ${theme === "dark" ? "border-slate-800 text-slate-300 hover:bg-slate-850" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {language === "bn" ? "বাতিল করুন" : "Cancel"}
              </button>
              
              <button
                onClick={confirmAndUploadFile}
                className="flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <FileCheck className="h-4 w-4" />
                <span>{language === "bn" ? "আপলোড শুরু করুন" : "Confirm & Upload"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* File Passcode Verification Prompt Modal */}
      {pendingDownloadFile && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="file-passcode-verification-modal">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-5 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80 text-white" : "bg-white border border-slate-100 text-slate-900"}`}>
            
            <button 
              onClick={() => {
                setPendingDownloadFile(null);
                setInputFilePasscode("");
                setFilePasscodeError(null);
              }}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"}`}
              id="file-passcode-modal-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <span className={`h-11 w-11 rounded-full flex items-center justify-center shadow-inner ${theme === "dark" ? "bg-amber-950/50 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
              <Lock className="h-5 w-5 stroke-[2.5]" />
            </span>

            <div className="flex flex-col">
              <h3 className="text-md font-extrabold tracking-tight">
                {language === "bn" ? "ফাইলের পাসওয়ার্ড আবশ্যক" : "File Passcode Required"}
              </h3>
              <p className="text-xs text-slate-450 mt-1.5 leading-relaxed font-semibold">
                {language === "bn" 
                  ? `"${pendingDownloadFile.name}" ফাইলটি সুরক্ষিত। এটি ডাউনলোড করতে সঠিক ফাইল পাসওয়ার্ডটি লিখুন।` 
                  : `"${pendingDownloadFile.name}" is a locked resource. Enter the custom file passcode to process download.`}
              </p>
            </div>

            {/* Input field */}
            <div className="w-full space-y-4">
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder={language === "bn" ? "ফাইলের পাসওয়ার্ড দিন" : "Enter File Password"}
                  maxLength={16}
                  className={`w-full text-center text-sm font-sans pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-950"}`}
                  value={inputFilePasscode}
                  onChange={(e) => {
                    setInputFilePasscode(e.target.value);
                    setFilePasscodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyFilePasscode();
                  }}
                />
              </div>

              {filePasscodeError && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold text-left border ${theme === "dark" ? "bg-rose-950/30 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{filePasscodeError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => {
                  setPendingDownloadFile(null);
                  setInputFilePasscode("");
                  setFilePasscodeError(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all ${theme === "dark" ? "border-slate-800 text-slate-400 hover:bg-slate-850" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
              
              <button
                onClick={handleVerifyFilePasscode}
                disabled={isVerifyingFilePasscode}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isVerifyingFilePasscode ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{language === "bn" ? "যাচাই হচ্ছে..." : "Verifying..."}</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-3.5 w-3.5" />
                    <span>{language === "bn" ? "যাচাই ও ডাউনলোড" : "Verify & Get"}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex layout items-center justify-center p-4 z-50">
          <div className={`rounded-3xl p-6 sm:p-8 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 text-white" : "bg-white border border-slate-200 text-slate-900"}`}>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-rose-500" />
                Admin System Dashboard
              </h2>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className={`p-2 rounded-full cursor-pointer transition-all ${theme === "dark" ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setAdminTab("rooms")}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors ${adminTab === "rooms" ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Live Rooms {adminData ? `(${Object.keys(adminData).length})` : ""}
              </button>
              <button 
                onClick={() => setAdminTab("users")}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors ${adminTab === "users" ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Users List
              </button>
            </div>

            <div className="flex-1 overflow-auto pr-2">
              {adminTab === "rooms" && (
                !adminData ? (
                  <div className="flex justify-center py-20 text-slate-500 items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" /> Loading node states...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(adminData).length === 0 && (
                      <div className="text-center py-10 opacity-60">No active rooms currently stored in memory.</div>
                    )}
                    {Object.values(adminData).map((room: any) => (
                      <div key={room.code} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold font-mono text-blue-500">Room: {room.code}</h3>
                            <p className="text-xs opacity-60">Created: {new Date(room.createdAt).toLocaleString()}</p>
                            <p className="text-xs opacity-60">Passcode Protected: {room.passcode ? "Yes" : "No"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-200 dark:bg-slate-800">
                              {Object.keys(room.files || {}).length} Files
                            </span>
                          </div>
                        </div>

                        {Object.keys(room.files || {}).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Files In Room</h4>
                            <div className="space-y-2">
                              {Object.values(room.files).map((file: any) => (
                                <div key={file.id} className={`p-3 rounded-lg border flex justify-between items-center ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                  <div className="truncate pr-4 flex-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-[10px] opacity-60 font-mono">{formatBytes(file.size)} • {file.mimeType}</p>
                                  </div>
                                  <div className="text-right whitespace-nowrap">
                                    <p className="text-[10px] opacity-60">Downloads: {file.downloadCount}/{file.maxDownloads || "∞"}</p>
                                    <p className="text-[10px] text-rose-500">Expires: {new Date(file.expiresAt).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {adminTab === "users" && (
                <div className="space-y-4">
                  {adminUsers.length === 0 && (
                    <div className="text-center py-10 opacity-60">No users found.</div>
                  )}
                  {adminUsers.map((user: any) => (
                    <div key={user.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <p className="text-sm font-bold text-blue-500">{user.email}</p>
                        <p className="text-xs opacity-60 font-mono">UID: {user.id}</p>
                        <p className="text-xs opacity-60">Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Credits</span>
                          <span className="text-lg font-mono font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">{user.credits || 0}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                            <button
                              onClick={async () => {
                                const newAmount = Math.max(0, (user.credits || 0) - 100);
                                try {
                                  await updateDoc(doc(db, "users", user.id), { credits: newAmount });
                                  setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: newAmount } : u));
                                  showStatus("Removed 100 credits", "success");
                                } catch(e) {
                                  showStatus("Failed", "error");
                                }
                              }}
                              className={`px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200"}`}
                            >
                              -100
                            </button>
                            <button
                              onClick={async () => {
                                const newAmount = (user.credits || 0) + 100;
                                try {
                                  await updateDoc(doc(db, "users", user.id), { credits: newAmount });
                                  setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: newAmount } : u));
                                  showStatus("Added 100 credits", "success");
                                } catch(e) {
                                  showStatus("Failed to add", "error");
                                }
                              }}
                              className={`px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors ${theme === "dark" ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-200 hover:bg-slate-300"}`}
                            >
                              +100
                            </button>
                          </div>
                          <div className="flex gap-1 border border-blue-500/30 rounded overflow-hidden">
                            <button
                              onClick={async () => {
                                const newAmount = Math.max(0, (user.credits || 0) - 500);
                                try {
                                  await updateDoc(doc(db, "users", user.id), { credits: newAmount });
                                  setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: newAmount } : u));
                                  showStatus("Removed 500 credits", "success");
                                } catch(e) {
                                  showStatus("Failed", "error");
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors bg-blue-900/40 hover:bg-blue-800/60 text-blue-300"
                            >
                              -500
                            </button>
                            <button
                              onClick={async () => {
                                const newAmount = (user.credits || 0) + 500;
                                try {
                                  await updateDoc(doc(db, "users", user.id), { credits: newAmount });
                                  setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: newAmount } : u));
                                  showStatus("Added 500 credits", "success");
                                } catch(e) {
                                  showStatus("Failed to add", "error");
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors bg-blue-600 hover:bg-blue-500 text-white flex-1"
                            >
                              +500
                            </button>
                          </div>
                          <button
                            onClick={async () => {
                              const newAmount = 10000000;
                              try {
                                await updateDoc(doc(db, "users", user.id), { credits: newAmount });
                                setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: newAmount } : u));
                                showStatus("Added Unlimited credits", "success");
                              } catch(e) {
                                showStatus("Failed to add", "error");
                              }
                            }}
                            className="px-2 py-1 text-[10px] font-bold cursor-pointer border border-amber-500/50 rounded transition-colors bg-amber-500 text-white hover:bg-amber-600 outline-none w-full shadow-sm"
                          >
                            Unlimited ♾️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] opacity-60 font-mono">Real-time memory tracking disabled. Refresh manually.</span>
              <button 
                onClick={async () => {
                  setAdminData(null);
                  fetch('/api/admin/system_state', {
                    headers: { 'x-admin-email': currentUser?.email || "" }
                  }).then(res => res.json()).then(data => {
                    setAdminData(data.data.rooms);
                  });
                  try {
                    const querySnapshot = await getDocs(collection(db, "users"));
                    const usersList: any[] = [];
                    querySnapshot.forEach((doc) => {
                      usersList.push({ id: doc.id, ...doc.data() });
                    });
                    setAdminUsers(usersList);
                  } catch (error) {
                    console.error("Error fetching users:", error);
                  }
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
