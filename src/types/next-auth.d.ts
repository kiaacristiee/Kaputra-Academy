import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    studentIdStr?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      studentIdStr?: string | null;
      viewingAsStudentId?: string | null;
      originalParentId?: string | null;
      originalParentName?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    studentIdStr?: string | null;
    viewingAsStudentId?: string | null;
    originalParentId?: string | null;
    originalParentName?: string | null;
  }
}
