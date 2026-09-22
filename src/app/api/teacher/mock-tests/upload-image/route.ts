import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();
    
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Generate unique file name
    const timeStamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `quiz-img-${timeStamp}-${randomStr}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public/uploads/questions — same directory as ZIP-imported images
    // so all question/explanation images share one consistent location.
    // NOTE: Existing DB records storing /uploads/quiz-img-* (old path) are still
    // served correctly because resolveImageUrl() accepts any /uploads/* path,
    // and Next.js serves ALL of public/ including /uploads/*.
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    // Return the canonical /uploads/questions/ URL
    const url = `/uploads/questions/${uniqueFileName}`;

    return NextResponse.json({ success: true, url });

  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
