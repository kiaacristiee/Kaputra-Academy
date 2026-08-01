import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export async function GET(req: NextRequest, props: { params: Promise<any> }) {
  const p = await props.params;
  return handler(req, { params: p } as any);
}

export async function POST(req: NextRequest, props: { params: Promise<any> }) {
  const p = await props.params;
  return handler(req, { params: p } as any);
}
