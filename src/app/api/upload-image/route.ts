import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = path.extname(file.name).toLowerCase() || ".png";
    const newFileName = `${uuidv4()}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadsDir, { recursive: true });

    const savePath = path.join(uploadsDir, newFileName);
    await fs.writeFile(savePath, buffer);

    const imageUrl = `/uploads/questions/${newFileName}`;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
