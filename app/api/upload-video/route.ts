import { NextResponse } from "next/server";
import { uploadVideoToR2 } from "@/lib/r2";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const MAX_SIZE = 100 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file video" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ mp4, webm, ogg" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Video vượt quá 100MB" },
        { status: 400 }
      );
    }

    const url = await uploadVideoToR2(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload video thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}