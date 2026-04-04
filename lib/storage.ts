import { promises as fs } from "fs";
import path from "path";

import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

function getLocalUploadDir() {
  return process.env.UPLOAD_DIR || "public/uploads";
}

function getLocalPublicUrl(key: string) {
  return `/uploads/${key}`;
}

function normalizeUploadKey(key: string) {
  return key.replace(/^\/+/, "").replace(/^uploads\//, "");
}

function getStorageMode() {
  return process.env.STORAGE_PROVIDER === "s3" ? "s3" : "local";
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage env değişkenleri eksik.");
  }

  return {
    bucket,
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    accessKeyId,
    secretAccessKey
  };
}

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  const config = getS3Config();
  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  return s3Client;
}

async function uploadToLocal({ key, body }: UploadInput) {
  const uploadDir = getLocalUploadDir();
  const full = path.resolve(uploadDir);
  await fs.mkdir(full, { recursive: true });
  await fs.writeFile(path.join(full, key), Buffer.from(body));
  return { url: getLocalPublicUrl(key), provider: "local" as const };
}

async function uploadToS3({ key, body, contentType }: UploadInput) {
  const config = getS3Config();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: Buffer.from(body),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return { url: getLocalPublicUrl(key), provider: "s3" as const };
}

export async function uploadObject(input: UploadInput) {
  if (getStorageMode() === "s3") {
    return uploadToS3(input);
  }
  return uploadToLocal(input);
}

export function getStoragePublicHost() {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const endpoint = process.env.S3_ENDPOINT;
  const candidate = publicBaseUrl || endpoint;
  if (!candidate) return null;
  try {
    return new URL(candidate).hostname;
  } catch {
    return null;
  }
}

export function resolveStoredMediaUrl(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("uploads/")) return `/${url}`;

  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname || "/").replace(/^\/+/, "");

    if (parsed.hostname.endsWith(".r2.dev")) {
      return pathname ? getLocalPublicUrl(normalizeUploadKey(pathname)) : "";
    }

    if (parsed.hostname.includes("r2.cloudflarestorage.com")) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length >= 2) {
        return getLocalPublicUrl(normalizeUploadKey(segments.slice(1).join("/")));
      }
      if (segments.length === 1) {
        return getLocalPublicUrl(normalizeUploadKey(segments[0]));
      }
    }
  } catch {
    return url;
  }

  return url;
}

function getLocalFilePath(key: string) {
  return path.resolve(getLocalUploadDir(), normalizeUploadKey(key));
}

function getContentTypeFromKey(key: string) {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".zip":
      return "application/zip";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".aac":
      return "audio/aac";
    case ".m4a":
      return "audio/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

export async function readStoredObject(key: string) {
  const normalizedKey = normalizeUploadKey(key);
  const localPath = getLocalFilePath(normalizedKey);

  try {
    const body = await fs.readFile(localPath);
    return {
      body,
      contentType: getContentTypeFromKey(normalizedKey),
      cacheControl: "public, max-age=31536000, immutable"
    };
  } catch {}

  if (getStorageMode() !== "s3") {
    return null;
  }

  const config = getS3Config();
  const client = getS3Client();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: normalizedKey
    })
  );

  const body = object.Body;
  if (!body) return null;

  return {
    body: typeof body.transformToWebStream === "function" ? body.transformToWebStream() : body,
    contentType: object.ContentType || getContentTypeFromKey(normalizedKey),
    cacheControl: object.CacheControl || "public, max-age=31536000, immutable"
  };
}

export async function checkStorageHealth() {
  if (getStorageMode() === "s3") {
    const config = getS3Config();
    const client = getS3Client();
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    );
    return { provider: "s3" as const, bucket: config.bucket };
  }

  const uploadDir = path.resolve(getLocalUploadDir());
  await fs.mkdir(uploadDir, { recursive: true });
  return { provider: "local" as const, bucket: uploadDir };
}
