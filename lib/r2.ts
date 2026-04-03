import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.CF_ACCOUNT_ID!;
const accessKeyId = process.env.CF_ACCESS_KEY_ID!;
const secretAccessKey = process.env.CF_SECRET_ACCESS_KEY!;
const bucketName = process.env.CF_BUCKET_NAME!;
const publicBaseUrl = process.env.CF_PUBLIC_BASE_URL!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function sanitizeFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "mp4";
  const baseName = name.replace(/\.[^/.]+$/, "");
  const safeBase = baseName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    ext,
    safeBase: safeBase || "video",
  };
}

export function buildR2VideoKey(fileName: string) {
  const { ext, safeBase } = sanitizeFileName(fileName);
  return `post-videos/${Date.now()}-${safeBase}.${ext}`;
}

export function buildR2PublicUrl(key: string) {
  return `${publicBaseUrl}/${key}`;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    ContentType: params.contentType || "video/mp4",
  });

  const uploadUrl = await getSignedUrl(r2, command, {
    expiresIn: 60 * 5,
  });

  return uploadUrl;
}

// Không bắt buộc dùng ngay, nhưng để sẵn nếu sau này cần presigned GET
export async function createPresignedReadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(r2, command, {
    expiresIn: 60 * 5,
  });
}