"use client";

import { useState } from "react";
import TermsModal from "@/components/TermsModal";

interface ParentDashboardClientProps {
  children: React.ReactNode;
}

export default function ParentDashboardClient({ children }: ParentDashboardClientProps) {
  // Always show Terms modal when parent visits dashboard
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!termsAccepted) {
    return (
      <div className="relative">
        {/* Blurred background content preview */}
        <div className="pointer-events-none opacity-30 select-none blur-sm">
          {children}
        </div>
        {/* Terms modal blocking access */}
        <TermsModal mode="persist" onAccept={() => setTermsAccepted(true)} />
      </div>
    );
  }

  return <>{children}</>;
}
