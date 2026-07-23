import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as xlsx from "xlsx";
import AdmZip from "adm-zip";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Define headers for the Excel template
  const headers = [
    "Teks Soal", 
    "Opsi A", 
    "Opsi B", 
    "Opsi C", 
    "Opsi D", 
    "Kunci Jawaban", 
    "Topik", 
    "Tingkat Kesulitan",
    "Nama File Gambar"
  ];
  
  // Example data row
  const exampleRow = [
    "Apa nama hewan pada gambar ini?",
    "Kucing",
    "Anjing",
    "Burung",
    "Ikan",
    "A",
    "Biologi",
    "Mudah",
    "hewan1.png"
  ];

  // Create workbook and worksheet
  const worksheet = xlsx.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Template Soal");

  // Generate buffer
  const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  // Create zip
  const zip = new AdmZip();
  zip.addFile("Template_Upload_Soal.xlsx", excelBuffer);
  zip.addFile("images/", Buffer.alloc(0)); // empty folder

  const zipBuffer = zip.toBuffer();

  // Return the file as response
  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Disposition": 'attachment; filename="Template_Upload_Soal.zip"',
      "Content-Type": "application/zip",
    },
  });
}
