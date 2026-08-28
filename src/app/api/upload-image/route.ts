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
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = path.extname(file.name).toLowerCase() || ".png";
    const mimeType = file.type || (ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/gif");
    const base64Data = buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
