"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";


export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  let dashboardUrl = "/login";
  if (isLoggedIn && session?.user) {
    const role = (session.user as any).role;
    if (role === "ADMIN") {
      dashboardUrl = "/admin";
    } else if (role === "STUDENT") {
      dashboardUrl = "/student";
    } else if (role === "PARENT") {
      dashboardUrl = "/parent";
    } else if (role === "TEACHER") {
      dashboardUrl = "/teacher";
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#CA8E25]/20 bg-[#072147]/85 backdrop-blur-xl shadow-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <Image src="/logo.png" alt="Kaputra Academy Logo" width={40} height={40} className="rounded-sm" />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold tracking-wide text-white">
              KAPUTRA
            </span>
            <span className="text-xs font-semibold tracking-[0.3em] text-[#CA8E25] uppercase">
              Academy
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-white hover:text-[#CA8E25] transition-colors"
          >
            Home
          </Link>

          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-white hover:text-[#CA8E25] transition-colors">
              Program
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="absolute left-0 top-full mt-2 w-52 rounded-xl bg-[#173761] shadow-xl border border-[#CA8E25]/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link
                href="/catalog"
                className="block px-4 py-3 text-white hover:bg-white/5 hover:text-[#CA8E25] rounded-t-xl"
              >
                Course Catalog
              </Link>

              <Link
                href="/camp-program"
                className="block px-4 py-3 text-white hover:bg-white/5 hover:text-[#CA8E25] rounded-b-xl"
              >
                Camp Program
              </Link>
            </div>
          </div>

          <Link
            href="/contact"
            className="text-sm font-medium text-white hover:text-[#CA8E25] transition-colors"
          >
            Contact
          </Link>

          <Link
            href="/about"
            className="text-sm font-medium text-white hover:text-[#CA8E25] transition-colors"
          >
            About Us
          </Link>

          <Link
            href="/faq"
            className="text-sm font-medium text-white hover:text-[#CA8E25] transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Action Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link href={dashboardUrl}>
                <Button
                  variant="ghost"
                  className="text-white hover:text-[#CA8E25] hover:bg-white/10"
                >
                  Dashboard
                </Button>
              </Link>

              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-full px-6 shadow-md hover:shadow-lg transition-all"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-white hover:text-[#CA8E25] hover:bg-white/10"
                >
                  Log In
                </Button>
              </Link>

              <Link href="/register">
                <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Action & Burger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {isLoggedIn ? (
            <Button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-full px-4 py-1.5 text-xs shadow-md transition-all"
            >
              Logout
            </Button>
          ) : (
            <Link href="/register" onClick={() => setIsOpen(false)}>
              <Button className="bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-semibold rounded-full px-4 py-1.5 text-xs shadow-md transition-all">
                Register
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="text-white hover:bg-white/10 h-9 w-9 p-0 flex items-center justify-center rounded-lg"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-[#CA8E25]/10 bg-[#173761] backdrop-blur-xl shadow-lg px-4 py-4 space-y-2 absolute top-16 left-0 w-full z-40">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block py-2.5 px-3 text-base font-medium text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
          >
            Home
          </Link>
          <div className="space-y-1">
            <p className="px-3 py-2 text-base font-medium text-[#CA8E25]">
              Program
            </p>

            <Link
              href="/catalog"
              onClick={() => setIsOpen(false)}
              className="block py-2.5 pl-6 pr-3 text-base text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
            >
              Course Catalog
            </Link>

            <Link
              href="/camp-program"
              onClick={() => setIsOpen(false)}
              className="block py-2.5 pl-6 pr-3 text-base text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
            >
              Camp Program
            </Link>
          </div>

          <Link
            href="/contact"
            onClick={() => setIsOpen(false)}
            className="block py-2.5 px-3 text-base font-medium text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
          >
            Contact
          </Link>

          <Link
            href="/about"
            onClick={() => setIsOpen(false)}
            className="block py-2.5 px-3 text-base font-medium text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
          >
            About Us
          </Link>

          <Link
            href="/faq"
            onClick={() => setIsOpen(false)}
            className="block py-2.5 px-3 text-base font-medium text-white hover:text-[#CA8E25] hover:bg-white/5 rounded-lg transition-all"
          >
            FAQ
          </Link>

          <div className="pt-2 px-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <Link href={dashboardUrl} onClick={() => setIsOpen(false)} className="w-full">
                  <Button
                    className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-2.5 rounded-xl text-base"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  variant="outline"
                  className="w-full border-rose-500 text-rose-500 hover:bg-rose-500/10 py-2.5 rounded-xl text-base"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setIsOpen(false)} className="w-full">
                <Button
                  className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-white py-2.5 rounded-xl text-base"
                >
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}