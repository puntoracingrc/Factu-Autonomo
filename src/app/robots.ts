import type { MetadataRoute } from "next";
import { VIDA_SITE_URL } from "@/lib/vida/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", VIDA_SITE_URL).toString(),
  };
}
