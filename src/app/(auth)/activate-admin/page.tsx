import { Suspense } from "react";
import ActivateAdminClient from "./ActivateAdminClient";

export const metadata = {
  title: "Activate Admin Account | Kaputra Academy",
  description: "Set up your Kaputra Academy administrative account.",
};

export default function ActivateAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">Loading...</div>}>
      <ActivateAdminClient />
    </Suspense>
  );
}
