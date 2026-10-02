import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No se envió ningún archivo." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".jpg");
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    const fileType = file.type.startsWith("video/") 
      ? "video" 
      : (file.type.startsWith("image/") ? "image" : (file.name.endsWith(".mp3") ? "audio" : "document"));

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: fileType
    });
  } catch (error: any) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
