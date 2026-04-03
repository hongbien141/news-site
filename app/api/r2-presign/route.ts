import { NextResponse } from "next/server";
import { buildR2PublicUrl, buildR2VideoKey, createPresignedUploadUrl } from "@/lib/r2";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const contentType = typeof body?.contentType === "string" ? body.contentType : "";

    if (!fileName) {
      return NextResponse.json({ error: "Thiếu tên file" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ mp4, webm, ogg" },
        { status: 400 }
      );
    }

    const key = buildR2VideoKey(fileName);
    const uploadUrl = await createPresignedUploadUrl({
      key,
      contentType,
    });

    const publicUrl = buildR2PublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không tạo được presigned URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}