"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ViewAsStudentButton({ studentId }: { studentId: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    setLoading(true);
    await update({ action: "SWITCH_TO_STUDENT", studentId });
    router.push("/student");
    router.refresh(); // Ensure the layout fully re-renders with the new session
  };

  return (
    <Button 
      onClick={handleSwitch} 
      disabled={loading}
      size="sm"
      className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold rounded-xl text-xs flex items-center justify-center transition-all"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Eye className="w-4 h-4 mr-2" />
      )}
      View as Student
    </Button>
  );
}
