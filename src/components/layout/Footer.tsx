import Link from "next/link";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import prisma from "@/lib/db";

export async function Footer() {
  let block = null;
  try {
    block = await prisma.contentBlock.findUnique({
      where: { section: "contact_info" },
    });
  } catch (error) {
    console.error("Database connection failed in Footer:", error);
  }

  let contact = null;
  if (block) {
    try {
      contact = JSON.parse(block.content);
    } catch (e) {
      console.error("Failed to parse contact block in Footer:", e);
    }
  }

  const fbUrl = contact?.facebook
    ? (contact.facebook.startsWith("http") ? contact.facebook : `https://facebook.com/${contact.facebook}`)
    : "https://facebook.com/kaputraacademy";

  const instaUrl = contact?.instagram
    ? (contact.instagram.startsWith("http") ? contact.instagram : `https://instagram.com/${contact.instagram.replace("@", "")}`)
    : "https://instagram.com/kaputra.academy";

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">
            Kaputra Academy
          </h3>
          <p className="text-sm text-slate-400">
            Empowering your career with industry-leading courses and expert
            instructors.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition">
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/catalog" className="hover:text-white transition">
                Courses
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white transition">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* Connect With Us */}
        <div>
          <h4 className="text-white font-semibold mb-4">Connect With Us</h4>

          <div className="flex items-center gap-4">
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-slate-400 hover:text-[#CA8E25] transition-colors duration-300"
            >
              <FaFacebookF size={22} />
            </a>

            <a
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-slate-400 hover:text-[#CA8E25] transition-colors duration-300"
            >
              <FaInstagram size={22} />
            </a>

            <a
              href="https://linkedin.com/company/kaputra-academy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-slate-400 hover:text-[#CA8E25] transition-colors duration-300"
            >
              <FaLinkedinIn size={22} />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="container mx-auto px-4 mt-8 pt-8 border-t border-slate-800 text-sm text-center text-slate-500">
        &copy; {new Date().getFullYear()} Kaputra Academy. All rights reserved.
      </div>
    </footer>
  );
}