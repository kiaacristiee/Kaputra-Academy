"use client";

import { useSession } from "next-auth/react";
import { canManageEnrollment } from "@/lib/permissions";

export function useCanManageEnrollment() {
  const { data: session } = useSession();
  const role = session?.user?.role || null;

  return {
    role,
    isSuperAdmin: ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes((role || "").toUpperCase()),
    canManage: (learningMethod?: string | null) => canManageEnrollment(role, learningMethod),
  };
}
