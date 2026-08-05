import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kaputraacademy.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/teacher/", "/student/", "/parent/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
