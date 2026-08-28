import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";

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
    
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" && ext !== ".gif" && ext !== ".webp") {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || (ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/gif");
    const base64Data = buffer.toString("base64");
    const url = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({ success: true, url });

  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
