import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { getActiveServices } from "@/lib/marketing/catalog";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/become-a-guy", changeFrequency: "monthly", priority: 0.8 },
  { path: "/trust-safety", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { services } = await getActiveServices();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${SITE_URL}/services/${service.slug}`,
    lastModified: service.updated_at ? new Date(service.updated_at) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...serviceEntries];
}
