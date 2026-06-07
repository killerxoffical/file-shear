export interface FileMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  expiresAt: number;
  downloadCount: number;
  autoDelete: boolean;
  maxDownloads?: number;
  hasPasscode?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  type: "text" | "voice" | "image";
  content: string; // text, or base64 audio/image
  createdAt: number;
}

export interface RoomState {
  code: string;
  createdAt: number;
  files: Record<string, FileMeta>;
  hasPasscode?: boolean;
  devices?: { id: string; name: string; lastSeen: number }[];
  messages?: ChatMessage[];
  totalSizeUsed?: number;
  storageLimitBytes?: number;
}
