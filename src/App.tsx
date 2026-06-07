import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
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
  FileCheck, 
  Smartphone, 
  Monitor, 
  Languages, 
  RefreshCw,
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
  Clock
} from "lucide-react";
import { FileMeta, RoomState } from "./types";
import { formatBytes, getFileIcon, formatTimeRemaining } from "./utils";

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

  // App navigation state
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomState | null>(null);
  
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
  const [stagedFile, setStagedFile] = useState<File | null>(null);
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
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
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
  
  // UI states
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showAppQrModal, setShowAppQrModal] = useState<boolean>(false);
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
  
  // Timer ticking for countdown remaining
  const [tick, setTick] = useState<number>(0);

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

  // Live Chat Delivery integration endpoint Caller
  const sendChatMessage = async (type: "text" | "voice" | "image" = "text", customContent?: string) => {
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
          sendChatMessage("voice", base64Audio);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
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
      return;
    }

    let html5QrCode: Html5Qrcode | null = null;
    let isStopped = false;

    // Use a small timeout to let the modal mount first
    const timer = setTimeout(() => {
      if (isStopped) return;
      try {
        html5QrCode = new Html5Qrcode("qr-scanner-viewport");
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
                  ? "সধীক শেয়ার রুম কোড সনাক্ত করা যায়নি।" 
                  : "Could not find a valid 4-digit room code in the scanned QR."
              );
            }
          },
          () => {}
        ).catch((err) => {
          console.error("Camera start failed:", err);
          setScannerError(
            language === "bn" 
              ? "ক্যামেরা চালু করা যায়নি বা পারমিশন দেয়া হয়নি।" 
              : "Camera access was denied or not found. Please verify permissions."
          );
        });
      } catch (err) {
        console.error("Failed to initialize Html5Qrcode:", err);
      }
    }, 150);

    return () => {
      isStopped = true;
      clearTimeout(timer);
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
      
      if (passcodeToSend) {
        setCurrentPasscode(passcodeToSend);
        localStorage.setItem(`room_pass_${code}`, passcodeToSend);
      }
      
      return true;
    } catch (err: any) {
      console.error(err);
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
    try {
      const passcodeParam = usePasscode ? createPasscode.trim() : "";
      const response = await fetch("/api/room/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: passcodeParam }),
      });
      const data = await response.json();
      if (data.success && data.code) {
        if (usePasscode && passcodeParam) {
          setCurrentPasscode(passcodeParam);
          localStorage.setItem(`room_pass_${data.code}`, passcodeParam);
        } else {
          setCurrentPasscode("");
        }
        setCurrentRoomCode(data.code);
        setRoomError(null);
        setCreatePasscode("");
        setUsePasscode(false);
        showStatus("New share room created successfully!", "success");
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

  const handleDownloadAll = async () => {
    if (!currentRoomCode || !roomData?.files) return;
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
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

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

    const hasAnyAutoDelete = nonPasscodeFiles.some((f) => f.autoDelete || (f.maxDownloads && f.downloadCount + 1 >= f.maxDownloads));
    if (hasAnyAutoDelete) {
      setTimeout(() => {
        fetchRoomInfo(currentRoomCode);
      }, 3500);
    }
  };

  // Select helper to preview & open download parameters configurator before uploading
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || !currentRoomCode) return;
    const file = files[0];

    // Check local limit (10GB = 10,737,418,240 bytes)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showStatus(
        language === "bn" 
          ? "ফাইলটি অনেক বড়! সর্বোচ্চ সাইজ ১০জিবি (10GB) অনুমোদিত।" 
          : "File limit exceeded. Max supported file size is 10GB.", 
        "error"
      );
      return;
    }

    // Verify room storage (100MB Limit)
    const ROOM_MAX_SIZE = 100 * 1024 * 1024;
    if (totalBytesUsed + file.size > ROOM_MAX_SIZE) {
      showStatus(
        language === "bn"
          ? "রুমের স্টোরেজ ফুল! সর্বোচ্চ ১০০ মেগাবাইট (100MB) লিমিট রয়েছে। অনুগ্রহ করে পুরাতন ফাইল ডিলিট করুন।"
          : "Declined! This file fits over the remaining room quota (100MB capacity limit). Delete some files first.",
        "error"
      );
      return;
    }

    setStagedFile(file);
    // Initialize defaults
    setStagedMaxDownloads(1); // 1-time download by default
    setStagedExpiresIn(60);   // 1 hour expiry duration by default
    setStagedPasscode("");

    // Generate local preview URL
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
  };

  const cancelStagedUpload = () => {
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setStagedTextContent(null);
    setStagedPasscode("");
  };

  const confirmAndUploadFile = () => {
    if (!stagedFile || !currentRoomCode) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(stagedFile.name);

    const formData = new FormData();
    formData.append("file", stagedFile);
    formData.append("autoDelete", String(stagedMaxDownloads === 1));
    formData.append("maxDownloads", String(stagedMaxDownloads));
    formData.append("expiresInMinutes", String(stagedExpiresIn));
    if (stagedPasscode.trim()) {
      formData.append("filePasscode", stagedPasscode.trim());
    }

    const originalFileName = stagedFile.name;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload/${currentRoomCode}`);
    if (currentPasscode) {
      xhr.setRequestHeader("x-room-passcode", currentPasscode);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentage);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setStagedFile(null);
      if (stagedPreviewUrl) {
        URL.revokeObjectURL(stagedPreviewUrl);
        setStagedPreviewUrl(null);
      }
      setStagedTextContent(null);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            showStatus(
              language === "bn" 
                ? `ফাইল "${originalFileName}" সফলভাবে আপলোড হয়েছে!` 
                : `Uploaded "${originalFileName}" successfully!`, 
              "success"
            );
            fetchRoomInfo(currentRoomCode);
          }
        } catch (e) {
          showStatus(language === "bn" ? "রিসপন্স প্রসেস করতে ব্যর্থ" : "Error processing upload response", "error");
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          showStatus(res.error || "Upload failed.", "error");
        } catch (e) {
          showStatus("Upload failed.", "error");
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setStagedFile(null);
      showStatus(language === "bn" ? "নেটওয়ার্ক ত্রুটির কারণে আপলোড করা যায়নি।" : "Network error during upload.", "error");
    };

    xhr.send(formData);
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
      title: "Instant File Share",
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
    title: { en: "Instant File Share", bn: "ইনস্ট্যান্ট ফাইল শেয়ার" },
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

      {/* Modern Sidebar (Visible on desktop when room exists) */}
      {currentRoomCode && (
        <aside className="w-72 bg-slate-900 text-white flex flex-col shrink-0 hidden lg:flex border-r border-slate-950">
          <div className="p-6 flex flex-col h-full justify-between">
            <div>
              {/* App logo brand wrapper */}
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl italic text-white shadow-lg shadow-blue-500/20">
                  IF
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight block text-slate-50">Instant Share</span>
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
                <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch gap-6 transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg shadow-black/35" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
                  <div className="flex flex-col gap-3.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${theme === "dark" ? "bg-blue-950 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                      <Plus className="h-5.5 w-5.5 stroke-[2.5]" />
                    </div>
                    <h3 className={`text-lg font-extrabold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                      {language === "bn" ? "নতুন কানেক্ট কোড বানান" : "Start New Sharing Stream"}
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed font-medium transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {language === "bn" 
                        ? "একটি সম্পূর্ণ সিকিউর এবং ৪ সংখ্যার কোড বিশিষ্ট রুম খুলে সাথে সাথেই যেকোনো ফাইল ড্রপ বা আপলোড করুন।" 
                        : "Open a temporary sharing workspace instantly with a 4-digit code. Easily access with mobile camera QR."}
                    </p>
                  </div>

                  {/* Passcode toggler and configuration input */}
                  <div className={`p-4 rounded-xl border transition-all ${theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-150"}`}>
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
                        Protect Room with Passcode
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
                          <span className={`text-[11px] font-semibold block ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
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
                      <input
                        type="text"
                        maxLength={4}
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                        placeholder={text.codePlaceholder[language]}
                        className={`flex-1 px-4 py-3 border rounded-xl font-mono text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold transition-all ${
                          theme === "dark" 
                            ? "bg-slate-850 border-slate-700 text-white placeholder-slate-550" 
                            : "bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400"
                        }`}
                        id="room-code-input"
                      />
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
                  </div>

                  <div>
                    <h3 className={`text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wide text-left ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      <span>{language === "bn" ? "কানেক্টেড লাইভ বোর্ড" : "Connected Share Board"}</span>
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

                  {/* High Resolution Storage Quota Progress Card */}
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
                          <HardDrive className={`h-5 w-5 ${totalBytesUsed > 80 * 1024 * 1024 ? "text-rose-500 animate-bounce" : "text-blue-500"}`} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                            {language === "bn" ? "রুম মেমোরি স্টোরেজ" : "Active Session Storage"}
                          </span>
                          <span className="text-sm font-black tracking-tight mt-0.5">
                            {language === "bn" ? "১০০ মেগাবাইট সর্বোচ্চ সীমা" : "100 MB Maximum Capacity"}
                          </span>
                        </div>
                      </div>

                      {/* Percent Pill indicator */}
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                        totalBytesUsed >= 90 * 1024 * 1024 
                          ? "bg-rose-950/40 text-rose-450 border-rose-800/50 animate-pulse" 
                          : theme === "dark"
                          ? "bg-blue-950/40 text-blue-400 border-blue-900/40"
                          : "bg-blue-50 text-blue-700 border-blue-105"
                      }`}>
                        {Math.min(100, Math.round((totalBytesUsed / (100 * 1024 * 1024)) * 100))}%
                      </span>
                    </div>

                    {/* Progress slider bar gauge */}
                    <div className={`w-full h-2 rounded-full overflow-hidden transition-all duration-300 ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          totalBytesUsed >= 90 * 1024 * 1024
                            ? "bg-gradient-to-r from-rose-500 to-red-650"
                            : totalBytesUsed >= 60 * 1024 * 1024
                            ? "bg-gradient-to-r from-amber-500 to-amber-600"
                            : "bg-gradient-to-r from-blue-500 to-blue-600"
                        }`}
                        style={{ width: `${Math.max(1, Math.min(100, (totalBytesUsed / (100 * 1024 * 1024)) * 100))}%` }}
                      />
                    </div>

                    {/* Meta info sizes */}
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-550 pt-0.5">
                      <span>{language === "bn" ? "ব্যবহার হয়েছে" : "Allocated"}: <strong className={`${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{formatBytes(totalBytesUsed)}</strong></span>
                      <span>{language === "bn" ? "বাকি আছে" : "Remaining Space"}: <strong className={`${totalBytesUsed >= 90 * 1024 * 1024 ? "text-rose-500" : (theme === "dark" ? "text-slate-200" : "text-slate-800")}`}>{formatBytes(Math.max(0, (100 * 1024 * 1024) - totalBytesUsed))}</strong></span>
                    </div>
                  </div>

                  {/* Warning visual alert pop if room capacity almost loaded or exceeds */}
                  {totalBytesUsed >= 85 * 1024 * 1024 && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 text-left animate-fade-in ${
                      theme === "dark" 
                        ? "bg-rose-950/40 border-rose-900/40 text-rose-300" 
                        : "bg-rose-50 border-rose-150 text-rose-800"
                    }`} id="storage-limit-warning-block">
                      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">
                          {language === "bn" ? "স্টোরেজ প্রায় সম্পূর্ণ!" : "Storage Space Warning!"}
                        </span>
                        <span className="text-[11px] leading-relaxed mt-1 opacity-85 font-medium">
                          {language === "bn" 
                            ? "আপনার রুমের সর্বোচ্চ ১০০ মেগাবাইট সাইজ লিমিটের প্রায় সবটুকুই ব্যবহৃত হয়েছে। নতুন ফাইল পোস্ট বা আপলোড করতে হলে ডিলিট আইকনে ট্যাপ করে পুরাতন ডাটা রিমুভ করুন।" 
                            : "Your 100MB temporary room segment memory is heavily filled. You must clear/delete older elements using the trash can before pushing newly staged files."}
                        </span>
                      </div>
                    </div>
                  )}
                  
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
                                id={`file-item-${file.id}`}
                              >
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
                                        ? "bg-slate-800 border-slate-705 text-blue-400" 
                                        : "bg-blue-50 border-blue-100 text-blue-600"
                                    }`}>
                                      {fileExt.substring(0, 3) || "RAW"}
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1 flex flex-col font-sans">
                                    <span 
                                      className={`font-bold truncate text-sm transition-colors cursor-pointer ${theme === "dark" ? "text-slate-100 hover:text-blue-400" : "text-slate-900 hover:text-blue-600"}`} 
                                      title={file.name}
                                    >
                                      {file.name}
                                    </span>
                                    
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-slate-450 font-medium">
                                      <span className={`font-bold font-mono px-1 py-0.2 rounded text-slate-500 border ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
                                        {formatBytes(file.size)}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {language === "bn" ? "আপলোড" : "Uploaded"}: {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>

                                      {file.hasPasscode && (
                                        <>
                                          <span>•</span>
                                          <span className="text-amber-600 font-bold bg-amber-500/10 dark:bg-amber-950/20 px-1.5 py-0.5 rounded text-[8px] uppercase border border-amber-200/40 flex items-center gap-0.5">
                                            <Lock className="h-2 w-2 text-amber-500 stroke-[3]" />
                                            <span>{language === "bn" ? "লক" : "Locked"}</span>
                                          </span>
                                        </>
                                      )}

                                      {file.maxDownloads && file.maxDownloads > 1 ? (
                                        <>
                                          <span>•</span>
                                          <span className="text-blue-600 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase border border-blue-200/40">
                                            {language === "bn" ? `সীমা: ${file.downloadCount}/${file.maxDownloads}` : `Limit: ${file.downloadCount}/${file.maxDownloads}`}
                                          </span>
                                        </>
                                      ) : file.autoDelete ? (
                                        <>
                                          <span>•</span>
                                          <span className="text-red-500 font-bold bg-red-500/10 px-1 py-0.2 rounded text-[9px] uppercase border border-red-200/40">
                                            {language === "bn" ? "১ বার ডাউনলোড" : "1-Time"}
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {/* Operations widget downloads */}
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  
                                  {/* Countdown Expiry block label */}
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span className="text-slate-400">{text.expiryLabelShort[language]}</span>
                                    <span className={`font-mono font-bold ${file.expiresAt - Date.now() < 5 * 60000 ? "text-rose-500 animate-pulse bg-rose-50 px-1.5 py-0.5 rounded" : "text-blue-600"}`}>
                                      {formatTimeRemaining(file.expiresAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    
                                    {/* Download file trigger link */}
                                    <button
                                      onClick={() => handleDownloadAction(file)}
                                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-[11px] transition-all shadow-sm shrink-0 cursor-pointer rounded-lg uppercase tracking-wide border border-blue-500"
                                      title="Download asset File"
                                      id={`download-btn-${file.id}`}
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>{text.downloadBtn[language]}</span>
                                    </button>

                                    {/* Copy Downloadable shared Link */}
                                    <button
                                      onClick={() => copyFileLink(file.id, file.hasPasscode)}
                                      className={`p-1.5 rounded-lg transition-all cursor-pointer border ${theme === "dark" ? "text-slate-400 hover:text-blue-400 hover:bg-slate-900 border-slate-800" : "text-slate-500 hover:text-blue-600 hover:bg-slate-100 border-slate-200"}`}
                                      title="Copy raw download link tool"
                                      id={`copy-file-btn-${file.id}`}
                                    >
                                      {copiedFileId === file.id ? <Check className="h-3.5 w-3.5 text-emerald-600 font-extrabold" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>

                                    {/* Immediate purge action */}
                                    <button
                                      onClick={() => deleteFile(file.id, file.name)}
                                      className={`p-1.5 rounded-lg transition-all cursor-pointer border ${theme === "dark" ? "text-slate-400 hover:text-red-500 hover:bg-red-500/10 border-slate-800" : "text-slate-500 hover:text-red-500 hover:bg-red-50 border-slate-205"}`}
                                      title="Delete immediately right now"
                                      id={`delete-btn-${file.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
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
                      
                      {/* 1H Room limit marker count */}
                      <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 border dark:border-slate-800 rounded-lg">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span>1H LIMIT</span>
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
                              className={`flex flex-col max-w-[85%] text-left ${isMe ? "self-end items-end" : "self-start items-start"}`}
                            >
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
                                  </div>
                                )}
                              </div>

                              {/* Formatted absolute date stamp */}
                              <span className="text-[8px] text-slate-450 mt-0.5 px-1 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Recording Wave Indicator bar overlays */}
                    {isRecording && (
                      <div className="absolute inset-x-0 bottom-[64px] bg-red-600 px-4 py-3 border-t border-red-500/30 flex items-center justify-between text-white animate-fade-in z-10 shadow-lg">
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

      {/* Camera QR scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="qr-scanner-modal-overlay">
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
          
          <div className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto relative shadow-2xl flex flex-col items-center text-center gap-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border border-slate-800 shadow-black/80" : "bg-white border border-slate-100"}`}>
            
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
          </div>
        </div>
      )}

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
      {stagedFile && (
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
                  {stagedFile.size > 800 && " ... [truncated preview]"}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs border ${theme === "dark" ? "bg-slate-900 border-slate-800 text-blue-400" : "bg-white border-slate-200 text-blue-600"}`}>
                    {(stagedFile.name.split('.').pop() || "RAW").toUpperCase()}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-xs text-slate-400 font-mono">
                      {language === "bn" ? "কোন প্রিভিউ উপলভ্য নেই" : "No live preview available"}
                    </span>
                    <span className="text-[10px] italic text-slate-500 mt-0.5">
                      {language === "bn" ? "আকার ও এক্সটেনশন যাচাই করুন" : "Verify metadata format specifications"}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Filename & Information details */}
              <div className="w-full mt-3 pt-3 border-t border-dashed border-slate-800/10 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-1">
                <span className="text-xs font-bold truncate max-w-[280px]" title={stagedFile.name}>
                  {stagedFile.name}
                </span>
                <span className="text-[10px] font-bold font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 border border-blue-800/50 rounded-md">
                  {formatBytes(stagedFile.size)}
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

    </div>
  );
}
