import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Student ID or Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Find user by either email or studentIdStr
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.username },
              { studentIdStr: credentials.username }
            ]
          }
        });

        if (!user) {
          return null;
        }

        // Enforce Student ID and Active account rules for students
        if (user.role === "STUDENT") {
          // Students must log in using Student ID, not email
          if (credentials.username.includes("@")) {
            return null;
          }
          if (!user.isActive) {
            return null;
          }
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentIdStr: user.studentIdStr,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentIdStr = user.studentIdStr;
      }
      
      if (trigger === "update" && session) {
        if (session.action === "SWITCH_TO_STUDENT" && session.studentId) {
          const parentId = token.originalParentId || token.id;
          
          // Validate ownership securely on the server
          const child = await prisma.user.findFirst({
            where: {
              id: session.studentId,
              parentId: parentId as string,
            }
          });
          
          if (child) {
            // Store original parent data if not already stored
            if (!token.originalParentId) {
              token.originalParentId = token.id;
              token.originalParentName = token.name;
            }
            
            // Switch context to student
            token.viewingAsStudentId = child.id;
            token.id = child.id;
            token.role = "STUDENT";
            token.name = child.name;
            token.studentIdStr = child.studentIdStr;
          }
        } else if (session.action === "SWITCH_TO_PARENT") {
          // Revert to parent context
          if (token.originalParentId) {
            token.id = token.originalParentId;
            token.role = "PARENT";
            token.name = token.originalParentName;
            
            // Clear overrides
            token.originalParentId = null;
            token.originalParentName = null;
            token.viewingAsStudentId = null;
            token.studentIdStr = null;
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.studentIdStr = token.studentIdStr as string | null | undefined;
        
        session.user.viewingAsStudentId = token.viewingAsStudentId as string | null | undefined;
        session.user.originalParentId = token.originalParentId as string | null | undefined;
        session.user.originalParentName = token.originalParentName as string | null | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "kaputra_secret_key_123_456_789",
};
