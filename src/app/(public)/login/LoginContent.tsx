"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get("activated") === "true") {
            setSuccess("Account activated successfully! Please log in.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        const res = await signIn("credentials", {
            username,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("Invalid credentials. Please try again.");
            setLoading(false);
        } else {
            // Fetch session to check the user's role
            const sessionRes = await fetch("/api/auth/session");
            const sessionData = await sessionRes.json();
            
            setLoading(false);
            
            const role = sessionData?.user?.role;
            if (role === "ADMIN" || role === "SUPER_ADMIN") {
                router.push("/admin");
            } else if (role === "TEACHER") {
                router.push("/teacher");
            } else if (role === "PARENT") {
                router.push("/parent");
            } else if (role === "STUDENT") {
                router.push("/student");
            } else {
                router.push("/");
            }
            
            router.refresh();
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full bg-white border border-gray-100 shadow-xl rounded-2xl p-8 text-slate-900 space-y-6">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-3">
                        <span className="text-2xl font-black tracking-wide text-[#072147] block">
                            KAPUTRA
                        </span>
                        <span className="text-xs font-semibold tracking-[0.2em] text-[#CA8E25] uppercase">
                            Academy
                        </span>
                    </Link>

                    <h2 className="text-3xl font-extrabold text-[#072147] mt-2">
                        Sign In
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please fill out details to access your portal.
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-slate-700 font-medium">
                            Student ID or Email
                        </Label>

                        <Input
                            id="username"
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. MDC211006 or teacher@kaputra.academy"
                            className="bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        </div>

                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-white border-gray-200 text-slate-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-[#CA8E25]"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3.5 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
                    >
                        <Lock className="h-4 w-4" />

                        {loading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </div>
        </main>
    );
}