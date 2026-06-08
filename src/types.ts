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
  type: "text" | "voice" | "image" | "file_request";
  content: string; // text, or base64 audio/image
  transcription?: string; // voice transcription
  createdAt: number;
}

export interface RoomState {
  code: string;
  createdAt: number;
  expiresAt?: number;
  files: Record<string, FileMeta>;
  hasPasscode?: boolean;
  devices?: { id: string; name: string; lastSeen: number }[];
  messages?: ChatMessage[];
  totalSizeUsed?: number;
  storageLimitBytes?: number;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  roomType?: "share" | "coding";
}
