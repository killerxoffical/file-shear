import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import * as admin from "firebase-admin";

// Initialize Firebase Admin with Application Default Credentials
admin.initializeApp();

const app = express();
// Render automatically provides process.env.RENDER. For AI Studio we must strictly use 3000.
const PORT = process.env.RENDER ? (process.env.PORT || 3000) : 3000;

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Memory Database structure
interface FileMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  expiresAt: number;
  downloadCount: number;
  autoDelete: boolean; // Toggle to delete instantly after a download
  maxDownloads?: number;
  passcode?: string;
  filePath: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  type: "text" | "voice" | "image" | "file_request";
  content: string; // Base64 audio/image or text
  transcription?: string; // Additional transcription
  createdAt: number;
}

interface Room {
  code: string;
  createdAt: number;
  expiresAt: number;
  files: Record<string, FileMeta>;
  passcode?: string;
  devices?: Record<string, { id: string; name: string; lastSeen: number }>;
  messages?: ChatMessage[];
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  roomType?: "share" | "coding";
}

const rooms: Record<string, Room> = {};

// Clean up expired files and rooms (e.g. files older than 1 hour)
const EXPIRY_TIME_MS = 60 * 60 * 1000; // 1 Hour
const ROOM_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB Storage limit per Room

setInterval(() => {
  const now = Date.now();
  console.log("[Cleanup] Running periodic cleanup...");
  
  Object.keys(rooms).forEach((roomCode) => {
    const room = rooms[roomCode];

    // If room has expired, delete room and all its files instantly!
    if (now > room.expiresAt) {
      console.log(`[Cleanup] Room expired: ${roomCode}. Purging all remaining files.`);
      Object.keys(room.files).forEach((fileId) => {
        const file = room.files[fileId];
        try {
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
          }
        } catch (err) {}
      });
      delete rooms[roomCode];
      return;
    }

    Object.keys(room.files).forEach((fileId) => {
      const file = room.files[fileId];
      if (now > file.expiresAt) {
        console.log(`[Cleanup] File expired: ${file.name} in room ${roomCode}`);
        try {
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
          }
        } catch (err) {
          console.error(`[Cleanup] Error deleting file physical disk:`, err);
        }
        delete room.files[fileId];
      }
    });
  });
}, 15 * 1000); // Check every 15 seconds for precise 1 hour room lifecycle


// Setup Multer for secure and dynamic storing of files up to 1GB limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Unique file name to prevent collision
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB file size limit
  },
});

app.use(express.json());

// API: Generate a new 4-digit unique room
app.get("/api/room/new", (req, res) => {
  const passcode = req.query.passcode as string;
  const roomType = (req.query.roomType as "share" | "coding") || "share";
  let code = "";
  let attempts = 0;
  
  // Find a unique 4-digit numeric code
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
  } while (rooms[code] && attempts < 100);

  rooms[code] = {
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + EXPIRY_TIME_MS,
    files: {},
    passcode: passcode || undefined,
    devices: {},
    roomType,
  };

  res.json({ code, success: true });
});

app.post("/api/room/new", (req, res) => {
  const { passcode, ownerId, ownerEmail, ownerName, roomType } = req.body || {};
  let code = "";
  let attempts = 0;
  
  // Find a unique 4-digit numeric code
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
  } while (rooms[code] && attempts < 100);

  rooms[code] = {
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + EXPIRY_TIME_MS,
    files: {},
    passcode: passcode || undefined,
    devices: {},
    ownerId,
    ownerEmail,
    ownerName,
    roomType: roomType || "share",
  };

  res.json({ code, success: true });
});

app.post("/api/room/extend/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: "Room not found." });

  // Extend by 1 hour
  room.expiresAt += EXPIRY_TIME_MS;
  res.json({ success: true, expiresAt: room.expiresAt });
});

