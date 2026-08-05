import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import CoursesClient from "./CoursesClient";
import { getCourses, getCategories } from "@/actions/courses";
import { getTeachers } from "@/actions/teachers";

import { isAdminRole } from "@/lib/permissions";

export const metadata = {
  title: "Course Management | Admin Dashboard",
};

export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  // Fetch all categories (creating defaults if none exist)
  const catRes = await getCategories();
  const categories = catRes.success ? catRes.categories || [] : [];

  // Fetch all teachers
  const teachRes = await getTeachers();
  const teachers = teachRes.success ? teachRes.teachers || [] : [];

  // Fetch all courses
  const courseRes = await getCourses();
  const courses = courseRes.success ? courseRes.courses || [] : [];

  return (
    <CoursesClient
      initialCourses={courses}
      categories={categories}
      teachers={teachers}
    />
  );
}
