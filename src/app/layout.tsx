import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/layout/AuthProvider";
import FloatingChatbot from "@/components/FloatingChatbot";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kaputraacademy.com";

export const viewport: Viewport = {
  themeColor: "#0A2A5E",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kaputra Academy",
    template: "%s | Kaputra Academy",
  },
  description:
    "Kaputra Academy is a learning center specializing in the Singapore Curriculum, Olympiad preparation, private tutoring, and academic excellence through interactive digital learning.",
  keywords: [
    "Kaputra Academy",
    "Singapore Curriculum",
    "Olympiad preparation",
    "private tutoring",
    "academic excellence",
    "interactive digital learning",
    "singapore math",
    "tuition center",
    "online learning",
    "academic tutoring",
  ],
  authors: [
    { name: "Kaputra Academy" },
    { name: "Andi Julio Kaputra", url: siteUrl },
  ],
  creator: "Kaputra Academy",
  publisher: "Kaputra Academy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Kaputra Academy",
    description:
      "Kaputra Academy is a learning center specializing in the Singapore Curriculum, Olympiad preparation, private tutoring, and academic excellence through interactive digital learning.",
    url: siteUrl,
    siteName: "Kaputra Academy",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Kaputra Academy Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaputra Academy",
    description:
      "Kaputra Academy is a learning center specializing in the Singapore Curriculum, Olympiad preparation, private tutoring, and academic excellence through interactive digital learning.",
    images: ["/icon.png"],
    creator: "@kaputraacademy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Kaputra Academy",
    "url": siteUrl,
    "logo": `${siteUrl}/icon.png`,
    "image": `${siteUrl}/icon.png`,
    "description":
      "Kaputra Academy is a learning center specializing in the Singapore Curriculum, Olympiad preparation, private tutoring, and academic excellence through interactive digital learning.",
    "founder": {
      "@type": "Person",
      "name": "Andi Julio Kaputra",
    },
    "sameAs": [
      "https://facebook.com/kaputraacademy",
      "https://instagram.com/kaputra.academy",
      "https://linkedin.com/company/kaputra-academy",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": `${siteUrl}/contact`,
    },
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <FloatingChatbot />
        </AuthProvider>
      </body>
    </html>
  );
}