// API: Verify if room exists and get its files
app.get("/api/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: "Room not found or expired. Create a new one!" });
  }

  // Passcode verification
  const clientPasscode = req.headers["x-room-passcode"] || req.query.passcode;
  if (room.passcode && room.passcode !== clientPasscode) {
    return res.status(401).json({ 
      error: "Passcode required or incorrect to enter this secure bridge.", 
      type: "passcode_required" 
    });
  }

  // Active Device presence registration (Real-time tracking of active secondary/main nodes)
  const deviceId = req.query.deviceId as string;
  const deviceName = req.query.deviceName as string;
  if (deviceId) {
    if (!room.devices) {
      room.devices = {};
    }
    room.devices[deviceId] = {
      id: deviceId,
      name: deviceName || "Unknown Node",
      lastSeen: Date.now(),
    };
  }

  // Filter out devices not polled in the last 7.5 seconds
  const now = Date.now();
  const activeDevices: any[] = [];
  if (room.devices) {
    Object.keys(room.devices).forEach((id) => {
      if (now - room.devices[id].lastSeen < 7500) {
        activeDevices.push({
          id: room.devices[id].id,
          name: room.devices[id].name,
          lastSeen: room.devices[id].lastSeen,
        });
      } else {
        delete room.devices[id];
      }
    });
  }

  // Filter out expired files in-place
  const activeFiles: Record<string, any> = {};

  Object.keys(room.files).forEach((fileId) => {
    const file = room.files[fileId];
    if (now <= file.expiresAt) {
      activeFiles[fileId] = {
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt,
        downloadCount: file.downloadCount,
        autoDelete: file.autoDelete,
        maxDownloads: file.maxDownloads || 0,
        hasPasscode: !!file.passcode,
      };
    } else {
      // Clean up physically
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
      } catch (err) {}
      delete room.files[fileId];
    }
  });

  const totalSizeUsed = Object.values(activeFiles).reduce((acc: number, f: any) => acc + f.size, 0);

  res.json({
    code: room.code,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    files: activeFiles,
    devices: activeDevices,
    hasPasscode: !!room.passcode,
    messages: room.messages || [],
    totalSizeUsed,
    storageLimitBytes: ROOM_STORAGE_LIMIT_BYTES,
    ownerId: room.ownerId,
    ownerEmail: room.ownerEmail,
    ownerName: room.ownerName,
    roomType: room.roomType || "share",
  });
});

// API: Upload file to specific room
app.post("/api/upload/:roomId", upload.single("file"), (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    // If files are sent to a non-existing room, delete the uploaded file immediately
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    return res.status(404).json({ error: "Active Room has expired or does not exist." });
  }

  // Passcode verification
  const clientPasscode = req.headers["x-room-passcode"] || req.query.passcode;
  if (room.passcode && room.passcode !== clientPasscode) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    return res.status(401).json({ error: "Incorrect passcode." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }

  // Verify total active storage capacity used in this room (100MB limit)
  const currentTotalSize = Object.values(room.files).reduce((acc, f) => acc + f.size, 0);
  if (currentTotalSize + req.file.size > ROOM_STORAGE_LIMIT_BYTES) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {}
    return res.status(400).json({
      error: "Room 100MB storage limit reached! Please delete some old files from this room to make space."
    });
  }

  // Read upload configuration fields or fallback to defaults
  const autoDelete = req.body.autoDelete === "true";
  const maxDownloadsInput = parseInt(req.body.maxDownloads, 10);
  const maxDownloads = isNaN(maxDownloadsInput) ? (autoDelete ? 1 : 0) : maxDownloadsInput;

  const expiresInMinutesInput = parseInt(req.body.expiresInMinutes, 10);
  const expiresInMs = isNaN(expiresInMinutesInput) ? EXPIRY_TIME_MS : expiresInMinutesInput * 60 * 1000;

  const filePasscode = req.body.filePasscode || "";

  const fileId = Math.random().toString(36).substring(2, 11);
  const fileMeta: FileMeta = {
    id: fileId,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
    downloadCount: 0,
    autoDelete: maxDownloads === 1,
    maxDownloads,
    passcode: filePasscode ? String(filePasscode) : undefined,
    filePath: req.file.path,
  };

  room.files[fileId] = fileMeta;

  res.json({
    success: true,
    file: {
      id: fileId,
      name: fileMeta.name,
      size: fileMeta.size,
      mimeType: fileMeta.mimeType,
      uploadedAt: fileMeta.uploadedAt,
      expiresAt: fileMeta.expiresAt,
      autoDelete: fileMeta.autoDelete,
      maxDownloads: fileMeta.maxDownloads,
      hasPasscode: !!fileMeta.passcode,
    },
  });
});

