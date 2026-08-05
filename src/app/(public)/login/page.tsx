import { Suspense } from "react";
import LoginContent from "./LoginContent";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Login() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = session.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "OWNER" || role === "CO_OWNER") redirect("/admin");
    if (role === "TEACHER") redirect("/teacher");
    if (role === "PARENT") redirect("/parent");
    if (role === "STUDENT") redirect("/student");
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}