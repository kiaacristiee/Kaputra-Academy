"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleStudentDisabled } from "@/actions/adminExtra";

export default function StudentActionClient({ studentId, initialIsDisabled }: { studentId: string; initialIsDisabled: boolean }) {
    const [isDisabled, setIsDisabled] = useState(initialIsDisabled);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        setLoading(true);
        const nextState = !isDisabled;
        const res = await toggleStudentDisabled(studentId, nextState);
        if (res.success) {
            setIsDisabled(nextState);
        } else {
            alert(res.error || "Failed to update student status.");
        }
        setLoading(false);
    };

    return (
        <div className="mt-6 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2">Student Access</h3>
            <p className="text-slate-400 text-sm mb-4">
                {isDisabled
                    ? "This student is currently disabled and cannot access their class content."
                    : "This student is active and can access their class content normally."}
            </p>
            <Button
                onClick={handleToggle}
                disabled={loading}
                variant={isDisabled ? "default" : "destructive"}
                className={isDisabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
                {loading ? "Processing..." : isDisabled ? "Enable Student" : "Disable Student"}
            </Button>
        </div>
    );
}
