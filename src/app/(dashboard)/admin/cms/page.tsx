import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CmsClient from "./CmsClient";
import { getContentBlocks } from "@/actions/cms";

import { isAdminRole } from "@/lib/permissions";

export const metadata = {
  title: "CMS Settings | Admin Dashboard",
};

export default async function AdminCmsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole(session.user.role)) {
    redirect("/login");
  }

  // Fetch all CMS content blocks (this will also seed default blocks if empty)
  const res = await getContentBlocks();
  const blocks = res.success ? res.blocks || [] : [];

  return <CmsClient initialBlocks={blocks} />;
}
