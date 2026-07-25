import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAvailableCourses } from "@/actions/enrollClass";
import { getAvailableCamps } from "@/actions/camps";
import EnrollClient from "./EnrollClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Register Class & Camp | Kaputra Academy",
};

export default async function StudentEnrollPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const courseRes = await getAvailableCourses(session.user.id);
  const courses = courseRes.success && courseRes.courses ? courseRes.courses : [];

  const campRes = await getAvailableCamps(session.user.id);
  const camps = campRes.success && campRes.camps ? campRes.camps : [];

  return (
    <EnrollClient
      initialCourses={JSON.parse(JSON.stringify(courses))}
      initialCamps={JSON.parse(JSON.stringify(camps))}
      studentId={session.user.id}
    />
  );
}
