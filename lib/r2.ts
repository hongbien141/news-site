import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function uploadVideoToR2(file: File) {
  const { ext, safeBase } = sanitizeFileName(file.name);
  const key = `post-videos/${Date.now()}-${safeBase}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type || "video/mp4",
    })
  );

  return `${publicBaseUrl}/${key}`;
}