// API: Post Chat message in a specific room
app.post("/api/chat/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: "Room not found or expired." });
  }

  // Passcode verification
  const clientPasscode = req.headers["x-room-passcode"] || req.query.passcode;
  if (room.passcode && room.passcode !== clientPasscode) {
    return res.status(401).json({ error: "Incorrect room passcode." });
  }

  const { senderId, senderName, type, content, transcription } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Message content cannot be empty." });
  }

  if (!room.messages) {
    room.messages = [];
  }

  const newMessage: ChatMessage = {
    id: Math.random().toString(36).substring(2, 11),
    senderId: senderId || "anonymous",
    senderName: senderName || "Anonymous Node",
    type: type || "text",
    content,
    transcription,
    createdAt: Date.now(),
  };

  room.messages.push(newMessage);

  // Keep last 150 messages in memory to stay secure and light
  if (room.messages.length > 150) {
    room.messages.shift();
  }

  res.json({ success: true, message: newMessage });
});

// API: Download file
app.get("/api/download/:roomId/:fileId", (req, res) => {
  const { roomId, fileId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).send("Error: The room could not be found.");
  }

  // Passcode verification
  const clientPasscode = req.headers["x-room-passcode"] || req.query.passcode;
  if (room.passcode && room.passcode !== clientPasscode) {
    return res.status(401).send("Error: Correct passcode required to download files.");
  }

  const file = room.files[fileId];
  if (!file) {
    return res.status(404).send("Error: File not found or has been deleted.");
  }

  // File specific passcode/password verification! Use query parameter or headers
  const filePasscode = req.headers["x-file-passcode"] || req.query.filePasscode;
  if (file.passcode && file.passcode !== filePasscode) {
    return res.status(401).send("Error: Correct file passcode required to access this file.");
  }

  if (file.maxDownloads !== undefined && file.maxDownloads > 0) {
    if (file.downloadCount >= file.maxDownloads) {
      return res.status(410).send("Error: Download limit has been reached for this file.");
    }
  }

  if (!fs.existsSync(file.filePath)) {
    // If the record exists but the file is physically gone, clean up metadata
    delete room.files[fileId];
    return res.status(404).send("Error: Physical file was not found on server storage.");
  }

  const isPreview = req.query.preview === "true";

  if (!isPreview) {
    // Increment download count only for real downloads
    file.downloadCount++;
  }

  // Set response headers to force download and set correct name
  if (isPreview) {
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
  }
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Length", file.size);

  const fileStream = fs.createReadStream(file.filePath);
  fileStream.pipe(res);

  // Determine if we should delete the file after downloading (auto-delete OR maxDownloads limit reached)
  const isLimitReached = file.maxDownloads !== undefined && file.maxDownloads > 0 && file.downloadCount >= file.maxDownloads;
  const shouldDeleteAfterFinished = (file.autoDelete && !isPreview) || (isLimitReached && !isPreview);

  if (shouldDeleteAfterFinished) {
    fileStream.on("end", () => {
      console.log(`[AutoDelete] Limit reached for file ${file.name} (${file.downloadCount}/${file.maxDownloads || 1} downloads). Removing physically.`);
      setTimeout(() => {
        try {
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
          }
        } catch (err) {
          console.error(`[AutoDelete] Error deleting file physically:`, err);
        }
        delete room.files[fileId];
      }, 2000); // Grace period of 2 seconds for completing pipes/sockets
    });
  }
});

// API: Manually delete file immediately
app.delete("/api/delete/:roomId/:fileId", (req, res) => {
  const { roomId, fileId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: "Room not found." });
  }

  // Passcode verification
  const clientPasscode = req.headers["x-room-passcode"] || req.query.passcode;
  if (room.passcode && room.passcode !== clientPasscode) {
    return res.status(401).json({ error: "Correct passcode required." });
  }

  const file = room.files[fileId];
  if (!file) {
    return res.status(404).json({ error: "File not found or already deleted." });
  }

  try {
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }
  } catch (err) {
    console.error("Error physically deleting file during manual purge:", err);
  }

  delete room.files[fileId];
  res.json({ success: true, message: "File was successfully deleted instantly." });
});

// API: Admin endpoint to get system state
app.get("/api/admin/system_state", async (req, res) => {
  const adminEmail = req.headers["x-admin-email"];
  if (adminEmail !== "smbadsha544@gmail.com") {
    return res.status(403).json({ error: "Forbidden. Not an admin." });
  }

  try {
    res.json({
      success: true,
      data: {
        rooms, // memory db
      }
    });
  } catch (error) {
    console.error("Admin error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

// Start server and proxy static Vite assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dev Mode uses the live Vite server as a middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode serves build files directly
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[Instant File Share] Server successfully running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
