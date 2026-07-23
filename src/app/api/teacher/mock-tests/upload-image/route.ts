import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "TEACHER") {
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
    
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" && ext !== ".gif" && ext !== ".webp") {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadsDir, { recursive: true });

    const newFileName = `${uuidv4()}${ext}`;
    const savePath = path.join(uploadsDir, newFileName);
    
    await fs.writeFile(savePath, buffer);

    const url = `/uploads/questions/${newFileName}`;
    return NextResponse.json({ success: true, url });

  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
