import type { MetadataRoute } from "next";

// The portal is private. Pages also send noindex (app/layout.tsx and the
// X-Robots-Tag header), which is what keeps them out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
