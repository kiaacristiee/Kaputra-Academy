"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPublishedCamps } from "@/actions/camps";
import { Sparkles, Calendar, Receipt, Search, Clock, Users } from "lucide-react";

export default function CampProgramPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [camps, setCamps] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCamps() {
            try {
                const res = await getPublishedCamps();
                if (res.success && res.camps) {
                    setCamps(res.camps);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchCamps();
    }, []);

    const handleRegister = (campId: string) => {
        if (!session?.user) {
            router.push(`/login?callbackUrl=/student/enroll`);
        } else {
            const role = (session.user as any).role;
            if (role === "PARENT") {
                router.push("/parent/enroll");
            } else if (role === "ADMIN") {
                router.push("/admin/camps");
            } else {
                router.push("/student/enroll");
            }
        }
    };

    const formatDate = (dateInput: string | Date) => {
        return new Date(dateInput).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const filteredCamps = camps.filter((c) => {
        const query = search.toLowerCase();
        return (
            c.name.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query)
        );
    });

    return (
        <div className="w-full bg-slate-50 min-h-screen pb-20">
            {/* HERO */}
            <section className="bg-[#072147] py-20 text-center">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Camp Programs
                    </h1>

                    <p className="text-white/80 max-w-2xl mx-auto">
                        Explore our exciting camp programs designed to help students learn,
                        grow, and prepare for international math olympiads.
                    </p>
                </div>
            </section>

            {/* FILTER */}
            <div className="container mx-auto px-4 mt-12">
                <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                    {/* SEARCH */}
                    <div className="flex gap-2 w-full md:w-96">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search camp programs..."
                                className="pl-9 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CA8E25] w-full bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* LOADING STATE */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse bg-white rounded-2xl h-80 border border-slate-100 p-5 space-y-4">
                                <div className="h-40 bg-slate-100 rounded-xl" />
                                <div className="h-4 bg-slate-100 rounded w-2/3" />
                                <div className="h-3 bg-slate-100 rounded w-full" />
                            </div>
                        ))}
                    </div>
                ) : filteredCamps.length > 0 ? (
                    /* GRID */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCamps.map((camp) => (
                            <motion.div
                                key={camp.id}
                                whileHover={{ y: -5 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all flex flex-col"
                            >
                                {/* THUMBNAIL */}
                                {camp.thumbnailUrl ? (
                                    <div className="h-44 relative bg-slate-100">
                                        <img
                                            src={camp.thumbnailUrl}
                                            alt={camp.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-44 bg-gradient-to-tr from-[#072147] to-[#1e4881] flex flex-col items-center justify-center p-4 text-center">
                                        <Sparkles className="h-10 w-10 text-[#CA8E25] mb-2" />
                                        <span className="text-white/80 font-bold text-sm tracking-wide uppercase">
                                            KAPUTRA CAMP
                                        </span>
                                    </div>
                                )}

                                {/* CONTENT */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="font-bold text-slate-900 text-lg mb-3 line-clamp-2">
                                        {camp.name}
                                    </h3>

                                    <p className="text-slate-600 text-sm mb-5 line-clamp-4 flex-1">
                                        {camp.description}
                                    </p>

                                    {/* CAMP INFO META */}
                                    <div className="space-y-2.5 mb-6 text-xs text-slate-500 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-[#CA8E25] shrink-0" />
                                            <span>
                                                {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5 text-[#CA8E25] shrink-0" />
                                            <span>
                                                Open until: <strong className="text-red-500 font-medium">{formatDate(camp.registrationDeadline)}</strong>
                                            </span>
                                        </div>
                                        {camp.capacity && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-3.5 w-3.5 text-[#CA8E25] shrink-0" />
                                                <span>Capacity: {camp.capacity} Seats</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="font-bold text-lg text-slate-900">
                                            Rp {camp.price.toLocaleString("id-ID")}
                                        </span>

                                        <Button
                                            size="sm"
                                            className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-lg px-4"
                                            onClick={() => handleRegister(camp.id)}
                                        >
                                            Register
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                        <p className="text-slate-500">No active camp programs available at the moment.</p>
                    </div>
                )}
                {/* LOGIN NOTICE */}
                {!session?.user && (
                    <div className="mt-12 bg-[#072147] rounded-2xl p-6 text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Ready to Join a Camp Program?
                        </h3>

                        <p className="text-white/80 mb-4">
                            Students must create an account and log in before registering for
                            any camp program.
                        </p>

                        <Link href="/register">
                            <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold">
                                Create Account
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}