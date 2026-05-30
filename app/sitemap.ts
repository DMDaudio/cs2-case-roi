import type { MetadataRoute } from "next";
import { loadCases } from "@/lib/metadata/loadCases";

const BASE = "https://cs2-case-roi.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/invest`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const caseRoutes: MetadataRoute.Sitemap = loadCases().map((c) => ({
    url: `${BASE}/case/${encodeURIComponent(c.id)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...caseRoutes];
}
