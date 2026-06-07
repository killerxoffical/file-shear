import { 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileArchive, 
  FileCode, 
  FileUp,
  FileIcon
} from "lucide-react";

/**
 * Formats bytes to human readable sizes
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Returns matching React component from lucide icons based on mime type or file extension
 */
export function getFileIcon(fileName: string, mimeType?: string) {
  const name = fileName.toLowerCase();
  const mime = mimeType?.toLowerCase() || "";

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) {
    return FileImage;
  }
  if (mime.startsWith("video/") || /\.(mp4|mkv|avi|mov|webm|flv|wmv)$/i.test(name)) {
    return FileVideo;
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i.test(name)) {
    return FileAudio;
  }
  if (
    mime.includes("zip") || 
    mime.includes("tar") || 
    mime.includes("rar") || 
    mime.includes("gzip") ||
    /\.(zip|rar|tar|gz|7z|bz2|xz)$/i.test(name)
  ) {
    return FileArchive;
  }
  if (
    mime.includes("javascript") || 
    mime.includes("typescript") || 
    mime.includes("html") || 
    mime.includes("css") || 
    mime.includes("json") ||
    /\.(js|jsx|ts|tsx|html|css|json|py|cpp|c|sh|java|go|rs)$/i.test(name)
  ) {
    return FileCode;
  }
  if (
    mime.includes("pdf") || 
    mime.includes("document") || 
    mime.includes("msword") || 
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|pages)$/i.test(name)
  ) {
    return FileText;
  }
  
  return FileIcon;
}

/**
 * Formats time remaining based on expiry timestamp
 */
export function formatTimeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
